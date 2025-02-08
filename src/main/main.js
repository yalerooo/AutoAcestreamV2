const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs').promises; // Use promises version for async/await
const axios = require('axios');

const ACE_BASE_URL = "http://127.0.0.1:6878/ace/getstream?id=";

let mainWindow;
let settingsWindow;
let addSourceWindow;
let store;
let imageMappings;
let channelsFilePath;
let imageMappingsPath;

async function initializeStore() {
    const { default: Store } = await import('electron-store');
    store = new Store();
}

// Use app.getPath('userData') for persistent data
async function initializeDataPaths() {
    const userDataPath = app.getPath('userData');
    channelsFilePath = path.join(userDataPath, 'channels.json');
    imageMappingsPath = path.join(userDataPath, 'image_mappings.json');
    await copyFilesToUserData(); // Copy files on first run
}

// Copy files to userData if they don't exist
async function copyFilesToUserData() {
    const resourcesPath = app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'src') // Packaged
        : path.join(__dirname, '..'); // Development

    //Copy channels.json.
    if (!await fileExists(channelsFilePath)) {
        await fs.copyFile(path.join(resourcesPath, 'channels.json'), channelsFilePath);
    }

    //Copy image_mappings.json.
    if (!await fileExists(imageMappingsPath)) {
        await fs.copyFile(path.join(resourcesPath, 'image_mappings.json'), imageMappingsPath);
    }
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function loadImageMappings() {
    try {
        const data = await fs.readFile(imageMappingsPath, 'utf8');
        imageMappings = JSON.parse(data);
    } catch (error) {
        console.error("Error reading image_mappings.json:", error);
        imageMappings = [];
    }
}

async function getDefaultChannelUrls() {
    try {
        if (!await fileExists(channelsFilePath)) {
             return []; // Return empty if the files does not exists.
        }
        const data = await fs.readFile(channelsFilePath, 'utf8');
        const sources = JSON.parse(data);
		 // Check if sources is actually an array
        return Array.isArray(sources) ? sources : [];
    } catch (error) {
        console.error("Error reading channels.json:", error);
        return [];
    }
}


async function writeChannelUrls(sources) {
    try {
        await fs.writeFile(channelsFilePath, JSON.stringify(sources, null, 2), 'utf8');
        console.log("Successfully wrote to channels.json");
    } catch (error) {
        console.error("Error writing to channels.json:", error);
    }
}

// *** IMPORTANT: Get settings with a default URL ***
async function getSettings() {
    const sources = await getDefaultChannelUrls(); // Await this!
    const defaultUrl = sources.length > 0 ? sources[0].url : '';
    return {
        vlcPath: store.get('vlcPath', ''),
        selectedListUrl: store.get('selectedListUrl', defaultUrl) // Use defaultUrl
    };
}

function createWindow() {
    const bounds = store.get('windowBounds', {});
    const display = screen.getPrimaryDisplay();
    const defaultWidth = Math.round(display.bounds.width * 0.5);
    const defaultHeight = Math.round(display.bounds.height * 0.5);

    mainWindow = new BrowserWindow({
        width: bounds.width || defaultWidth,
        height: bounds.height || defaultHeight,
        x: bounds.x,
        y: bounds.y,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../assets/icon.ico'),
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, '../html/index.html'));

    mainWindow.on('close', () => {
        if (!mainWindow.isMaximized()) {
            store.set('windowBounds', mainWindow.getBounds());
        }
    });

    mainWindow.on('maximize', () => {
        store.set('isMaximized', true);
    });

    mainWindow.on('unmaximize', () => {
        store.set('isMaximized', false);
    });

    if (store.get('isMaximized')) {
        mainWindow.maximize();
    }
    mainWindow.show();
}


async function loadChannels(url) {
    if (!url) { return { error: "No URL provided." }; }
    try {
        const response = await axios.get(url);
        return parseChannels(response.data);
    } catch (error) {
        console.error("Error loading channels:", error);
        return { error: error.message };
    }
}

function parseChannels(m3uContent) {
    const channels = [];
    const lines = m3uContent.split(/[\r\n]+/);
    let name, aceId;

    for (const line of lines) {
        if (line.startsWith('#EXTINF')) {
            name = line.match(/,(.*?)$/)?.[1]?.trim();
        } else if (line.startsWith('acestream://')) {
            aceId = line.replace('acestream://', '').trim();
        } else if (line.match(/^http/)) {
            const match = line.match(/(?:acestream:\/\/|id=)([a-fA-F0-9]+)/);
            if (match) {
                aceId = match[1];
            }
        }
          // Added checks for defined values before pushing
        if (name && aceId) {
            const imageUrl = getImageUrl(name);
            channels.push({ name, aceId, imageUrl });
            name = aceId = null;
        }
    }
    return channels;
}

function getImageUrl(channelName) {
    if (!imageMappings) {
        return '../../default_channel_image.png';
    }

    for (const mapping of imageMappings) {
        for (const keyword of mapping.keywords) {
             if (keyword === 'default') {
                continue;
            }
            if (channelName.toLowerCase().includes(keyword.toLowerCase())) {
                return mapping.imageUrl;
            }
        }
    }

    const defaultMapping = imageMappings.find(mapping => mapping.keywords.includes('default'));
    return defaultMapping ? defaultMapping.imageUrl :  '../../default_channel_image.png';
}

