// settings.js (Using a single, pre-existing delete button)

document.addEventListener('DOMContentLoaded', async () => {
    const vlcPathInput = document.getElementById('vlcPathInput');
    const browseButton = document.getElementById('browseButton');
    const saveButton = document.getElementById('saveButton');
    const cancelButton = document.getElementById('cancelButton');
    const urlSelectionContainer = document.getElementById('urlSelection');
    const popupContainer = document.querySelector('.popup-container');
    const addSourceButton = document.createElement('button');
    const deleteButton = document.getElementById('cancelButton'); // Get the existing Delete button. Changed ID to match.
    deleteButton.textContent = "Delete";

    async function populateSettings() {
        const settings = await window.electronAPI.getSettings();
        vlcPathInput.value = settings.vlcPath;
        const sources = await window.electronAPI.getChannelSources();
        populateUrlChoices(sources, settings.selectedListUrl);
    }

    function populateUrlChoices(sources, selectedListUrl) {
        urlSelectionContainer.innerHTML = ''; // Clear previous options

        sources.forEach(source => {
            const option = document.createElement('option');
            option.value = source.url;
            option.textContent = source.name;
            option.selected = source.url === selectedListUrl;
            urlSelectionContainer.appendChild(option);
        });
    }


    async function deleteSource() {
        const selectedUrl = urlSelectionContainer.value;

        if (!selectedUrl) {
            alert('Please select a source to delete.');
            return;
        }

        if (confirm(`Are you sure you want to delete the source: ${selectedUrl}?`)) {
            const success = await window.electronAPI.deleteChannelSource(selectedUrl);
            if (success) {
                const sources = await window.electronAPI.getChannelSources();
                const settings = await window.electronAPI.getSettings();
                populateUrlChoices(sources, settings.selectedListUrl);

                if (sources.length === 0) {
                    urlSelectionContainer.value = ''; //Clear the list
                } else if (settings.selectedListUrl === selectedUrl) {
                    urlSelectionContainer.value = sources[0].url; // Select the first option.
                }
            } else {
                alert('Failed to delete the source.');
            }
        }
    }

    // Event listener for the pre-existing delete button
    deleteButton.addEventListener('click', deleteSource);


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
        await window.electronAPI.loadChannels();
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
       await window.electronAPI.loadChannels();
    });

    addSourceButton.textContent = 'Add Source';
    addSourceButton.addEventListener('click', async () => {
        const result = await window.electronAPI.showAddSourceDialog();
        if (result) {
            const sources = await window.electronAPI.getChannelSources();
            const settings = await window.electronAPI.getSettings();
            populateUrlChoices(sources, settings.selectedListUrl);
        }
    });

    // Add the "Add Source" button to the third div.
    document.querySelector('.popup-content div:nth-child(3)').prepend(addSourceButton);
    populateSettings();
});