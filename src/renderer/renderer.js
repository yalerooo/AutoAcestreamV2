// renderer.js (Modified to include info button functionality)
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
        renderChannels(allChannels);
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
            name.setAttribute('title', channel.name); //  Add the full name as the title attribute

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

    // NEW: Info button event listener
    infoButton.addEventListener('click', () => {
        window.electronAPI.showInfoMessage();
    });


    loadAndDisplayChannels();
    window.electronAPI.onUpdateChannels(renderChannels);
});