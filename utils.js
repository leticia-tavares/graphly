const path = require('path');
const fs = require('fs');
const {app, Menu, BrowserWindow, ipcMain, dialog} = require('electron');


// Resolves the path to the script in the python/ folder (dev vs packaged)
function resolvePy(relScript) {
  const root = app.isPackaged ? process.resourcesPath : app.getAppPath();
  return path.join(root, 'python', relScript);
}

function createDirIfNotExists(dirName) {
    fs.mkdir(path.join(__dirname, dirName), {recursive: true},(err) => {
      if(err) {
        return console.error(err);
      }
      dataDir = path.join(__dirname, 'data');
      console.log("Directory successfuly created!");
    });
}

function deleteDir(dirName) {
    try {
        //fs.rmSync(dataCleanDir, { recursive: true, force: true });
        fs.rmSync(path.join(__dirname, dirName), { recursive: true, force: true });
        console.log('Data directory removed successfully.');
    } catch (err) {
        console.error('Error removing data directory:', err);
    }
}

function copyDirContents(srcDir, destDir, files){
    const results = [];

    for (const filename of files) {
        const src  = path.join(srcDir, filename);
        const dest = path.join(destDir, filename);

        // copia cada arquivo
        fs.copyFileSync(src, dest);
        results.push({ file: filename, ok: true });
    }
    
    return results;
}

module.exports = { resolvePy, 
    createDirIfNotExists, 
    deleteDir,
    copyDirContents,
};