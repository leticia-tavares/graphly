// document.addEventListener('DOMContentLoaded', async () => {
//   const histogram = document.querySelector("#histograma");
//   const correlation = document.querySelector("#correlacao");
//   const bars = document.querySelector("#barras");
//   const boxplot = document.querySelector("#boxplot");

//   const selectColumns = document.getElementById("select-columns");
//   const selectedContainer = document.getElementById('selected-columns');

//   const dataset = await window.electronAPI.loadDataset();

//   let selectedItems = []; // Array para gerenciar os itens selecionados 


//   if (!dataset || !dataset.content) {
//     //alert("Dataset não carregado! Você precisa selecionar um dataset primeiro.");
//     const response = await window.electronAPI.showDialog({
//       type: 'info',
//       buttons: ['OK'],
//       title: 'Warning',
//       message: 'Please upload your dataset first.'
//     });
//     console.log('Resposta do diálogo:', response);
//     window.electronAPI.navigate('index.html'); // Redireciona para upload
//     return;
//   }

//   Papa.parse(dataset.content, {
//     header: true,
//     dynamicTyping: true,
//     skipEmptyLines: true,
//     complete: (results) => {
//       console.log('Resultados completos do PapaParse:', results);

//       const data = results.data;
//       const columns = results.meta.fields;

//       if (columns.length < 2) {
//         console.error('CSV deve ter no mínimo duas colunas.');
//         return;
//       }

//       selectColumns.innerHTML = ""; // Limpa opções anteriores

//       columns.forEach(col => {
//         const option = document.createElement("option");
//         option.value = col;
//         option.textContent = col;
//         selectColumns.appendChild(option);
//       });

//       handleDataSelection(columns, data);

//       selectColumns.addEventListener('change', updateSelectedColumns);
//       document.addEventListener('DOMContentLoaded', renderTags); 

//       // adiciona opcao de filtro nos graficos
//       let newColumns = {};
//       if (selectedItems.length > 0) {
//         selectedItems.forEach(value => {
//           newColumns = Array.from(columns).filter(col => col !== value);
//         })
//         handleDataSelection(newColumns, data);
//       }
//     },
//     error: (err) => {
//       console.error('Erro ao fazer parsing do CSV:', err);
//     }
//   });


//   function updateSelectedColumns() {
//   // Verifica opções selecionadas e atualiza o array
//   Array.from(selectColumns.options).forEach(option => {
//     if (option.selected && !selectedItems.includes(option.value)) {
//       selectedItems.push(option.value);
//       option.disabled = true;
//     }
//   });

//   renderTags();
//   }

//   function renderTags() {
//     selectedContainer.innerHTML = '';
    
//     selectedItems.forEach(value => {
//       const tag = document.createElement('div');
//       tag.className = 'column-tag';
//       tag.dataset.column = value;
//       tag.innerHTML = `${value} <button type="button">×</button>`;

//       tag.querySelector('button').addEventListener('click', () => {
//         selectedItems = selectedItems.filter(item => item !== value);
//         const option = Array.from(selectColumns.options).find(opt => opt.value === value);
//         option.disabled = false;
//         option.selected = false;
//         renderTags();
//       });

//       selectedContainer.appendChild(tag);
//     });
//   }
 
//   function handleDataSelection(columns, data) {
//     const histogramData = data.map(row => row[columns[0]]);
//     const correlacaoData = {
//       x: data.map(row => row[columns[0]]),
//       y: data.map(row => row[columns[1]])
//     };
//     const barChartData = {
//       categories: data.slice(0, 4).map(row => row[columns[0]]),
//       series: data.slice(0, 4).map(row => row[columns[1]])
//     };
//     const boxplotData = [
//       { x: columns[0], y: data.map(row => row[columns[0]]) },
//       { x: columns[1], y: data.map(row => row[columns[1]]) }
//     ];

//     console.log("Dados preparados para gráficos:", {
//       histogramData,
//       correlacaoData,
//       barChartData,
//       boxplotData
//     });

//     renderCharts(histogramData, correlacaoData, barChartData, boxplotData);
//   }

//   function renderCharts(histogramData, correlacaoData, barChartData, boxplotData) {
//     new ApexCharts(histogram, {
//       chart: { type: 'bar' },
//       series: [{ name: 'Frequência', data: histogramData }],
//       title: { text: 'Histograma' },
//     }).render();

//     new ApexCharts(correlation, {
//       chart: { type: 'scatter' },
//       series: [{
//         name: 'Correlação',
//         data: correlacaoData.x.map((x, i) => [x, correlacaoData.y[i]])
//       }],
//       xaxis: { title: { text: 'X' } },
//       yaxis: { title: { text: 'Y' } },
//       title: { text: 'Gráfico de Correlação' },
//     }).render();

