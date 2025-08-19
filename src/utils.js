// const path = require('path');
// const fs = require('fs');
// const danfo = require('danfojs');
// const Papa = require('papaparse');

async function loadCSVFile(filePaths) {
  try {
    const fileStats = fs.statSync(filePaths[0]);
    const fileContent = fs.readFileSync(filePaths[0], 'utf-8');
    return { path: filePaths[0], content: fileContent, size: fileStats.size };
  } catch (error) {
    console.error('Erro ao carregar o arquivo CSV:', error);
    return null;
  }
}

function readCSVFile(filePath) {
    danfo.readCSV(filePath, { header: true, dynamicTyping: true })
        .then(async (df) => {
            console.log('DataFrame carregado com sucesso:', df);
            return df;
        })
        .catch(error => {
            console.error('Erro ao ler o arquivo CSV:', error);
            return null;
        })
}


function createDataframe(content) {
  try {
    const df = new danfo.DataFrame(content);
    //return df;
    df.head().print();
  } catch (error) {
    console.error('Erro ao criar DataFrame:', error);
    //return null;
  }
}

function saveDataframeToCSV(df, fileName, filePath) {
    try{
        const fullFilePath = path.join(filePath, fileName);
        df.toCSV({ path: fullFilePath, header: true });
        console.log(`DataFrame salvo em: ${fullFilePath}`);
    } catch (error) {
        console.error('Erro ao salvar DataFrame em CSV:', error);
    }   
}

function parseCSVContent(content){
    return Papa.parse(dataset.content, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
        console.log('Resultados completos do PapaParse:', results);

        const columns = results.meta.fields;
        const rows = results.data;

        if (columns.length < 2) {
            console.error('CSV deve ter no mínimo duas colunas.');
            return;
        }

        },
        error: (err) => {
        console.error('Erro ao fazer parsing do CSV:', err);
        }
  });
} 