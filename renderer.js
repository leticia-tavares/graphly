const selectButton = document.getElementById('select-file');
const filePathDisplay = document.getElementById('file-path');
// const fileContentDisplay = document.getElementById('file-content');

selectButton.addEventListener('click', async () => {
  const fileData = await window.electronAPI.selectFile();
  if (fileData) {
    filePathDisplay.textContent = `Path: ${fileData.path}`;
    // fileContentDisplay.textContent = `Content:\n${fileData.content}`;
  } else {
    filePathDisplay.textContent = 'No file selected.';
    // fileContentDisplay.textContent = '';
  }
});