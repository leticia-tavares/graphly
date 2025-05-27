document.addEventListener('DOMContentLoaded', async () => {
  const histogram = document.querySelector("#histograma");
  const correlation = document.querySelector("#correlacao");
  const bars = document.querySelector("#barras");
  const boxplot = document.querySelector("#boxplot");

  const selectColumns = document.getElementById("select-columns");
  const selectedContainer = document.getElementById('selected-columns-tags');
  const confirmBtn = document.getElementById('confirm-selection');

  const dataset = await window.electronAPI.loadDataset();

  let selectedItems = [];
  let histogramChartInstance, correlationChartInstance, barsChartInstance, boxplotChartInstance;


  // Verifica se o dataset foi carregado corretamente
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

  // Faz o parsing do CSV e popula o select de colunas
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
        if (histogramChartInstance) histogramChartInstance.destroy();
        if (correlationChartInstance) correlationChartInstance.destroy();
        if (barsChartInstance) barsChartInstance.destroy();
        if (boxplotChartInstance) boxplotChartInstance.destroy();

        handleDataSelection(selectedItems, data);
      });
    },
    error: (err) => {
      console.error('Erro ao fazer parsing do CSV:', err);
    }
  });

  // Adiciona evento de mudança no select de colunas
  function updateSelectedColumns() {
    Array.from(selectColumns.options).forEach(option => {
      if (option.selected && !selectedItems.includes(option.value)) {
        selectedItems.push(option.value);
        option.disabled = true;
      }
    });

    renderTags();
  }

  //  Renderiza as tags de colunas selecionadas
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

  //  Função para lidar com a seleção de dados 
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

  //  Função para renderizar os gráficos usando ApexCharts
  function renderCharts(histogramData, correlacaoData, barChartData, boxplotData) {
    new ApexCharts(histogram, {
      chart: { type: 'bar' },
      series: [{ name: 'Frequência', data: histogramData }],
      title: { text: 'Histogram' },
    }).render();

    new ApexCharts(correlation, {
      chart: { type: 'scatter' },
      series: [{
        name: 'Correlação',
        data: correlacaoData.x.map((x, i) => [x, correlacaoData.y[i]])
      }],
      xaxis: { title: { text: 'X' } },
      yaxis: { title: { text: 'Y' } },
      title: { text: 'Correlation' },
    }).render();

    new ApexCharts(bars, {
      chart: { type: 'bar' },
      series: [{ name: 'Valores', data: barChartData.series }],
      xaxis: { categories: barChartData.categories },
      title: { text: 'Bar Chart' },
    }).render();

    new ApexCharts(boxplot, {
      chart: { type: 'boxPlot' },
      series: [{ name: 'Distribuição', data: boxplotData }],
      title: { text: 'Boxplot' },
    }).render();
  }

});

  