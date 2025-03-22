const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const { protocol } = require('electron');

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

async function initializeDataPaths() {
    const userDataPath = app.getPath('userData');
    channelsFilePath = path.join(userDataPath, 'channels.json');
    imageMappingsPath = path.join(userDataPath, 'image_mappings.json');
    await copyFilesToUserData();
}

async function copyFilesToUserData() {
    const resourcesPath = app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'src')
        : path.join(__dirname, '..');

    if (!await fileExists(channelsFilePath)) {
        await fs.copyFile(path.join(resourcesPath, 'channels.json'), channelsFilePath);
    }

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
            return [];
        }
        const data = await fs.readFile(channelsFilePath, 'utf8');
        const sources = JSON.parse(data);
        return Array.isArray(sources) ? sources : [];
    } catch (error) {
        console.error("Error reading channels.json:", error);
        return [];
    }
}

async function writeChannelUrls(sources) {
    try {
        await fs.writeFile(channelsFilePath, JSON.stringify(sources, null, 2), 'utf8');
    } catch (error) {
        console.error("Error writing to channels.json:", error);
    }
}

async function getSettings() {
  const sources = await getDefaultChannelUrls();
    const defaultUrl = sources.length > 0 ? sources[0].url : '';
    return {
        vlcPath: store.get('vlcPath', ''),
        selectedListUrl: store.get('selectedListUrl', defaultUrl)
    };
}
// Helper to safely close and nullify windows.
function safeClose(window) {
    if (window) {
        window.close();
        window = null;
    }
    return window;
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
        // CRITICAL: Close child windows when the main window closes
        settingsWindow = safeClose(settingsWindow);
        addSourceWindow = safeClose(addSourceWindow);
    });

    // --- MODIFIED: will-move AND focus management ---
    mainWindow.on('will-move', () => {
        if (addSourceWindow) {
            addSourceWindow.moveTop();
        }
        if (settingsWindow) {
            settingsWindow.moveTop();
        }
    });
    // --- END MODIFIED SECTION ---

    if (store.get('isMaximized')) {
        mainWindow.maximize();
    }
    mainWindow.show();
}

async function loadChannels(source) {
    if (!source) { return { error: "No source provided." }; }
    try {
        let m3uContent;
        if (source.startsWith("file://")) {
            const filePath = source.slice(7);
            m3uContent = await fs.readFile(filePath, 'utf8');
        } else {
            const response = await axios.get(source);
            m3uContent = response.data;
        }
        return parseChannels(m3uContent);
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
            if (keyword === 'default') continue;
            if (channelName.toLowerCase().includes(keyword.toLowerCase())) {
                return mapping.imageUrl;
            }
        }
    }
    const defaultMapping = imageMappings.find(mapping => mapping.keywords.includes('default'));
    return defaultMapping ? defaultMapping.imageUrl : '../../default_channel_image.png';
}

function playInVLC(vlcPath, aceId) {
    if (!vlcPath) return { error: "VLC path not configured." };
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
    ipcMain.handle('get-settings', async () => await getSettings());

    ipcMain.handle('save-settings', async (event, settings) => {
        store.set('vlcPath', settings.vlcPath);
        store.set('selectedListUrl', settings.selectedListUrl);
        mainWindow.webContents.send('update-channels', await loadChannels(settings.selectedListUrl));
        return { success: true };
    });

   ipcMain.handle('load-channels', async () => {
        const settings = await getSettings();
        const sources = await getDefaultChannelUrls();
        let selectedListUrl = settings.selectedListUrl;
        if (!selectedListUrl && sources.length > 0) {
            selectedListUrl = sources[0].url;
        }
        if (!selectedListUrl) {
            return [];
        }
        return await loadChannels(selectedListUrl);
    });

    ipcMain.handle('get-channel-sources', async () => await getDefaultChannelUrls());

    ipcMain.handle('show-open-dialog', () => dialog.showOpenDialog(mainWindow, {
        title: 'Select VLC executable', filters: [{ name: 'Executables', extensions: ['exe'] }], properties: ['openFile']
    }));
    ipcMain.handle('play-in-vlc', async (event, aceId) => {
        const settings = await getSettings();
        return playInVLC(settings.vlcPath, aceId);
    });
    ipcMain.on('close-settings-dialog', () => { settingsWindow = safeClose(settingsWindow); });

	ipcMain.handle('show-settings-dialog', () => {
		settingsWindow = new BrowserWindow({
			parent: mainWindow, modal: true, show: false, width: 600, height: 500, frame: false, resizable: false,
			webPreferences: { preload: path.join(__dirname, '../preload/preload.js'), nodeIntegration: false, contextIsolation: true, }
		});
		settingsWindow.loadFile(path.join(__dirname, '../html/settings.html'));
        // --- MODIFIED: show event and focus ---
        settingsWindow.on('show', () => {
            if (addSourceWindow) {  // Ensure addSource is behind settings
                addSourceWindow.moveTop();
            }
             settingsWindow.moveTop(); // Bring settingsWindow to the VERY top
            settingsWindow.focus(); // Explicitly give it focus
        });
        // --- END MODIFIED SECTION ---

		settingsWindow.once('ready-to-show', () => settingsWindow.show());
        settingsWindow.on('closed', () => {
            settingsWindow = null;
        });
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

            ipcMain.once('add-source-data', async (event, data) => {
                addSourceWindow = safeClose(addSourceWindow);
                try {
                    const sources = await getDefaultChannelUrls();
                    sources.push({ name: data.name, url: data.url, isFile: data.isFile || false });
                    await writeChannelUrls(sources);
                    resolve(true);
                } catch (error) {
                    console.error("Error adding source:", error);
                    resolve(false);
                }
            });

            ipcMain.once('cancel-add-source', () => {
                addSourceWindow = safeClose(addSourceWindow);
                resolve(false);
            });

            ipcMain.handle('show-file-dialog', async () => {
                return await dialog.showOpenDialog(addSourceWindow, {
                    properties: ['openFile'],
                    filters: [{ name: 'Playlist Files', extensions: ['m3u', 'txt'] }]
                });
            });

            // --- MODIFIED: show event and focus ---
            addSourceWindow.on('show', () => {
                addSourceWindow.moveTop(); // Bring to top
                addSourceWindow.focus();     // Give it focus
            });
            // --- END MODIFIED SECTION ---
            addSourceWindow.on('closed', () => {
                 addSourceWindow = null;
            });
            addSourceWindow.once('ready-to-show', () => addSourceWindow.show());
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
            const sources = await getDefaultChannelUrls();
            const updatedSources = sources.filter(source => source.url !== urlToDelete);
            await writeChannelUrls(updatedSources);

            let currentSettings = await getSettings();
            if (currentSettings.selectedListUrl === urlToDelete) {
                const newSelectedUrl = updatedSources.length > 0 ? updatedSources[0].url : '';
                store.set('selectedListUrl', newSelectedUrl);
                mainWindow.webContents.send('update-channels', await loadChannels(newSelectedUrl));
            } else {
                mainWindow.webContents.send('update-channels', await loadChannels(currentSettings.selectedListUrl));
            }
            return true;
        } catch (error) {
            console.error("Error deleting source:", error);
            return false;
        }
    });
}

app.whenReady().then(async () => {
    await initializeStore();
    await initializeDataPaths();
    await loadImageMappings();
    registerIPCHandlers();
    createWindow();

    protocol.registerFileProtocol('file', (request, callback) => {
        const pathname = decodeURIComponent(request.url.replace('file:///', ''));
        callback(pathname);
    });

    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });