// settings.js (Modified to include Add Source button and logic)
document.addEventListener('DOMContentLoaded', async () => {
    const vlcPathInput = document.getElementById('vlcPathInput');
    const browseButton = document.getElementById('browseButton');
    const saveButton = document.getElementById('saveButton');
    const cancelButton = document.getElementById('cancelButton');
    const urlSelectionContainer = document.getElementById('urlSelection');
    const popupContainer = document.querySelector('.popup-container');
    const addSourceButton = document.createElement('button'); // NEW

    async function populateSettings() {
        const settings = await window.electronAPI.getSettings();
        vlcPathInput.value = settings.vlcPath;
        const sources = await window.electronAPI.getChannelSources();
        populateUrlChoices(sources, settings.selectedListUrl);
    }

    function populateUrlChoices(sources, selectedListUrl) {
        urlSelectionContainer.innerHTML = '';
        sources.forEach(source => {
            const option = document.createElement('option');
            option.value = source.url;
            option.textContent = source.name;
            option.selected = source.url === selectedListUrl;
            urlSelectionContainer.appendChild(option);
        });
    }

    browseButton.addEventListener('click', async () => {
        const result = await window.electronAPI.showOpenDialog();
        if (!result.canceled && result.filePaths.length > 0) {
            vlcPathInput.value = result.filePaths[0];
        }
    });

    saveButton.addEventListener('click', async () => {
        const settings = {
            vlcPath: vlcPathInput.value,
            selectedListUrl: urlSelectionContainer.value
        };
        await window.electronAPI.saveSettings(settings);
        window.electronAPI.closeSettingsDialog();
        const channels = await window.electronAPI.loadChannels();

    });

    cancelButton.addEventListener('click', () => window.electronAPI.closeSettingsDialog());

    popupContainer.addEventListener('click', (event) => {
        if (event.target === popupContainer) {
            window.electronAPI.closeSettingsDialog();
        }
    });

    urlSelectionContainer.addEventListener('change', async () => {
        const settings = {
            vlcPath: vlcPathInput.value,
            selectedListUrl: urlSelectionContainer.value
        };
        await window.electronAPI.saveSettings(settings);
        const channels = await window.electronAPI.loadChannels();

    });

    // NEW: Add Source Button
    addSourceButton.textContent = 'Add Source';
    addSourceButton.addEventListener('click', async () => {
        const result = await window.electronAPI.showAddSourceDialog();
        if (result) {
            // Refresh the source list after adding a new source
            const sources = await window.electronAPI.getChannelSources();
            const settings = await window.electronAPI.getSettings(); // Get *current* settings.
            populateUrlChoices(sources, settings.selectedListUrl); // Repopulate, using current settings.
        }
    });
     // Add the "Add Source" button before the save/cancel buttons.
    document.querySelector('.popup-content div:nth-child(3)').prepend(addSourceButton);



    populateSettings();
});