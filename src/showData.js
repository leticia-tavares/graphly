// overview.js
document.addEventListener('DOMContentLoaded', async () => {

    // carrega o dataset salvo no main process
    const dataset = await window.electronAPI.loadDataset();
    if (!dataset) {
        document.getElementById('upload-result').textContent = 'Please upload your dataset first.';
        return;
    }

    // parse CSV com cabeçalho
    const { data, meta } = Papa.parse(dataset.content, {
        header: true,
        skipEmptyLines: true
    });

    const cols = meta.fields.slice(0, 10); //pega as 5 primeiras colunas
    const table = document.getElementById('data-table');

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
 

}); 