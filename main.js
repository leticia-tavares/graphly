/* Code for the applications's main process (backend)
   This file is responsible for creating the application's window and handling the application's events
*/

const {app, Menu, BrowserWindow, ipcMain, dialog, nativeTheme} = require('electron');
const path = require('path');
const fs = require('fs');
const py = require('./bootstrap-python');

// ----- Global Variables -----
const dataCleanDir = path.join(app.getPath('userData'), 'data');
let PYTHON_BIN;
let mainWindow;           // stores the app main window
let savedDataset = null;  // stores the dataset loaded by the user


// Resolves the path to the script in the python/ folder (dev vs packaged)
function resolvePy(relScript) {
  const root = app.isPackaged ? process.resourcesPath : app.getAppPath();
  return path.join(root, 'python', relScript);
}

// Creating a directory to store any new data
fs.mkdir(path.join(__dirname, 'data'), {recursive: true},(err) => {
  if(err) {
    return console.error(err);
  }
  dataDir = path.join(__dirname, 'data');
  console.log("Directory successfuly created!");
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

// Exports all files from /data to a user-selected directory
ipcMain.handle('export-data', async () => {
  try {
    const srcDir = path.join(__dirname, 'data');

    // lista todos os arquivos dentro de /data
    const files = fs.readdirSync(srcDir);

    if (!files.length) {
      return { canceled: false, error: 'Nenhum arquivo encontrado no diretório /data.' };
    }

    // pede para o usuário escolher a pasta de destino
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Escolha a pasta de destino',
      properties: ['openDirectory', 'createDirectory']
    });
    if (canceled) return { canceled: true };

    const destDir = filePaths[0];
    const results = [];

    for (const filename of files) {
      const src  = path.join(srcDir, filename);
      const dest = path.join(destDir, filename);

      // copia cada arquivo
      fs.copyFileSync(src, dest);
      results.push({ file: filename, ok: true });
    }

    return { canceled: false, results };
  } catch (err) {
    console.error('Export error:', err);
    return { canceled: false, error: err.message };
  }
});


// IPC — runs a Python script and returns {code, stdout, stderr}
ipcMain.handle('python:run', async (event, relScript, args = []) => {
  if (!PYTHON_BIN) throw new Error('Python não inicializado.');
  const script = resolvePy(relScript);

  let out = '', err = '';
  const code = await py.runWithAutoDeps(PYTHON_BIN, script, args, {
    onData: (ch, msg) => {
      if (ch === 'stdout') out += msg; else err += msg;
      // log streaming opcional para o renderer:
      event.sender.send('python:log', { ch, msg });
    }
  });

  return { code, stdout: out, stderr: err };
});


// Application ready event
app.whenReady().then(async () => {
  try {
    const { pythonBin } = await py.prepare({
      venvDirName: 'pyenv',
      requirementsFileName: 'requirements.txt',
      wheelsDirName: 'wheels',      // inclua na build p/ offline
      offline: false,               // mude para true se quiser forçar offline
      // indexUrl: 'https://pypi.org/simple',
      // extraIndexUrl: 'https://<mirror>/simple',
    });
    PYTHON_BIN = pythonBin;

    createWindow();
  } catch (e) {
    console.error('[Graphly] Erro preparando Python:', e);
    dialog.showErrorBox('Python bootstrap falhou', String(e));
  }
});

// Cleanup data directory on exit
app.on('before-quit', () => {
  try {
    //fs.rmSync(dataCleanDir, { recursive: true, force: true });
    fs.rmSync(path.join(__dirname, 'data'), { recursive: true, force: true });
    console.log('Data directory removed successfully:', dataDir);
  } catch (err) {
    console.error('Error removing data directory:', err);
  }
});


// Closes the application when all windows are closed as well 
app.on('windows-all-closed', () => {

  if (process.platform !== 'darwin') {
    app.quit();
  }
});