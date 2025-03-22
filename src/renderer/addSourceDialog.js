document.addEventListener('DOMContentLoaded', () => {
    const sourceNameInput = document.getElementById('sourceName');
    const sourceUrlInput = document.getElementById('sourceUrl');
    const sourceFileInput = document.getElementById('sourceFile');
    const browseFileButton = document.getElementById('browseFile');
    const addSourceConfirmButton = document.getElementById('addSourceConfirm');
    const addSourceCancelButton = document.getElementById('addSourceCancel');
    const sourceTypeUrlRadio = document.getElementById('sourceTypeUrl');
    const sourceTypeFileRadio = document.getElementById('sourceTypeFile');
    const urlInputContainer = document.getElementById('urlInputContainer');
    const fileInputContainer = document.getElementById('fileInputContainer');

    function toggleInputVisibility() {
        urlInputContainer.style.display = sourceTypeUrlRadio.checked ? 'block' : 'none';
        fileInputContainer.style.display = sourceTypeFileRadio.checked ? 'block' : 'none';
    }

    toggleInputVisibility();

    sourceTypeUrlRadio.addEventListener('change', toggleInputVisibility);
    sourceTypeFileRadio.addEventListener('change', toggleInputVisibility);

    browseFileButton.addEventListener('click', async () => {
        const result = await window.electronAPI.showFileDialog();
        if (!result.canceled && result.filePaths.length > 0) {
            sourceFileInput.value = result.filePaths[0];
        }
    });

    addSourceConfirmButton.addEventListener('click', () => {
        const sourceData = {
            name: sourceNameInput.value.trim(),
            url: sourceTypeUrlRadio.checked ? sourceUrlInput.value.trim() : `file://${sourceFileInput.value.trim()}`,
            isFile: sourceTypeFileRadio.checked
        };

        if (sourceData.name && sourceData.url) {
            window.electronAPI.addSourceData(sourceData);
        } else {
            alert('Please enter both source name and URL/File.');
        }
    });

    addSourceCancelButton.addEventListener('click', () => {
        window.electronAPI.cancelAddSource();
    });
});