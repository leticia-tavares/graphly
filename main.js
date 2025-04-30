/* Code for the applications's main process (backend)
   This file is responsible for creating the application's window and handling the application's events
*/
const {app, Menu, BrowserWindow, ipcMain, dialog, nativeTheme} = require('electron');
const path = require('path');
const fs = require('fs');
const dfd = require('danfojs-node');

let mainWindow;
let savedDataset = null;

// creating directory to store any data
fs.mkdir(path.join(__dirname, 'data'), {recursive: true},(err) => {
  if(err) {
    return console.error(err);
  }
  const dataDir = path.join(__dirname, 'data');
  console.log("Directory successfuly created!");
});

async function loadCSV(filePath) {
  const df = await dfd.readCSV(filePath);
  return df;
}

function createWindow(){
    // create application mainWindow
        mainWindow = new BrowserWindow({
          width: 1280,
          height: 800,
          minWidth: 1024,
          minHeight: 720,
        icon: path.join(__dirname, '/assets/logo-cicle.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false, 
            contextIsolation: true 
        }
    });
   
    if(process.platform === 'darwin'){
      app.dock.setIcon(path.join(__dirname, '/assets/logo-circle.png'));
    }

  // create the application's menu template for all OS
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

  // additional menu template logic for macOS
  if (process.platform === 'darwin'){
    const name = app.getName();
    templateMenu.unshift({
      label: name,
      submenu: [{
        label: 'Quit',
        ccelerator: 'Command+Q',
        click: function(){
          app.quit();
        }
      }]
    })
  
  }

    // load the html file
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    // build the menu
    const menu = Menu.buildFromTemplate(templateMenu);
    Menu.setApplicationMenu(menu);

    // Abre as ferramentas de desenvolvimento (opcional)
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

// Handle navigation request from Renderer
ipcMain.on('navigate', (event, page) => {
/*   let pathToPage = path.join(__dirname, `renderer/${page}`);
  mainWindow.loadFile(pathToPage); */

  console.log(`Navegando para: ${page}`);
  const pathToPage = path.join(__dirname, 'renderer', page);
  mainWindow.loadFile(pathToPage).catch(err => console.error(`Erro ao carregar ${page}:`, err));
});

// Recebe o tema do frontend e aplica no Electron
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
    
    const fileContent = fs.readFileSync(filePaths[0], 'utf-8');
    return { path: filePaths[0], content: fileContent };
  });

ipcMain.handle('show-dialog', async (event, dialogOptions) => {
  const result = await dialog.showMessageBox(dialogOptions);
  return result;
});
  

ipcMain.on('save-dataset', (event, data) => {
  // recebe e armazena o conteudo do dataset
  savedDataset = data;
});

ipcMain.handle('load-dataset', () => {
  if (savedDataset){
    return savedDataset;
  } 
  return null;
})

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        //recreates the mainWindow if all windows were closed (macOS)
        if(BrowserWindow.getAllWindows().length === 0){
            createWindow();
        }
    });
});

// closes the application whenn all windows are closed as well (except macos)
app.on('windows-all-closed', () => {
    if(process.platform !== 'darwin'){
        app.quit();
    }
});