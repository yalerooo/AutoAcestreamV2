// main.js (Modified to include show-info-message handler)
const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const ACE_BASE_URL = "http://127.0.0.1:6878/ace/getstream?id=";
const CHANNELS_JSON_PATH = path.join(__dirname, '../channels.json');
const IMAGE_MAPPINGS_PATH = path.join(__dirname, '../image_mappings.json');

let mainWindow;
let settingsWindow;
let addSourceWindow;
let store;
let imageMappings;

async function initializeStore() {
    const { default: Store } = await import('electron-store');
    store = new Store();
}

function loadImageMappings() {
    try {
        const data = fs.readFileSync(IMAGE_MAPPINGS_PATH, 'utf8');
        imageMappings = JSON.parse(data);
    } catch (error) {
        console.error("Error reading image_mappings.json:", error);
        imageMappings = [];
    }
}

function getDefaultChannelUrls() {
    try {
        if (!fs.existsSync(CHANNELS_JSON_PATH)) {
            fs.writeFileSync(CHANNELS_JSON_PATH, '[]', 'utf8');
            return [];
        }

        const data = fs.readFileSync(CHANNELS_JSON_PATH, 'utf8');
        const sources = JSON.parse(data);
        return sources.length > 0 ? sources : [];

    } catch (error) {
        console.error("Error reading/writing channels.json:", error);
        return [];
    }
}

function writeChannelUrls(sources) {
    try {
        fs.writeFileSync(CHANNELS_JSON_PATH, JSON.stringify(sources, null, 2), 'utf8');
        console.log("Successfully wrote to channels.json");
    } catch (error) {
        console.error("Error writing to channels.json:", error);
    }
}


function getSettings() {
  const defaultUrl = getDefaultChannelUrls()[0]?.url || '';
    return {
        vlcPath: store.get('vlcPath', ''),
        selectedListUrl: store.get('selectedListUrl', defaultUrl)
    };
}


function createWindow() {
    // Get saved window bounds (or defaults)
    const bounds = store.get('windowBounds', {});
    const display = screen.getPrimaryDisplay(); // Get primary display
    const defaultWidth = Math.round(display.bounds.width * 0.5);  // 50% of screen width
    const defaultHeight = Math.round(display.bounds.height * 0.5); // 50% of screen height

     mainWindow = new BrowserWindow({
        width: bounds.width || defaultWidth,
        height: bounds.height || defaultHeight,
        x: bounds.x,  //  can be undefined, which is fine
        y: bounds.y,  //  can be undefined, which is fine
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../assets/icon.ico'),
        show: false //  prevent flicker
    });


    mainWindow.loadFile(path.join(__dirname, '../html/index.html'));

     // Save window size and position on close, move, and resize.
     mainWindow.on('close', () => {
        if (!mainWindow.isMaximized()) { // Only save if not maximized
             store.set('windowBounds', mainWindow.getBounds());
        }

    });

    // Handle maximization.  Save 'isMaximized' state.
    mainWindow.on('maximize', () => {
        store.set('isMaximized', true);
    });

    mainWindow.on('unmaximize', () => {
        store.set('isMaximized', false);
    });

     // Restore maximized state, if applicable.  Do this *before* showing.
    if (store.get('isMaximized')) {
        mainWindow.maximize();
    }

    mainWindow.show(); // now show

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
            aceId = line.match(/id=([a-fA-F0-9]+)/)?.[1];
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
    ipcMain.handle('get-settings', () => getSettings());

    ipcMain.handle('save-settings', async (event, settings) => {
        store.set('vlcPath', settings.vlcPath);
        store.set('selectedListUrl', settings.selectedListUrl);
        return { success: true };
    });

    ipcMain.handle('load-channels', async () => {
        const settings = getSettings();
        const channels = await loadChannels(settings.selectedListUrl);
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('update-channels', channels);
        }
        return channels;
    });

    ipcMain.handle('get-channel-sources', () => getDefaultChannelUrls());
    ipcMain.handle('show-open-dialog', () => dialog.showOpenDialog(mainWindow, {
        title: 'Select VLC executable', filters: [{ name: 'Executables', extensions: ['exe'] }], properties: ['openFile']
    }));
    ipcMain.handle('play-in-vlc', async (event, aceId) => {
        const settings = getSettings();
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
                const sources = getDefaultChannelUrls();
                sources.push({ name: data.name, url: data.url, isFirstSource: false });
                writeChannelUrls(sources);
                resolve(true);
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
    ipcMain.handle('delete-channel-source', async (event, urlToDelete) => {
        try {
            const sources = getDefaultChannelUrls();
            const updatedSources = sources.filter(source => source.url !== urlToDelete);
            writeChannelUrls(updatedSources);

            // Update selectedListUrl if the deleted one was selected
            const currentSettings = getSettings();
            if (currentSettings.selectedListUrl === urlToDelete) {
                const newSelectedUrl = updatedSources.length > 0 ? updatedSources[0].url : '';
                store.set('selectedListUrl', newSelectedUrl);
            }

             // Reload channels in main window after source deletion.
            mainWindow.webContents.send('update-channels', await loadChannels(getSettings().selectedListUrl));
            return true; // Indicate success
        } catch (error) {
            console.error("Error deleting channel source:", error);
            return false; // Indicate failure
        }
    });
    
    // NEW: Handler for showing the info message
    ipcMain.handle('show-info-message', async () => {
        const result = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Information',
            message: 'This application requires VLC Media Player and Ace Stream Media to be installed.\n\n' +
                     'Click "VLC" to download VLC.\n' +
                     'Click "Ace Stream" to download Ace Stream.',
            buttons: ['VLC', 'Ace Stream', 'OK'],
            defaultId: 2, // Make "OK" the default button
            cancelId: 2   // Make "OK" the button triggered by the Escape key
        });

        // Check which button was clicked
        if (result.response === 0) {
            shell.openExternal('https://www.videolan.org/vlc/index.es.html');
        } else if (result.response === 1) {
            shell.openExternal('https://download.acestream.media/products/acestream-full/win/latest');
        }
        // If result.response is 2, the "OK" button was clicked, and we do nothing.
    });
}

app.whenReady().then(async () => {
    await initializeStore();
    loadImageMappings();
    registerIPCHandlers();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });