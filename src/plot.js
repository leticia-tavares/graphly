document.addEventListener('DOMContentLoaded', async () => {
  const histogram = document.querySelector("#histograma");
  const correlation = document.querySelector("#correlacao");
  const bars = document.querySelector("#barras");
  const boxplot = document.querySelector("#boxplot");

  const dataset = await window.electronAPI.loadDataset();

  if (!dataset || !dataset.content) {
    //alert("Dataset não carregado! Você precisa selecionar um dataset primeiro.");
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

  Papa.parse(dataset.content, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: (results) => {
      console.log('Resultados completos do PapaParse:', results);

      const data = results.data;
      const columns = results.meta.fields;

      if (columns.length < 2) {
        console.error('CSV deve ter no mínimo duas colunas.');
        return;
      }

      const histogramData = data.map(row => row[columns[0]]);
      const correlacaoData = {
        x: data.map(row => row[columns[0]]),
        y: data.map(row => row[columns[1]])
      };
      const barChartData = {
        categories: data.slice(0, 4).map(row => row[columns[0]]),
        series: data.slice(0, 4).map(row => row[columns[1]])
      };
      const boxplotData = [
        { x: columns[0], y: data.map(row => row[columns[0]]) },
        { x: columns[1], y: data.map(row => row[columns[1]]) }
      ];

      console.log("Dados preparados para gráficos:", {
        histogramData,
        correlacaoData,
        barChartData,
        boxplotData
      });

      renderCharts(histogramData, correlacaoData, barChartData, boxplotData);
    },
    error: (err) => {
      console.error('Erro ao fazer parsing do CSV:', err);
    }
  });

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
