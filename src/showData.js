 // overview.js
document.addEventListener('DOMContentLoaded', async () => {

    // Load the dataset from the main process
    const dataset = await window.electronAPI.loadDataset();
    if (!dataset) {
        const response = await window.electronAPI.showDialog({
            type: 'info',
            buttons: ['OK'],
            title: 'Warning',
            message: 'Please upload your dataset first.'
          });
        // console.log('Resposta do diálogo:', response);
        window.electronAPI.navigate('index.html'); // Redirect to index.html
        return;
    }

    // CSV Parsing 
    const { data, meta } = Papa.parse(dataset.content, {
        header: true,
        dynamicTyping: true, // convert numbers and booleans
        skipEmptyLines: true,
        complete: results => {            
            const rows    = results.data;            // objects 
            const columns = results.meta.fields;     // column names

            if (!columns || columns.length === 0) {
              return alert('Não foi possível identificar colunas no CSV.');
            }
  
            // --- Creating metada object ---
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
  
              // Add all information to the metadata object
              metadata[col] = {
                type,
                uniqueValues: uniqueCount,
                missingValues: missing,
                mean: type === 'number' ? mean(nonNull) : null,
                min: type === 'number' ? min(nonNull) : null,
                max: type === 'number' ? max(nonNull) : null
              };
            });

            //console.log('file size:', dataset.size);
    
            showStatistics(columns, dataset.size, metadata, rows);

            // --- 3) Convert the object to an array ---
            const metaArray = columns.map(col => ({
              Column: col,
              Type: metadata[col].type,
              'Unique Values': metadata[col].uniqueValues,
              'Missing Values': metadata[col].missingValues
            }));

            const infoTable = document.getElementById('info-table');

           // --- 4) Print all info into a table ---
            showInfoTable(metaArray, ['Column','Type','Unique Values','Missing Values'], infoTable);
       }
    });

    // Create the data table
    const cols = meta.fields.slice(0,10); // get the first 10 columns
    const table = document.getElementById('data-table');

    showDataTable(data, cols, table);
 
});  

/** 
@brief This function displays the data in a table format.
@param {Array} data - The data to be displayed in the table.
@param {Array} cols - The columns to be displayed in the table.
@param {HTMLTableElement} table - The table element where the data will be displayed.
@description This function clears the existing content of the table, 
creates a header with the specified columns, and populates the body with the data. 
It limits the number of rows displayed to 10 for performance reasons.
*/
function showDataTable(data, cols, table){
    table.innerHTML = ''; // clean the table content

    // create the header
    const thead = table.createTHead();
    const hrow = thead.insertRow();

    // insert the columns into the header
    cols.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        hrow.appendChild(th);
    });

    const th = document.createElement('th');
    th.textContent = '...';
    hrow.appendChild(th);

    // create the body
    const tbody = table.createTBody();

    // insert the first 10 rows of data
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

/**
 * @brief This function displays the metadata information in a table format.
 * @param {Array} data 
 * @param {Array} cols 
 * @param {HTMLTableElement} table 
 * @description This functions clears the existing content of the info table,
 * creates a header with the specified columns, and populates the body with the metadata information.
 * It displays the column name, type, unique values, and missing values for each column.
 * It is used to provide an overview of the dataset's structure and quality.
 */
function showInfoTable(data, cols, table){
    table.innerHTML = ''; // clean the table content

    // create the header
    const thead = table.createTHead();
    const hrow = thead.insertRow();

    // insert the columns into the header
    cols.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        hrow.appendChild(th);
    });

    // create the body
    const tbody = table.createTBody();

    // insert the data into the body
    data.forEach(row => {
        const tr = tbody.insertRow();
        cols.forEach(col => {
        const td = tr.insertCell();
        td.textContent = row[col] ?? '';
        });
    });
}


/**
 * @brief This function calculates and displays the statistics of the dataset.
 * @param {Array} columns - The columns of the dataset.
 * @param {number} fileSize - The size of the dataset file in bytes.
 * @param {Object} metadata - The metadata object containing information about each column.
 * @param {Array} rows - The rows of the dataset.
 * @description This function calculates the percentage of missing values for each column,
 * the total number of rows and columns, and the size of the dataset in MB. 
 * It then updates the corresponding HTML elements with this information.
 */
function showStatistics(columns, fileSize, metadata, rows) {
    // Get the HTML elements to display the statistics
    const percentMissing = document.getElementById('missing-values');
    const numberOfRows = document.getElementById("total-rows");
    const numberOfColumns = document.getElementById('total-columns');
    const datasetSize = document.getElementById('file-size');

    // Calculate the total number of rows and columns
    const totalRows = rows.length;
    const totalColumns = columns.length;    

    // Calculate the percentage of missing values for each column
/*     const percentagesMissing = columns.map(col => {
        const missing = metadata[col].missingValues;
        const total = rows.length;
        return ((missing / total) * 100).toFixed(2);
    });
    
    const totalPercentMissing = percentagesMissing.reduce((acc, val) => acc + parseFloat(val), 0);

    console.log('Percentuais de values ausentes:', percentagesMissing);
    console.log('Total de values ausentes:', totalPercentMissing); */

     // Calculate the total number of missing values
    const totalMissing = columns.reduce((acc, col) => acc + metadata[col].missingValues, 0);
    
    // Calculate the overall percentage of missing values
    const totalPercentMissing = ((totalMissing / (totalRows * totalColumns)) * 100).toFixed(2);

    console.log('Total de valores ausentes:', totalMissing);
    console.log('Percentual total de valores ausentes:', totalPercentMissing);

    // Update the HTML elements with the calculated statistics
    percentMissing.textContent = totalPercentMissing;
    numberOfRows.textContent = totalRows;
    numberOfColumns.textContent = totalColumns;
    datasetSize.textContent = (fileSize / (1024 * 1024)).toFixed(2) + ' MB'; // convert the file size to MB
}