// visualization.js (NOVO ARQUIVO)
document.addEventListener('DOMContentLoaded', () => {

    // Dados dummy para exemplo
    const histogramData = [10, 20, 30, 20, 15, 30, 40, 60];
    const correlacaoData = {
      x: [10, 20, 30, 40, 50],
      y: [15, 25, 35, 45, 55]
    };
    const barChartData = {
      categories: ['Janeiro', 'Fevereiro', 'Março', 'Abril'],
      series: [45, 52, 38, 24]
    };
    const boxplotData = [
      { x: 'Dataset A', y: [54, 66, 69, 75, 88] },
      { x: 'Dataset B', y: [43, 65, 67, 78, 84] },
    ];
  
    // Gráfico: Histograma
    new ApexCharts(document.querySelector("#histograma"), {
      chart: { type: 'bar' },
      series: [{ name: 'Frequência', data: histogramData }],
      title: { text: 'Histograma' },
    }).render();
  
    // Gráfico: Correlação (Scatter Plot)
    new ApexCharts(document.querySelector("#correlacao"), {
      chart: { type: 'scatter' },
      series: [{
        name: 'Correlação',
        data: correlacaoData.x.map((x, i) => [x, correlacaoData.y[i]])
      }],
      xaxis: { title: { text: 'X' } },
      yaxis: { title: { text: 'Y' } },
      title: { text: 'Gráfico de Correlação' },
    }).render();
  
    // Gráfico: Barras
    new ApexCharts(document.querySelector("#barras"), {
      chart: { type: 'bar' },
      series: [{ name: 'Valores', data: barChartData.series }],
      xaxis: { categories: barChartData.categories },
      title: { text: 'Gráfico de Barras' },
    }).render();
  
    // Gráfico: Boxplot
    new ApexCharts(document.querySelector("#boxplot"), {
      chart: { type: 'boxPlot' },
      series: [{ name: 'Distribuição', data: boxplotData }],
      title: { text: 'Boxplot' },
    }).render();
  
  });