//     new ApexCharts(bars, {
//       chart: { type: 'bar' },
//       series: [{ name: 'Valores', data: barChartData.series }],
//       xaxis: { categories: barChartData.categories },
//       title: { text: 'Gráfico de Barras' },
//     }).render();

//     new ApexCharts(boxplot, {
//       chart: { type: 'boxPlot' },
//       series: [{ name: 'Distribuição', data: boxplotData }],
//       title: { text: 'Boxplot' },
//     }).render();
//   }

// });

document.addEventListener('DOMContentLoaded', async () => {
  const histogram = document.querySelector("#histograma");
  const correlation = document.querySelector("#correlacao");
  const bars = document.querySelector("#barras");
  const boxplot = document.querySelector("#boxplot");

  const selectColumns = document.getElementById("select-columns");
  const selectedContainer = document.getElementById('selected-columns');
  const confirmBtn = document.getElementById('confirm-selection');

  const dataset = await window.electronAPI.loadDataset();

  let selectedItems = [];

  if (!dataset || !dataset.content) {
    const response = await window.electronAPI.showDialog({
      type: 'info',
      buttons: ['OK'],
      title: 'Warning',
      message: 'Please upload your dataset first.'
    });
    window.electronAPI.navigate('index.html');
    return;
  }

  Papa.parse(dataset.content, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: (results) => {
      const data = results.data;
      const columns = results.meta.fields;

      selectColumns.innerHTML = "";

      columns.forEach(col => {
        const option = document.createElement("option");
        option.value = col;
        option.textContent = col;
        selectColumns.appendChild(option);
      });

      selectColumns.addEventListener('change', updateSelectedColumns);

      confirmBtn.addEventListener('click', () => {
        if (selectedItems.length < 2) {
          alert("Selecione pelo menos 2 colunas para visualizar os gráficos.");
          return;
        }

        // Remove gráficos anteriores
        histogram.innerHTML = "";
        correlation.innerHTML = "";
        bars.innerHTML = "";
        boxplot.innerHTML = "";

        handleDataSelection(selectedItems, data);
      });
    },
    error: (err) => {
      console.error('Erro ao fazer parsing do CSV:', err);
    }
  });

  function updateSelectedColumns() {
    Array.from(selectColumns.options).forEach(option => {
      if (option.selected && !selectedItems.includes(option.value)) {
        selectedItems.push(option.value);
        option.disabled = true;
      }
    });

    renderTags();
  }

  function renderTags() {
    selectedContainer.innerHTML = '';

    selectedItems.forEach(value => {
      const tag = document.createElement('div');
      tag.className = 'column-tag';
      tag.dataset.column = value;
      tag.innerHTML = `${value} <button type="button">×</button>`;

      tag.querySelector('button').addEventListener('click', () => {
        selectedItems = selectedItems.filter(item => item !== value);
        const option = Array.from(selectColumns.options).find(opt => opt.value === value);
        option.disabled = false;
        option.selected = false;
        renderTags();
      });

      selectedContainer.appendChild(tag);
    });
  }

  function handleDataSelection(columns, data) {
    const [col1, col2] = columns;

    const histogramData = data.map(row => row[col1]);
    const correlacaoData = {
      x: data.map(row => row[col1]),
      y: data.map(row => row[col2])
    };
    const barChartData = {
      categories: data.slice(0, 4).map(row => row[col1]),
      series: data.slice(0, 4).map(row => row[col2])
    };
    const boxplotData = [
      { x: col1, y: data.map(row => row[col1]) },
      { x: col2, y: data.map(row => row[col2]) }
    ];

    renderCharts(histogramData, correlacaoData, barChartData, boxplotData);
  }

  function renderCharts(histogramData, correlacaoData, barChartData, boxplotData) {
    new ApexCharts(histogram, {
      chart: { type: 'bar' },
      series: [{ name: 'Frequência', data: histogramData }],
      title: { text: 'Histograma' },
    }).render();

    new ApexCharts(correlation, {
      chart: { type: 'scatter' },
      series: [{
        name: 'Correlação',
        data: correlacaoData.x.map((x, i) => [x, correlacaoData.y[i]])
      }],
      xaxis: { title: { text: 'X' } },
      yaxis: { title: { text: 'Y' } },
      title: { text: 'Gráfico de Correlação' },
    }).render();

    new ApexCharts(bars, {
      chart: { type: 'bar' },
      series: [{ name: 'Valores', data: barChartData.series }],
      xaxis: { categories: barChartData.categories },
      title: { text: 'Gráfico de Barras' },
    }).render();

    new ApexCharts(boxplot, {
      chart: { type: 'boxPlot' },
      series: [{ name: 'Distribuição', data: boxplotData }],
      title: { text: 'Boxplot' },
    }).render();
  }

});

  

