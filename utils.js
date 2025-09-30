const path = require('path');
const fs = require('fs');
const app = require('electron');




/**
 * @brief Create directory to store data 
 * @param {string} dirName 
 */
function createDirIfNotExists(dirName) {
    fs.mkdir(path.join(__dirname, dirName), {recursive: true},(err) => {
      if(err) {
        return console.error(err);
      }
      dataDir = path.join(__dirname, 'data');
      console.log("Directory successfuly created!");
    });
}

/**
 * @brief Remove directory created to store data (/data)
 * @param {string} dirName 
 */
function deleteDir(dirName) {
    try {
        //fs.rmSync(dataCleanDir, { recursive: true, force: true });
        fs.rmSync(path.join(__dirname, dirName), { recursive: true, force: true });
        console.log('Data directory removed successfully.');
    } catch (err) {
        console.error('Error removing data directory:', err);
    }
}

/**
 * @brief Copy all contents from the directory
 * @param {string} srcDir 
 * @param {string} destDir 
 * @param {Array} files 
 * @returns results for each file
 */
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

module.exports = {  
    createDirIfNotExists, 
    deleteDir,
    copyDirContents,
};