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
        console.log('Resposta do diálogo:', response);
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
              const valores    = rows.map(r => r[col]);
              const missing    = valores.filter(v => v == null || v === '').length;
              const nonNull    = valores.filter(v => v != null && v !== '');
              const uniqueCount= new Set(nonNull).size;
              const tipos      = new Set(nonNull.map(v => typeof v));
              const type       = tipos.size === 1 ? [...tipos][0] : 'mixed';
  
              metadata[col] = {
                type,
                uniqueValues: uniqueCount,
                missingValues: missing
              };
            });
  
            // --- 3) Converte em array para montar a tabela ---
            const metaArray = columns.map(col => ({
              Column: col,
              Type: metadata[col].type,
              'Unique Values': metadata[col].uniqueValues,
              'Missing Values': metadata[col].missingValues
            }));

            const infoTable = document.getElementById('info-table');

           // --- 4) Exibe na tabela ---
            showInfoTable(metaArray,
                          ['Column','Type','Unique Values','Missing Values'],
                          infoTable);
       }
           
    });

    //statistics
    const stats = {
        rows: data.length,
        columns: Object.keys(data[0]).length,
        types: Object.fromEntries(
            Object.entries(data[0]).map(([key, value]) => [key, typeof value])
        )
    };

    console.log('Statistics:', stats.types);
    
    // mostra os dados no HTML
    const numberOfRows = document.getElementById("total-rows");
    const numberOfColumns = document.getElementById('total-columns');

    numberOfRows.textContent = stats.rows;
    numberOfColumns.textContent = stats.columns;

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