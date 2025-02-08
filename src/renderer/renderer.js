document.addEventListener('DOMContentLoaded', async () => {
    const channelsPanel = document.getElementById('channelsPanel');
    const settingsButton = document.getElementById('settingsButton');
    const searchBox = document.getElementById('searchQueryInput');
    const infoButton = document.getElementById('infoButton'); // NEW
    let allChannels = [];

    async function loadAndDisplayChannels() {
        const channelData = await window.electronAPI.loadChannels();
        if (channelData.error) {
            console.error("Error loading channels:", channelData.error);
            channelsPanel.innerHTML = `<div class="error">Error: ${channelData.error}</div>`;
            return;
        }
        allChannels = channelData;
		 // Check if allChannels is actually an array before rendering
        if (Array.isArray(allChannels)) {
            renderChannels(allChannels);
        } else {
            console.error("Loaded channels data is not an array:", allChannels);
            channelsPanel.innerHTML = `<div class="error">Error: Invalid channel data.</div>`;
        }

    }

   function renderChannels(channels) {
        channelsPanel.innerHTML = '';
        if (!channels || channels.length === 0) {
            channelsPanel.innerHTML = '<div class="no-channels">No channels found.</div>';
            return;
        }

        channels.forEach(channel => {
            const channelItem = document.createElement('div');
            channelItem.classList.add('channel-item');

            const imageContainer = document.createElement('div');
            imageContainer.classList.add('image-container');

            const image = document.createElement('img');
            image.src = channel.imageUrl || '../../default_channel_image.png';
            image.alt = channel.name;
            image.classList.add('channel-image');
            image.onerror = () => { image.src = '../../default_channel_image.png'; };

            imageContainer.appendChild(image);

            const name = document.createElement('div');
            name.textContent = channel.name;
            name.classList.add('channel-name');
            name.setAttribute('title', channel.name);

            channelItem.appendChild(imageContainer);
            channelItem.appendChild(name);

            channelItem.addEventListener('click', async () => {
                await window.electronAPI.playInVlc(channel.aceId);
            });
            channelsPanel.appendChild(channelItem);
        });
    }

    settingsButton.addEventListener('click', () => window.electronAPI.showSettingsDialog());

    searchBox.addEventListener('input', () => {
        const searchTerm = searchBox.value.toLowerCase();
        const filteredChannels = allChannels.filter(channel =>
            channel.name.toLowerCase().includes(searchTerm)
        );
        renderChannels(filteredChannels);
    });

    infoButton.addEventListener('click', () => {
        window.electronAPI.showInfoMessage();
    });

    // Call loadAndDisplayChannels on startup
    loadAndDisplayChannels();

    // Listen for updates and re-render
    window.electronAPI.onUpdateChannels(async (updatedChannels) => {
		if (Array.isArray(updatedChannels)) { //Check if are an array.
			allChannels = updatedChannels; // Update allChannels
			renderChannels(allChannels);
		} else {
			console.error("Updated channels data is not an array:", updatedChannels);
            channelsPanel.innerHTML = `<div class="error">Error: Invalid channel data.</div>`; // Show error in UI.
		}

    });
});