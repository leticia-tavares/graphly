/* Code for the applications's main process (backend)
   This file is responsible for creating the application's window and handling the application's events
*/

const {app, Menu, BrowserWindow, ipcMain, dialog, nativeTheme} = require('electron');
const path = require('path');
const fs = require('fs');

// python integration
// const spawn = require('child_process');
// const { spawnSync, spawn } = require('child_process');
// let pythonProcess;
// let PYTHON_BIN;

const py = require('./bootstrap-python');
let PYTHON_BIN;


// ----- Global Variables -----
let mainWindow;           // stores the app main window
let savedDataset = null;  // stores the dataset loaded by the user
/* 
function findSystemPython() {
  const candidates = process.platform === 'win32'
    ? [['py', ['-3', '--version']], ['python', ['--version']]]
    : [['python3', ['--version']], ['python', ['--version']]];

  for (const [cmd, args] of candidates) {
    const r = spawnSync(cmd, args, { encoding: 'utf8' });
    if (r.status === 0 && /Python 3\.(1\d|[0-9])/.test(r.stdout + r.stderr)) {
      return cmd; // ok (3.x)
    }
  }
  throw new Error('Python 3 não encontrado no sistema.');
}


function venvPaths(venvDir) {
  const isWin = process.platform === 'win32';
  return {
    python: isWin ? path.join(venvDir, 'Scripts', 'python.exe')
                  : path.join(venvDir, 'bin', 'python'),
  };
}

function ensurePythonEnv() {
  const userData = app.getPath('userData');
  const venvDir = path.join(userData, 'pyenv');
  const reqFile = path.join(process.resourcesPath || process.cwd(), "graphly_requirements.txt");

  // 1) cria venv se não existir
  if (!fs.existsSync(path.join(venvDir, process.platform === 'win32' ? 'Scripts' : 'bin'))) {
    const py = findSystemPython();
    const r = spawnSync(py, ['-m', 'venv', venvDir], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('Falha ao criar venv.');
  }

  // 2) atualiza pip/setuptools/wheel
  const { pip } = venvPaths(venvDir);
  let r = spawnSync(pip, ['install', '--upgrade', 'pip', 'setuptools', 'wheel'], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('Falha atualizando pip.');

  // 3) instala/atualiza requirements
  if (fs.existsSync(reqFile)) {
    r = spawnSync(pip, ['install', '--upgrade', '-r', reqFile], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('Falha instalando requirements.');
  } else {
    console.warn('requirements não encontrado em', reqFile);
  }

  return venvPaths(venvDir).python;
}
 */

// Resolve caminho do script na pasta python/ (dev vs empacotado)
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

ipcMain.handle('python-init', (event, value) => {

  const scriptPath = path.join(__dirname, 'scripts/test.py'); // ajuste o nome/caminho

  pythonProcess = spawn.spawn('python', ['-u', scriptPath, value], {
    env: { ...process.env, PYTHONUNBUFFERED: '1' }, // redundante mas ajuda
    cwd: __dirname
  });
  
  //pythonProcess = spawn.spawn('python', ['scripts/test.py']);

  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString();
    // console.log(`\nPython Output: ${output}`);
    event.sender.send('python-output', output);
  });

  pythonProcess.stderr.on('data', (data) => {
    const err = data.toString();
    console.error('Python Error:', err);
    event.sender.send('python-error', err);
  });

  pythonProcess.on('close', (code, signal) => {
    const msg = `Processo finalizado. code=${code} signal=${signal || 'none'}`;
    console.log(msg);
    event.sender.send('python-exit', { code, signal });
  });
  return 'Python iniciado!';
});

ipcMain.handle('python-send', (data) => {
  data = data.toString() + '\n'; // garante que é string e termina com nova linha
  if (pythonProcess) {
    pythonProcess.stdin.write(data);
    return 'Mensagem enviada para o Python.';
  }
});


ipcMain.handle('python-end', () => {
  if (pythonProcess && !pythonProcess.killed) {
    pythonProcess.kill(); // geralmente SIGTERM
  }
  return 'Python encerrado!';

});


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


// IPC — roda um script Python e devolve {code, stdout, stderr}
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
/* app.whenReady().then(() => {

  try {
    PYTHON_BIN = ensurePythonEnv();
    createWindow();

    app.on('activate', () => {
    //recreates the mainWindow if all windows were closed (macOS)
    if(BrowserWindow.getAllWindows().length === 0){
        createWindow();
    }
    });
  } catch (err) {
    console.error('[Graphly] Falha ao preparar Python:', err);
    dialog.showErrorBox('Erro ao preparar ambiente Python', String(err));
  }
  }).catch(err => {
    console.error('[Graphly] Erro no whenReady:', err);
});
 */
app.whenReady().then(async () => {
  try {
    const { pythonBin } = await py.prepare({
      venvDirName: 'pyenv',
      requirementsFileName: 'graphly_requirements.txt',
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

// Closes the application when all windows are closed as well 
app.on('windows-all-closed', () => {
    if(process.platform !== 'darwin'){
        app.quit();
    }
});