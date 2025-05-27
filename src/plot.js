
// Garante que o script só execute depois que todo o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
    // --- Seletores de elementos DOM (ajustados para corresponder ao seu HTML) ---
    const histogramContainer = document.querySelector("#histograma");
    const correlationContainer = document.querySelector("#correlacao");
    const barsContainer = document.querySelector("#barras");
    const boxplotContainer = document.querySelector("#boxplot");

    const columnSelectorDropdown = document.getElementById("select-columns"); // ID do seu HTML
    const selectedTagsContainer = document.getElementById('selected-columns-tags'); // ID do seu HTML
    const confirmInitialSelectionBtn = document.getElementById('confirm-initial-selection-btn'); // ID do seu HTML

    const chartConfigArea = document.getElementById('chart-config-area');
    const histColumnSelect = document.getElementById('hist-column-select');
    const corrXSelect = document.getElementById('corr-x-select');
    const corrYSelect = document.getElementById('corr-y-select');

    const barCatSelect = document.getElementById('bar-cat-select');
    const barValSelect = document.getElementById('bar-val-select');
    const boxplotColumnSelect = document.getElementById('boxplot-column-select');
    const generateAllChartsBtn = document.getElementById('generate-all-charts-btn');

    let fullData = []; // Armazena os dados completos do CSV após o parsing
    let allColumnNames = []; // Armazena todos os nomes das colunas do CSV
    let selectedColumnItems = []; // Armazena as colunas selecionadas inicialmente pelo usuário

    // Instâncias dos gráficos ApexCharts para permitir a destruição e recriação
    let histogramChartInstance, correlationChartInstance, barsChartInstance, boxplotChartInstance;

    // --- CARREGAMENTO INICIAL DO DATASET ---
    try {
        console.log("Tentando carregar dataset...");
        const dataset = await window.electronAPI.loadDataset();
        if (!dataset || !dataset.content) {
            console.warn("Dataset não carregado ou vazio. Exibindo aviso.");
            await window.electronAPI.showDialog({
                type: 'info', buttons: ['OK'], title: 'Aviso',
                message: 'Por favor, carregue seu dataset primeiro.'
            });
            window.electronAPI.navigate('index.html');
            return; 
        }
        console.log("Dataset carregado com sucesso. Conteúdo:", dataset.content.substring(0, 100) + "..."); // Log parcial do conteúdo

        Papa.parse(dataset.content, {
            header: true, 
            dynamicTyping: true, 
            skipEmptyLines: true, 
            complete: (results) => {
                fullData = results.data; 
                allColumnNames = results.meta.fields; 
                console.log("CSV parseado. Colunas:", allColumnNames);
                console.log("Primeiras 5 linhas dos dados:", fullData.slice(0, 5));

                // Popula o dropdown inicial de seleção de colunas
                columnSelectorDropdown.innerHTML = ""; 
                allColumnNames.forEach(col => {
                    const option = document.createElement("option");
                    option.value = col;
                    option.textContent = col;
                    columnSelectorDropdown.appendChild(option);
                });
                console.log("Dropdown inicial populado.");
            },
            error: (err) => {
                console.error('Erro ao fazer parsing do CSV:', err);
                alert('Erro ao processar o arquivo CSV. Verifique o console.');
            }
        });
    } catch (error) {
        console.error("Erro ao carregar dataset via Electron API:", error);
        alert("Não foi possível carregar o dataset.");
        return; 
    }

    // --- LÓGICA DE SELEÇÃO INICIAL DE COLUNAS (Dropdown e Tags) ---
    columnSelectorDropdown.addEventListener('change', (event) => {
        const selectedValue = event.target.value;
        const selectedOption = event.target.options[event.target.selectedIndex];

        if (selectedValue && !selectedColumnItems.includes(selectedValue)) {
            selectedColumnItems.push(selectedValue);
            selectedOption.disabled = true; 
            selectedOption.classList.add('selected-option'); 
            columnSelectorDropdown.value = ""; 
        }
        
        renderTags(); 
        console.log("Colunas selecionadas:", selectedColumnItems);
    });

    // Função para renderizar as tags das colunas selecionadas
    function renderTags() {
        selectedTagsContainer.innerHTML = ''; 
        selectedColumnItems.forEach(value => {
            const tag = document.createElement('div');
            tag.className = 'column-tag';
            tag.innerHTML = `${value} <button type="button" data-value="${value}">×</button>`;
            selectedTagsContainer.appendChild(tag);
        });
    }

    // Adiciona um listener de evento para o contêiner das tags
    selectedTagsContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON' && event.target.closest('.column-tag')) {
            const valueToRemove = event.target.dataset.value; 
            selectedColumnItems = selectedColumnItems.filter(item => item !== valueToRemove);
            
            const optionToEnable = Array.from(columnSelectorDropdown.options).find(opt => opt.value === valueToRemove);
            if (optionToEnable) {
                optionToEnable.disabled = false; 
                optionToEnable.classList.remove('selected-option'); 
                optionToEnable.selected = false; 
            }
            renderTags(); 
            console.log("Colunas selecionadas após remoção:", selectedColumnItems);
        }
    });
    
    // --- BOTÃO "CONFIGURAR GRÁFICOS" ---
    confirmInitialSelectionBtn.addEventListener('click', () => {
        if (selectedColumnItems.length === 0) {
            alert("Selecione pelo menos uma coluna para configurar os gráficos.");
            return;
        }
        console.log("Confirmar seleção inicial clicado. Populando selects de configuração.");

        // Popula os selects na área de configuração de gráficos com as colunas selecionadas
        populateConfigSelect(histColumnSelect, selectedColumnItems);
        populateConfigSelect(corrXSelect, selectedColumnItems);
        populateConfigSelect(corrYSelect, selectedColumnItems);
        // Removido: populateConfigSelect(corrTooltipSelect, selectedColumnItems); // Não é mais necessário
        populateConfigSelect(barCatSelect, selectedColumnItems);
        populateConfigSelect(barValSelect, selectedColumnItems);
        populateConfigSelect(boxplotColumnSelect, selectedColumnItems, true); 

        chartConfigArea.style.display = 'block'; 
    });

    // Função auxiliar para popular um elemento <select>
    function populateConfigSelect(selectElement, items, isMultiple = false) {
        selectElement.innerHTML = ""; 
        if (!isMultiple) { 
            const emptyOpt = document.createElement('option');
            emptyOpt.value = "";
            emptyOpt.textContent = "Selecione...";
            selectElement.appendChild(emptyOpt);
        }
        items.forEach(item => {
            const option = document.createElement("option");
            option.value = item;
            option.textContent = item;
            selectElement.appendChild(option);
        });
        console.log(`Select '${selectElement.id}' populado com ${items.length} itens.`);
    }

    // --- BOTÃO "GERAR GRÁFICOS" ---
    generateAllChartsBtn.addEventListener('click', () => {
        console.log("Gerar Gráficos clicado.");
        const chartConfig = {
            histogramCol: histColumnSelect.value,
            correlationXCol: corrXSelect.value,
            correlationYCol: corrYSelect.value,
            barCategoryCol: barCatSelect.value,
            barValueCol: barValSelect.value,
            boxplotCols: Array.from(boxplotColumnSelect.selectedOptions).map(opt => opt.value)
        };
        console.log("Configuração dos gráficos:", chartConfig);

        // Validações básicas antes de gerar os gráficos
        if (chartConfig.correlationXCol && chartConfig.correlationYCol && chartConfig.correlationXCol === chartConfig.correlationYCol) {
            alert("Para o gráfico de correlação, as colunas para Eixo X e Eixo Y devem ser diferentes.");
            return;
        }
        if (chartConfig.barCategoryCol && chartConfig.barValueCol && chartConfig.barCategoryCol === chartConfig.barValueCol) {
            alert("Para o gráfico de barras, as colunas de Categoria e Valor devem ser diferentes.");
            return;
        }

        destroyCharts();
        handleAndRenderCharts(chartConfig, fullData);
    });

    // Função para destruir todas as instâncias de gráficos existentes
    function destroyCharts() {
        console.log("Destruindo gráficos anteriores...");
        if (histogramChartInstance) histogramChartInstance.destroy();
        if (correlationChartInstance) correlationChartInstance.destroy();
        if (barsChartInstance) barsChartInstance.destroy();
        if (boxplotChartInstance) boxplotChartInstance.destroy();
        
        histogramContainer.innerHTML = "";
        correlationContainer.innerHTML = "";
        barsContainer.innerHTML = "";
        boxplotContainer.innerHTML = "";
    }

    // Função principal para preparar dados e renderizar os gráficos
    function handleAndRenderCharts(config, data) {
        console.log("Preparando e renderizando gráficos...");
        // --- 1. HISTOGRAMA (usando gráfico de barras para frequências) ---
        if (config.histogramCol) {
            const histDataRaw = data.map(row => row[config.histogramCol]).filter(val => val !== null && val !== undefined);
            const freqCounts = histDataRaw.reduce((acc, val) => {
                acc[val] = (acc[val] || 0) + 1;
                return acc;
            }, {});
            
            if (Object.keys(freqCounts).length > 0) {
                histogramChartInstance = new ApexCharts(histogramContainer, {
                    chart: { type: 'bar', height: 350, toolbar: { show: true } },
                    title: { text: `Histograma de Frequência: ${config.histogramCol}`, align: 'left' },
                    series: [{ name: 'Frequência', data: Object.values(freqCounts) }],
                    xaxis: { 
                        categories: Object.keys(freqCounts),
                        title: { text: config.histogramCol },
                        labels: { rotate: -45, rotateAlways: true } 
                    },
                    yaxis: {
                        title: { text: 'Contagem' }
                    }
                });
                histogramChartInstance.render();
                console.log("Histograma renderizado para:", config.histogramCol);
            } else {
                histogramContainer.innerHTML = "<p>Nenhum dado válido encontrado para o histograma com a coluna selecionada.</p>";
                console.warn("Nenhum dado para histograma.");
            }
        } else {
            histogramContainer.innerHTML = "<p>Selecione uma coluna para o histograma.</p>";
        }

        // --- 2. GRÁFICO DE CORRELAÇÃO (Scatter Plot) ---
        if (config.correlationXCol && config.correlationYCol) {
            const xData = data.map(row => row[config.correlationXCol]);
            const yData = data.map(row => row[config.correlationYCol]);
            
            // Alterado: Agora armazena o índice original da linha (ID da Linha)
            const correlationSeriesData = xData.map((x, i) => ({ 
                                            x: x, 
                                            y: yData[i], 
                                            originalIndex: i + 1 // +1 para ser baseado em 1, como um número de linha
                                        })) 
                                         .filter(point => typeof point.x === 'number' && !isNaN(point.x) && 
                                                          typeof point.y === 'number' && !isNaN(point.y));

            if (correlationSeriesData.length > 0) {
                correlationChartInstance = new ApexCharts(correlationContainer, {
                    chart: { type: 'scatter', height: 350, zoom: { enabled: true, type: 'xy'}, toolbar: { show: true } },
                    title: { text: `Correlação: ${config.correlationXCol} vs ${config.correlationYCol}`, align: 'left' },
                    series: [{ name: 'Pontos', data: correlationSeriesData.map(p => [p.x, p.y]) }], 
                    xaxis: { 
                        title: { text: config.correlationXCol }, 
                        tickAmount: 10, 
                        labels: { formatter: (val) => typeof val === 'number' ? val.toFixed(2) : val }
                    },
                    yaxis: { 
                        title: { text: config.correlationYCol }, 
                        labels: { formatter: (val) => typeof val === 'number' ? val.toFixed(2) : val }
                    },
                    tooltip: {
                        custom: function({series, seriesIndex, dataPointIndex, w}) {
                            const pointData = correlationSeriesData[dataPointIndex]; 
                            let tooltipHtml = `<div class="apexcharts-tooltip-box">
                                                <span>${config.correlationXCol}: ${typeof pointData.x === 'number' ? pointData.x.toFixed(2) : pointData.x}</span><br>
                                                <span>${config.correlationYCol}: ${typeof pointData.y === 'number' ? pointData.y.toFixed(2) : pointData.y}</span>`;
                            // NOVO: Adiciona o ID da linha (índice original)
                            if (pointData.originalIndex !== undefined && pointData.originalIndex !== null) {
                                tooltipHtml += `<br><span>ID da Linha: ${pointData.originalIndex}</span>`;
                            }
                            tooltipHtml += `</div>`;
                            return tooltipHtml;
                        }
                    }
                });
                correlationChartInstance.render();
                console.log("Gráfico de Correlação renderizado para:", config.correlationXCol, config.correlationYCol);
            } else {
                 correlationContainer.innerHTML = "<p>Dados insuficientes ou não numéricos para o gráfico de correlação com as colunas selecionadas.</p>";
                 console.warn("Nenhum dado para correlação.");
            }
        } else {
            correlationContainer.innerHTML = "<p>Selecione colunas X e Y para o gráfico de correlação.</p>";
        }

        // --- 3. GRÁFICO DE BARRAS ---
        if (config.barCategoryCol && config.barValueCol) {
            const aggregatedData = data.reduce((acc, row) => {
                const category = row[config.barCategoryCol];
                const value = parseFloat(row[config.barValueCol]); 
                if (category !== null && category !== undefined && !isNaN(value)) {
                    acc[category] = (acc[category] || 0) + value;
                }
                return acc;
            }, {});

            if (Object.keys(aggregatedData).length > 0) {
                barsChartInstance = new ApexCharts(barsContainer, {
                    chart: { type: 'bar', height: 350, toolbar: { show: true } },
                    title: { text: `Gráfico de Barras: Soma de ${config.barValueCol} por ${config.barCategoryCol}`, align: 'left' },
                    series: [{ name: config.barValueCol, data: Object.values(aggregatedData) }],
                    xaxis: { 
                        categories: Object.keys(aggregatedData),
                        title: { text: config.barCategoryCol },
                        labels: { rotate: -45, rotateAlways: true }
                    },
                    yaxis: {
                        title: { text: `Soma de ${config.barValueCol}` }
                    }
                });
                barsChartInstance.render();
                console.log("Gráfico de Barras renderizado para:", config.barCategoryCol, config.barValueCol);
            } else {
                barsContainer.innerHTML = "<p>Dados insuficientes ou não apropriados para o gráfico de barras com as colunas selecionadas (verifique se a coluna de valor é numérica para agregação).</p>";
                console.warn("Nenhum dado para gráfico de barras.");
            }
        } else {
            barsContainer.innerHTML = "<p>Selecione colunas de Categoria e Valor para o gráfico de barras.</p>";
        }
        
        // --- 4. BOXPLOT ---
        if (config.boxplotCols && config.boxplotCols.length > 0) {
            const boxplotSeriesData = config.boxplotCols.map(colName => {
                return {
                    x: colName, 
                    y: data.map(row => row[colName]).filter(val => typeof val === 'number' && !isNaN(val)) 
                };
            }).filter(series => series.y.length > 0); 

            if (boxplotSeriesData.length > 0) {
                boxplotChartInstance = new ApexCharts(boxplotContainer, {
                    chart: { type: 'boxPlot', height: 350, toolbar: { show: true } },
                    title: { text: 'Boxplot das Colunas Selecionadas', align: 'left' },
                    series: [{ name: 'Distribuição', data: boxplotSeriesData }],
                    plotOptions: { 
                        boxPlot: { 
                            colors: { 
                                upper: '#5C4742', 
                                lower: '#A5978B'  
                            }
                        }
                    },
                    xaxis: {
                        type: 'category', 
                        title: { text: 'Colunas' }
                    },
                    yaxis: {
                        title: { text: 'Valores' }
                    }
                });
                boxplotChartInstance.render();
                console.log("Boxplot renderizado para:", config.boxplotCols);
            } else {
                boxplotContainer.innerHTML = "<p>Nenhuma das colunas selecionadas para o boxplot contém dados numéricos válidos.</p>";
                console.warn("Nenhum dado para boxplot.");
            }
        } else {
            boxplotContainer.innerHTML = "<p>Selecione uma ou mais colunas para o boxplot.</p>";
        }
    }
});
