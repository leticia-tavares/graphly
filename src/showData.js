 // overview.js
document.addEventListener('DOMContentLoaded', async () => {

    // carrega o dataset salvo no main process
    const dataset = await window.electronAPI.loadDataset();
    if (!dataset) {
        const response = await window.electronAPI.showDialog({
            type: 'info',
            buttons: ['OK'],
            title: 'Warning',
            message: 'Please upload your dataset first.'
          });
        // console.log('Resposta do diálogo:', response);
        window.electronAPI.navigate('index.html'); // Redireciona para upload

        return;
    }

    // parse CSV com cabeçalho
    const { data, meta } = Papa.parse(dataset.content, {
        header: true,
        skipEmptyLines: true,
        complete: results => {
            //const columns = Object.keys(rows[0] || {}); 
            
            const rows    = results.data;            // array de objetos
            const columns = results.meta.fields;     // nomes exatos do header
            if (!columns || columns.length === 0) {
              return alert('Não foi possível identificar colunas no CSV.');
            }
  
            // --- 2) Monta objeto de metadata ---
            const metadata = {};
            columns.forEach(col => {
              const values    = rows.map(r => r[col]);
              const missing    = values.filter(v => v == null || v === '').length;
              const nonNull    = values.filter(v => v != null && v !== '');
              const uniqueCount= new Set(nonNull).size;
              const tipos      = new Set(nonNull.map(v => typeof v));
              const type       = tipos.size === 1 ? [...tipos][0] : 'mixed';

              const mean = (arr) => {
                const sum = arr.reduce((acc, val) => acc + parseFloat(val), 0);
                return (sum / arr.length).toFixed(2);
              }

              const min = (arr) => {
                const min = Math.min(...arr.map(v => parseFloat(v)));
                return min.toFixed(2);
              }

              const max = (arr) => {
                const max = Math.max(...arr.map(v => parseFloat(v)));
                return max.toFixed(2);
              }
  
              metadata[col] = {
                type,
                uniqueValues: uniqueCount,
                missingValues: missing,
                mean: type === 'number' ? mean(nonNull) : null,
                min: type === 'number' ? min(nonNull) : null,
                max: type === 'number' ? max(nonNull) : null
              };
            });

            console.log('file size:', dataset.size);
    
            showStatistics(columns, dataset.size, metadata, rows);

            // --- 3) Converte em array para montar a tabela ---
            const metaArray = columns.map(col => ({
              Column: col,
              Type: metadata[col].type,
              'Unique Values': metadata[col].uniqueValues,
              'Missing Values': metadata[col].missingValues
            }));

            const infoTable = document.getElementById('info-table');

           // --- 4) Exibe na tabela ---
            showInfoTable(metaArray, ['Column','Type','Unique Values','Missing Values'], infoTable);
       }
    });

    // create data table
    const cols = meta.fields.slice(0,10); // pega as 10 primeiras colunas
    const table = document.getElementById('data-table');

    showDataTable(data, cols, table);
 
});  

function showDataTable(data, cols, table){
    table.innerHTML = ''; // limpa o conteúdo da tabela

    // monta o cabeçalho
    const thead = table.createTHead();
    const hrow = thead.insertRow();

    cols.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        hrow.appendChild(th);
    });

    const th = document.createElement('th');
    th.textContent = '...';
    hrow.appendChild(th);

    // monta o corpo
    const tbody = table.createTBody();

    data.slice(0,10).forEach(row => {
        const tr = tbody.insertRow();
        cols.forEach(col => {
        const td = tr.insertCell();
        td.textContent = row[col] ?? '';
        });
        const td = tr.insertCell();
        td.textContent = '...';
    });

    const tr = tbody.insertRow();
    cols.forEach(col => {
        const td = tr.insertCell();
        td.textContent = '...';
    });

    const td = tr.insertCell();
    td.textContent = '...';
}

function showInfoTable(data, cols, table){
    table.innerHTML = ''; // limpa o conteúdo da tabela

    // monta o cabeçalho
    const thead = table.createTHead();
    const hrow = thead.insertRow();

    cols.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        hrow.appendChild(th);
    });

    // monta o corpo
    const tbody = table.createTBody();

    data.forEach(row => {
        const tr = tbody.insertRow();
        cols.forEach(col => {
        const td = tr.insertCell();
        td.textContent = row[col] ?? '';
        });
    });
}

function showStatistics(columns, fileSize, metadata, rows) {
    const percentMissing = document.getElementById('missing-values');
    const numberOfRows = document.getElementById("total-rows");
    const numberOfColumns = document.getElementById('total-columns');
    const datasetSize = document.getElementById('file-size');

    const totalRows = rows.length;
    const totalColumns = columns.length;    

    const percentagesMissing = columns.map(col => {
        const missing = metadata[col].missingValues;
        const total = rows.length;
        return ((missing / total) * 100).toFixed(2);
    });
    
    const totalPercentMissing = percentagesMissing.reduce((acc, val) => acc + parseFloat(val), 0);

    console.log('Percentuais de values ausentes:', percentagesMissing);
    console.log('Total de values ausentes:', totalPercentMissing);

    percentMissing.textContent = totalPercentMissing;
    numberOfRows.textContent = totalRows;
    numberOfColumns.textContent = totalColumns;
    numberOfColumns.textContent = totalColumns;
    datasetSize.textContent = (fileSize / (1024 * 1024)).toFixed(2) + ' MB'; // converte para MB
}