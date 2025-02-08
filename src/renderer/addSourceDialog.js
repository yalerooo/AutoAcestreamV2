// src/renderer/addSourceDialog.js
document.addEventListener('DOMContentLoaded', () => {
    const sourceNameInput = document.getElementById('sourceName');
    const sourceUrlInput = document.getElementById('sourceUrl');
    const addSourceConfirmButton = document.getElementById('addSourceConfirm');
    const addSourceCancelButton = document.getElementById('addSourceCancel');

    addSourceConfirmButton.addEventListener('click', () => {
        const sourceData = {
            name: sourceNameInput.value.trim(),
            url: sourceUrlInput.value.trim()
        };

        if (sourceData.name && sourceData.url) {
            window.electronAPI.addSourceData(sourceData);
        } else {
            alert('Please enter both source name and URL.');
        }
    });

    addSourceCancelButton.addEventListener('click', () => {
        window.electronAPI.cancelAddSource();
    });
});