function playInVLC(vlcPath, aceId) {
    if (!vlcPath) { return { error: "VLC path is not configured." }; }
    const streamUrl = `${ACE_BASE_URL}${aceId}`;
    try {
        require('child_process').spawn(vlcPath, [streamUrl]);
        return { success: true };
    } catch (error) {
        console.error("Error playing in VLC:", error);
        return { error: error.message };
    }
}

function registerIPCHandlers() {
	ipcMain.handle('get-settings', async () => await getSettings()); // Await getSettings

	ipcMain.handle('save-settings', async (event, settings) => {
		store.set('vlcPath', settings.vlcPath);
		store.set('selectedListUrl', settings.selectedListUrl);
        // After saving, update channels in the main window.
        mainWindow.webContents.send('update-channels', await loadChannels(settings.selectedListUrl));
		return { success: true };
	});

	ipcMain.handle('load-channels', async () => {
		const settings = await getSettings(); // Await getSettings
		const channels = await loadChannels(settings.selectedListUrl);
		return channels; // Return the channels
	});

	ipcMain.handle('get-channel-sources', getDefaultChannelUrls);
	ipcMain.handle('show-open-dialog', () => dialog.showOpenDialog(mainWindow, {
		title: 'Select VLC executable', filters: [{ name: 'Executables', extensions: ['exe'] }], properties: ['openFile']
	}));
	ipcMain.handle('play-in-vlc', async (event, aceId) => {
		const settings = await getSettings(); // Await getSettings
		return playInVLC(settings.vlcPath, aceId);
	});
	ipcMain.on('close-settings-dialog', () => { settingsWindow?.close(); settingsWindow = null; });
	ipcMain.handle('show-settings-dialog', () => {
		settingsWindow = new BrowserWindow({
			parent: mainWindow, modal: true, show: false, width: 600, height: 500, frame: false, resizable: false,
			webPreferences: { preload: path.join(__dirname, '../preload/preload.js'), nodeIntegration: false, contextIsolation: true, }
		});
		settingsWindow.loadFile(path.join(__dirname, '../html/settings.html'));
		settingsWindow.once('ready-to-show', () => settingsWindow.show());
	});

	 ipcMain.handle('show-add-source-dialog', async () => {
        return new Promise((resolve) => {
            addSourceWindow = new BrowserWindow({
                parent: mainWindow,
                modal: true,
                show: false,
                width: 600,
                frame: false,
                resizable: true,
                webPreferences: {
                    preload: path.join(__dirname, '../preload/preload.js'),
                    nodeIntegration: false,
                    contextIsolation: true,
                }
            });
            addSourceWindow.loadFile(path.join(__dirname, '../html/addSourceDialog.html'));

            ipcMain.once('add-source-data', (event, data) => {
                if (addSourceWindow) {
                    addSourceWindow.close();
                    addSourceWindow = null;
                }
                getDefaultChannelUrls().then(sources => { // Use async/await here
					sources.push({ name: data.name, url: data.url }); // No need for isFirstSource
					writeChannelUrls(sources).then(() => { // Use async/await
						resolve(true);
					}).catch(err => {
						console.error("Error adding source (writing):", err);
						resolve(false); // Resolve false on write error
					});
				}).catch(err => {
					console.error("Error adding source (reading):", err);
					resolve(false); // Resolve false on read error
				});
            });

            ipcMain.once('cancel-add-source', () => {
                if (addSourceWindow) {
                    addSourceWindow.close();
                    addSourceWindow = null;
                }
                resolve(false);
            });

            addSourceWindow.once('ready-to-show', () => {
                addSourceWindow.show();
            });
        });
    });
    ipcMain.handle('show-info-message', async () => {
        const result = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Information',
            message: 'This application requires VLC Media Player and Ace Stream Media to be installed.\n\n' +
                     'Click "VLC" to download VLC.\n' +
                     'Click "Ace Stream" to download Ace Stream.',
            buttons: ['VLC', 'Ace Stream', 'OK'],
            defaultId: 2,
            cancelId: 2
        });
        if (result.response === 0) {
            shell.openExternal('https://www.videolan.org/vlc/index.es.html');
        } else if (result.response === 1) {
            shell.openExternal('https://download.acestream.media/products/acestream-full/win/latest');
        }
    });

	ipcMain.handle('delete-channel-source', async (event, urlToDelete) => {
        try {
            const sources = await getDefaultChannelUrls(); // Await the promise
            const updatedSources = sources.filter(source => source.url !== urlToDelete);
            await writeChannelUrls(updatedSources); // Await the write

            // Update selectedListUrl if the deleted one was selected
            const currentSettings = await getSettings(); // Now await get settings
            if (currentSettings.selectedListUrl === urlToDelete) {
                const newSelectedUrl = updatedSources.length > 0 ? updatedSources[0].url : '';
                store.set('selectedListUrl', newSelectedUrl);
            }
             // Reload channels after deleting
            mainWindow.webContents.send('update-channels', await loadChannels(getSettings().selectedListUrl));
            return true; // Indicate success
        } catch (error) {
            console.error("Error deleting channel source:", error);
            return false; // Indicate failure
        }
    });
}

app.whenReady().then(async () => {
    await initializeStore();
	await initializeDataPaths(); // Initialize data paths (and copy files)
    await loadImageMappings();
    registerIPCHandlers();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });