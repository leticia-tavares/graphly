/* This file is responsible for Electron's renderer process. 
   It is used to handle the application's events and to interact with the main process. 
   The preload.js file is used to expose the ipcRenderer object to the renderer process.
*/
const selectButton = document.getElementById('select-file');
const filePathDisplay = document.getElementById('upload-result');

// Check if the elements exist before adding event listeners
selectButton.addEventListener('click', async () => {
  const fileData = await window.electronAPI.selectFile();

  if (fileData) {
    filePathDisplay.textContent = `Path: ${fileData.path}`;
    
    // save the dataset
    window.electronAPI.saveDataset(fileData);

    // load the ovewrview page
    window.electronAPI.navigate('overview.html');
  } else {
    filePathDisplay.textContent = 'No file selected.';
  }
});

// Navigation buttons 
document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("nav-home");
  const overviewBtn = document.getElementById("nav-overview");
  const visualizationBtn = document.getElementById("nav-visualization");
  const graphsBtn = document.getElementById("nav-graphs");

  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      window.electronAPI.navigate("index.html");
    });
  }

  if (overviewBtn) {
    overviewBtn.addEventListener("click", () => {
      window.electronAPI.navigate("overview.html");
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

});