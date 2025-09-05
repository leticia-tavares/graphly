/* Code for the applications's main process (backend)
   This file is responsible for creating the application's window and handling the application's events
*/

const {app, Menu, BrowserWindow, ipcMain, dialog, nativeTheme} = require('electron');
const path = require('path');
const fs = require('fs');

// python integration
const spawn = require('child_process');
const pythonProcess = spawn.spawn('python', ['scripts/test.py', 'Hello from Node.js!']);

// ----- Global Variables -----
let mainWindow;           // stores the app main window
let savedDataset = null;  // stores the dataset loaded by the user

// Creating a directory to store any new data
fs.mkdir(path.join(__dirname, 'data'), {recursive: true},(err) => {
  if(err) {
    return console.error(err);
  }
  dataDir = path.join(__dirname, 'data');
  console.log("Directory successfuly created!");
});

pythonProcess.stdout.on('data', (data) => {
  console.log(`\nPython Output: ${data}`);
});

pythonProcess.stderr.on('data', (data) => {
  console.error(`\nPython Error: ${data}`);
});

pythonProcess.on('close', (code) => {
  console.log(`\nPython process exited with code ${code}`);   
});

/** 
@brief Creates the main application window
@details This function is called when the application is ready to create the main window.
         It sets the window's size, icon, web preferences, and loads the HTML file.
         It also creates the application's menu and handles navigation requests from the renderer process.
*/ 
function createWindow(){
    // create application mainWindow
        mainWindow = new BrowserWindow({
          width: 1280,
          height: 800,
          minWidth: 1024,
          minHeight: 720,
          // icon: path.join(__dirname, '/assets/logo-circle.png'),
          icon: path.join(__dirname, '/assets/logo-circle.ico'),
          webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false, 
            contextIsolation: true,
            sandbox: false
        }
    });
   
    // Set the app icon for MacOS Dock
    if(process.platform === 'darwin'){
      app.dock.setIcon(path.join(__dirname, '/assets/logo-circle.png'));
    }

  // Application's menu template for all Operating Systems
  const templateMenu = [
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click(item, focusedWindow) {
            if (focusedWindow){
              // on reload, start fresh and close any old
              // open secondary windows
              if (focusedWindow.id === 1) {
                BrowserWindow.getAllWindows().forEach(function (win) {
                  if (win.id > 1) {
                    win.close()
                  }
                })
              }
              focusedWindow.reload()
            }
          }
        },
        {
          label: 'Toggle Full Screen',
          accelerator: (function (){
            if(process.platform === 'darwin'){
              return 'Ctrl+Command+F';
            } 
            else {
              return 'F11';
            }
          })(),
          click(item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
            }
          }
        },{
          label: 'Toggle Developer Tools',
          accelerator: (function () {
            if (process.platform === 'darwin') {
              return 'Alt+Command+I';
            } else {
              return 'Ctrl+Shift+I';
          }
          })(),
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.toggleDevTools()
            }
          }
          }]
        }, 
        {
          label: 'Window',
          role: 'window',
          submenu: [{
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
          }, 
          {
            type: 'separator'
          }, 
          {
            label: 'Reopen Window',
            accelerator: 'CmdOrCtrl+Shift+T',
            enabled: false,
            key: 'reopenMenuItem',
            click: function () {
              app.emit('activate')
            }
          }]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click() {
            //console.log('Exibir informações sobre o aplicativo');
            dialog.showMessageBox({
              type: 'info',
              buttons: ['Ok'],
              title: "About",
              detail: "Desktop application to help with data visualization, transform grid-like data into graphs and to perform community detection."
            });
          }
        }
      ]
    }
  ]; // end of menu template

  // Additional menu template logic for macOS
  if (process.platform === 'darwin'){
    const name = app.getName();
    templateMenu.unshift({
      label: name,
      submenu: [{
        label: 'Quit',
        accelerator: 'Command+Q',
        click: function(){
          app.quit();
        }
      }]
    })
  
  }

    // Load index.html file into the main window
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    // Build the menu
    const menu = Menu.buildFromTemplate(templateMenu);
    Menu.setApplicationMenu(menu);

    // Enable the DevTools for debugging 
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

// Handle navigation request from the Renderer process
ipcMain.on('navigate', (event, page) => {
/*   let pathToPage = path.join(__dirname, `renderer/${page}`);
  mainWindow.loadFile(pathToPage); */

  console.log(`Navigating to: ${page}`);
  const pathToPage = path.join(__dirname, 'renderer', page);
  mainWindow.loadFile(pathToPage).catch(err => console.error(`Error when loading ${page}:`, err));
});

// Handle theme change request from Renderer
ipcMain.on('set-theme', (event, theme) => {
  if (theme === 'system') {
    nativeTheme.themeSource = 'system';
  } else {
    nativeTheme.themeSource = theme;
  }
});

// Handle file selection request from Renderer
ipcMain.handle('select-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
    if (canceled) return null;

    // Error Dialog for non csv files
    const fileType = path.extname(filePaths[0]).toLocaleLowerCase();
    if (fileType !== '.csv'){
      dialog.showErrorBox('Error! Extension not supported.', 'Please, upload only .csv files.');
      return null;
    }
    // Read the file content and return it to the Renderer process
    try {
      const fileStats = await fs.promises.stat(filePaths[0]);
      const fileContent = await fs.promises.readFile(filePaths[0], 'utf-8');
      return { path: filePaths[0], content: fileContent, size: fileStats.size };
      
    } catch (err) {
      dialog.showErrorBox('Error reading file.', err.message);
      return null;
    }
  });

ipcMain.handle('show-dialog', async (event, dialogOptions) => {
  const result = await dialog.showMessageBox(dialogOptions);
  return result;
});
  
// Save dataset to a global variable
ipcMain.on('save-dataset', (event, data) => {
  savedDataset = data;
});

// Load the dataset from the global variable
ipcMain.handle('load-dataset', () => {
  if (savedDataset){
    return savedDataset;
  } 
  return null;
});

ipcMain.handle('get-path', (_e, relative) => {
  // Salva dentro da pasta de dados do app (userData)
  // Ex.: .../AppData/Roaming/SeuApp/data/filtered_dataset.csv
  const base = app.getPath('userData');
  return path.join(base, relative);
});

ipcMain.handle('write-file', async (_e, { filePath, content }) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, content, 'utf8');
  return true;
});

ipcMain.handle('export-file', async (event, relativeName) => {
  // Caminho absoluto do arquivo dentro do projeto
  const sourcePath = path.join(__dirname, 'data', relativeName);
  
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save CSV file',
    defaultPath: relativeName,
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  
  if (canceled || filePath.length === 0) {
    console.log('User canceled the save dialog.');
    return { canceled: true };
  }

  // Copia o arquivo
  try {
    await fs.promises.copyFile(sourcePath, filePath);
    console.log(`Arquivo exportado para: ${filePath}`);
    return { canceled: false, filePath };

  } catch (err) {
    console.error('Erro ao exportar arquivo:', err);
    dialog.showErrorBox('Erro ao exportar', err.message);
    
    return { canceled: true, error: err.message };
  }
});


// Application ready event
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        //recreates the mainWindow if all windows were closed (macOS)
        if(BrowserWindow.getAllWindows().length === 0){
            createWindow();
        }
    });
});

// Closes the application when all windows are closed as well 
app.on('windows-all-closed', () => {
    if(process.platform !== 'darwin'){
        app.quit();
    }
});