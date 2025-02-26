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

document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("nav-home");
  const visualizationBtn = document.getElementById("nav-visualization");
  const graphsBtn = document.getElementById("nav-graphs");
  const settingsBtn = document.getElementById("nav-settings");

  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      window.electronAPI.navigate("index.html");
    });
  }

  if (visualizationBtn) {
    visualizationBtn.addEventListener("click", () => {
      window.electronAPI.navigate("visualization.html");
    });
  }

  if (graphsBtn) {
    graphsBtn.addEventListener("click", () => {
      window.electronAPI.navigate("graphs.html");
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      window.electronAPI.navigate("settings.html");
    });
  }

});