// code for the applications's main process

const {app, Menu, BrowserWindow, ipcMain, dialog} = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow(){
    // create application mainWindow
        mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
           // nodeIntegration: true, 
            contextIsolation: true 
        }
    });


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
            console.log('Exibir informações sobre o aplicativo');
            // Add logic to show 
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
    mainWindow.loadFile('index.html');

    // build the menu
    const menu = Menu.buildFromTemplate(templateMenu);
    Menu.setApplicationMenu(menu);

    // Abre as ferramentas de desenvolvimento (opcional)
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

/* ipcMain.on('open-directory-dialog', function(event) {
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }, function(files) {
        if (files) event.sender.send('selectedItem', files)
    })
}); */

// Handle file selection request from Renderer
ipcMain.handle('select-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
    if (canceled) return null;
  
    const fileContent = fs.readFileSync(filePaths[0], 'utf-8');
    return { path: filePaths[0], content: fileContent };
  });

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