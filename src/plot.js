// make sure the script runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Get all the necessary HTML elements
    const histogramContainer = document.querySelector("#histograma");
    const correlationContainer = document.querySelector("#correlacao");
    const barsContainer = document.querySelector("#barras");
    const boxplotContainer = document.querySelector("#boxplot");

    const columnSelectorDropdown = document.getElementById("select-columns"); 
    const selectedTagsContainer = document.getElementById('selected-columns-tags'); 
    const confirmInitialSelectionBtn = document.getElementById('confirm-initial-selection-btn'); 

    const chartConfigArea = document.getElementById('chart-config-area');
    const histColumnSelect = document.getElementById('hist-column-select');
    const corrXSelect = document.getElementById('corr-x-select');
    const corrYSelect = document.getElementById('corr-y-select');

    const barCatSelect = document.getElementById('bar-cat-select');
    const barValSelect = document.getElementById('bar-val-select');
    const boxplotColumnSelect = document.getElementById('boxplot-column-select');
    const generateAllChartsBtn = document.getElementById('generate-all-charts-btn');

    let fullData = []; // Stores all the parsed data from the CSV
    let allColumnNames = []; // Stores column names from the CSV header
    let selectedColumnItems = []; // Stores all selected columns by the user

    // ApexCharts instances for each chart type
    let histogramChartInstance, correlationChartInstance, barsChartInstance, boxplotChartInstance;

    // Load the dataset from the main process
    const dataset = await window.electronAPI.loadDataset();
    if (!dataset || !dataset.content) {
        await window.electronAPI.showDialog({
            type: 'info', buttons: ['OK'], title: 'Warning',
            message: 'Please, upload a dataset first.',
        });
        window.electronAPI.navigate('index.html');
        return; 
    }

    Papa.parse(dataset.content, {
        header: true, 
        dynamicTyping: true, 
        skipEmptyLines: true, 
        complete: (results) => {
            fullData = results.data; 
            allColumnNames = results.meta.fields; 

            // Populates the dropdown with column names
            columnSelectorDropdown.innerHTML = ""; 
            allColumnNames.forEach(col => {
                const option = document.createElement("option");
                option.value = col;
                option.textContent = col;
                columnSelectorDropdown.appendChild(option);
            });
        },
        error: (err) => {
            console.error('Error parsing the CSV:', err);
            alert('Error processing the CSV file. Please check the file format.');
        }
    });

    // Initial selection of columns
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
    });

    // Render selected tags in the container
    function renderTags() {
        selectedTagsContainer.innerHTML = ''; 
        selectedColumnItems.forEach(value => {
            const tag = document.createElement('div');
            tag.className = 'column-tag';
            tag.innerHTML = `${value} <button type="button" data-value="${value}">×</button>`;
            selectedTagsContainer.appendChild(tag);
        });
    }

    // Tag event listener to remove selected columns from the list
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
        }
    });
    
    // Add event listener to the confirmation button
    confirmInitialSelectionBtn.addEventListener('click', () => {
        if (selectedColumnItems.length === 0) {
            alert("Select at least one column.");
            return;
        }

        // Populate the configuration selects with the selected columns
        populateConfigSelect(histColumnSelect, selectedColumnItems);
        populateConfigSelect(corrXSelect, selectedColumnItems);
        populateConfigSelect(corrYSelect, selectedColumnItems);
        populateConfigSelect(barCatSelect, selectedColumnItems);
        populateConfigSelect(barValSelect, selectedColumnItems);
        populateConfigSelect(boxplotColumnSelect, selectedColumnItems, true); 

        chartConfigArea.style.display = 'block'; 
    });

    /**
     * @brief Populates a select element with given items.
     * @param {HTMLSelectElement} selectElement - The select element to populate.
     * @param {Array} items - The items to populate the select with.
     * @param {boolean} isMultiple - Whether the select allows multiple selections.
     */
    function populateConfigSelect(selectElement, items, isMultiple = false) {
        selectElement.innerHTML = ""; 
        if (!isMultiple) { 
            const emptyOpt = document.createElement('option');
            emptyOpt.value = "";
            emptyOpt.textContent = "Select...";
            selectElement.appendChild(emptyOpt);
        }
        items.forEach(item => {
            const option = document.createElement("option");
            option.value = item;
            option.textContent = item;
            selectElement.appendChild(option);
        });
        console.log(`Select '${selectElement.id}' populated with ${items.length} items.`);
    }

    // Event listener to handle the "Generate Plots" button click
    generateAllChartsBtn.addEventListener('click', () => {
        const chartConfig = {
            histogramCol: histColumnSelect.value,
            correlationXCol: corrXSelect.value,
            correlationYCol: corrYSelect.value,
            barCategoryCol: barCatSelect.value,
            barValueCol: barValSelect.value,
            boxplotCols: Array.from(boxplotColumnSelect.selectedOptions).map(opt => opt.value)
        };

        // Basic validations before generating the charts
        if (chartConfig.correlationXCol && chartConfig.correlationYCol && chartConfig.correlationXCol === chartConfig.correlationYCol) {
            alert("For the correlation chart, the columns for X-axis and Y-axis must be different.");
            return;
        }
        if (chartConfig.barCategoryCol && chartConfig.barValueCol && chartConfig.barCategoryCol === chartConfig.barValueCol) {
            alert("For the bar chart, the Category and Value columns must be different.");
            return;
        }

        destroyCharts();
        handleAndRenderCharts(chartConfig, fullData);
    });

    /**
     * @brief Destroy all chart instances and clear their containers.
     */
    function destroyCharts() {
        if (histogramChartInstance) histogramChartInstance.destroy();
        if (correlationChartInstance) correlationChartInstance.destroy();
        if (barsChartInstance) barsChartInstance.destroy();
        if (boxplotChartInstance) boxplotChartInstance.destroy();
        
        histogramContainer.innerHTML = "";
        correlationContainer.innerHTML = "";
        barsContainer.innerHTML = "";
        boxplotContainer.innerHTML = "";
    }

    /**
     * This function handles the rendering of all charts based on the provided configuration and data.
     * @param {Object} config - The configuration object containing selected columns for each chart type.
     * @param {Array} data - The dataset to be used for rendering the charts.
     * @description It processes the data for each chart type, creates the necessary ApexCharts instances,
     */
    function handleAndRenderCharts(config, data) {

       // --- 1. HISTOGRAM (optimized generation) ---
        if (config.histogramCol) {
            const histDataRaw = data
                .map(row => row[config.histogramCol])
                .filter(val => typeof val === 'number' && !isNaN(val));

            if (histDataRaw.length > 0) {
                const bins = Math.round(Math.sqrt(histDataRaw.length));
                const minVal = Math.min(...histDataRaw);
                const maxVal = Math.max(...histDataRaw);
                const binSize = (maxVal - minVal) / bins;

                const histogramData = Array(bins).fill(0);
                const categories = Array(bins).fill(0).map((_, i) => (minVal + i * binSize).toFixed(2));

                histDataRaw.forEach(val => {
                    const binIndex = Math.min(
                        bins - 1,
                        Math.floor((val - minVal) / binSize)
                    );
                    histogramData[binIndex]++;
                });

                histogramChartInstance = new ApexCharts(histogramContainer, {
                    chart: { type: 'bar', height: 350, toolbar: { show: true } },
                    title: { text: `Histogram: ${config.histogramCol}`, align: 'left' },
                    series: [{ name: 'Frequency', data: histogramData }],
                    xaxis: {
                        categories,
                        title: { text: config.histogramCol },
                        labels: { rotate: -45, rotateAlways: true }
                    },
                    yaxis: {
                        title: { text: 'Count' }
                    }
                });
                histogramChartInstance.render();
            } else {
                histogramContainer.innerHTML = "<p>No valid numeric data found for the histogram.</p>";
            }
        } else {
            histogramContainer.innerHTML = "<p>Select a column for the histogram.</p>";
        }

        // --- 2. CORRELATION CHART (Scatter Plot) ---
        if (config.correlationXCol && config.correlationYCol) {
            const xData = data.map(row => row[config.correlationXCol]);
            const yData = data.map(row => row[config.correlationYCol]);
            
            // Modified: Now stores the original row index (Row ID)
            const correlationSeriesData = xData.map((x, i) => ({ 
                                            x: x, 
                                            y: yData[i], 
                                            originalIndex: i + 1 // +1 to be 1-based, like a row number
                                        })) 
                                         .filter(point => typeof point.x === 'number' && !isNaN(point.x) && 
                                                          typeof point.y === 'number' && !isNaN(point.y));

            if (correlationSeriesData.length > 0) {
                correlationChartInstance = new ApexCharts(correlationContainer, {
                    chart: { type: 'scatter', height: 350, zoom: { enabled: true, type: 'xy'}, toolbar: { show: true } },
                    title: { text: `Correlation: ${config.correlationXCol} vs ${config.correlationYCol}`, align: 'left' },
                    series: [{ name: 'Points', data: correlationSeriesData.map(p => [p.x, p.y]) }], 
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
                            // NEW: Adds the Row ID (original index)
                            if (pointData.originalIndex !== undefined && pointData.originalIndex !== null) {
                                tooltipHtml += `<br><span>Row ID: ${pointData.originalIndex}</span>`;
                            }
                            tooltipHtml += `</div>`;
                            return tooltipHtml;
                        }
                    }
                });
                correlationChartInstance.render();
                console.log("Correlation Chart rendered for:", config.correlationXCol, config.correlationYCol);
            } else {
                 correlationContainer.innerHTML = "<p>Insufficient or non-numeric data for the correlation chart with the selected columns.</p>";
            }
        } else {
            correlationContainer.innerHTML = "<p>Select X and Y columns for the correlation chart.</p>";
        }

        // --- 3. BAR CHART ---
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
                    title: { text: `Bar Chart: Sum of ${config.barValueCol} by ${config.barCategoryCol}`, align: 'left' },
                    series: [{ name: config.barValueCol, data: Object.values(aggregatedData) }],
                    xaxis: { 
                        categories: Object.keys(aggregatedData),
                        title: { text: config.barCategoryCol },
                        labels: { rotate: -45, rotateAlways: true }
                    },
                    yaxis: {
                        title: { text: `Sum of ${config.barValueCol}` }
                    }
                });
                barsChartInstance.render();
            } else {
                barsContainer.innerHTML = "<p>Insufficient or inappropriate data for the bar chart with the selected columns (check if the value column is numeric for aggregation).</p>";
            }
        } else {
            barsContainer.innerHTML = "<p>Select Category and Value columns for the bar chart.</p>";
        }

        // --- 4. BOXPLOT ---
        if (config.boxplotCols && config.boxplotCols.length > 0) {
            const boxplotSeriesData = config.boxplotCols
                .map(colName => {
                    const numericValues = data
                        .map(row => row[colName])
                        .filter(val => typeof val === 'number' && !isNaN(val));

                    if (numericValues.length === 0) return null;

                    numericValues.sort((a, b) => a - b);

                    const quartile = (arr, q) => {
                        const pos = ((arr.length - 1) * q);
                        const base = Math.floor(pos);
                        const rest = pos - base;
                        if ((arr[base + 1] !== undefined)) {
                            return arr[base] + rest * (arr[base + 1] - arr[base]);
                        } else {
                            return arr[base];
                        }
                    };

                    const q1 = quartile(numericValues, 0.25);
                    const median = quartile(numericValues, 0.5);
                    const q3 = quartile(numericValues, 0.75);
                    const min = numericValues[0];
                    const max = numericValues[numericValues.length - 1];

                    return {
                        x: colName,
                        y: [min, q1, median, q3, max]
                    };
                })
                .filter(series => series !== null);

            if (boxplotSeriesData.length > 0) {
                boxplotChartInstance = new ApexCharts(boxplotContainer, {
                    chart: { type: 'boxPlot', height: 350, toolbar: { show: true } },
                    title: { text: 'Boxplot of Selected Columns', align: 'left' },
                    series: [{ name: 'Distribution', data: boxplotSeriesData }],
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
                        title: { text: 'Columns' }
                    },
                    yaxis: {
                        title: { text: 'Values' }
                    }
                });
                boxplotChartInstance.render();
            } else {
                boxplotContainer.innerHTML = "<p>None of the selected columns for the boxplot contain valid numeric data.</p>";
            }
        } else {
            boxplotContainer.innerHTML = "<p>Select one or more columns for the boxplot.</p>";
        }
    }
});        
