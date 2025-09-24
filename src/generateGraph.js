document.addEventListener('DOMContentLoaded', async () => {
  const imgGraph = document.getElementById('graph-img');
  const imgLouvain = document.getElementById('louvain-img');

  const excludeSelect = document.getElementById('exclude-columns');

  const barsContainer = document.querySelector("#barras");
  let barsChartInstance;

  // cards
  const totalNodesCard = document.getElementById('total-nodes');
  const totalEdgesCard = document.getElementById('total-edges');
  const avgDegreeCard = document.getElementById('avg-degree');
  const communitiesQtyCard = document.getElementById('communities-qty');
  const commSizeCard = document.getElementById('communities-sizes');
  const modularityCard = document.getElementById('communities-mod');

  // Slider for cosine similarity weight
  const slider = document.getElementById('weight-slider');
  const weightValue = document.getElementById('weight-value');
  weightValue.textContent = slider.value; // Inicializa com o valor do slider

  // input radio study
  const studyInputs = document.querySelectorAll('input[name="study"]');
  const container = document.getElementById('extra-inputs-container'); 

 // Buttons 
  const generateBtn = document.getElementById('generate-graph');
  const updateBtn = document.getElementById('update-dataset');
  const detectCommunityBtn = document.getElementById('detect-community');
  const exportBtn = document.getElementById('export-data');

  const studies = ["original", "pca", "yj", "pca+yj"]; // Array to hold study options
  
  let study = 'pca'; // default study
  let cosSim = 0;    // stores the cossine similarity threshold
  let fullData = []; // Stores all the parsed data from the CSV
  let selectedItems = []; // Array para gerenciar os itens selecionados

  let originalColumns = []; // Original columns from the dataset
  let originalData = []; // Original data from the dataset
  let graphOBJ = {}; // Graph object from Python
  let louvainOBJ = {}; // Louvian object from Python

  const dataset = await window.electronAPI.loadDataset();

  // Check if dataset is loaded
  if (!dataset || !dataset.content) {
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

  // 1) Parse do dataset original e popular select
  // Generate the final dataset content
  Papa.parse(dataset.content, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: (results) => {
      console.log('Resultados completos do PapaParse:', results);
      

      const columns = results.meta.fields;
      originalColumns = [...columns]; // Guarda as colunas originais
      console.log('Numero de colunas:', originalColumns.length);
      originalData = [...results.data]; // Guarda os dados originais

      if (columns.length < 2) {
        console.error('CSV deve ter no mínimo duas colunas.');
        return;
      }

      // Save the original dataset to /data/original_dataset.csv
      createCSVFile(originalData, 'data/original_dataset.csv');

      excludeSelect.innerHTML = ""; // Limpa opções anteriores

      columns.forEach(col => {
        const option = document.createElement("option");
        option.value = col;
        option.textContent = col;
        excludeSelect.appendChild(option);
      });

    },
    error: (err) => {
      console.error('Erro ao fazer parsing do CSV:', err);
    }
  });

  // 2) Lógica de seleção de colunas a excluir
  excludeSelect.addEventListener('change', updateSelectedColumns);
  document.addEventListener('DOMContentLoaded', renderTags);
  
  // 3) Exportar CSV filtrado para /data quando clicar no botão
  updateBtn.addEventListener('click', async () => {
    alert(`Selected: ${selectedItems.join(', ') || 'No columns selected.'}`);

    try {
      const remainingColumns = originalColumns.filter(c => !selectedItems.includes(c));

      if (remainingColumns.length === 0) {
        await window.electronAPI.showDialog({
          type: 'warning',
          buttons: ['OK'],
          title: 'Attention',
          message: 'You deleted all columns. Please select at least a few columns to keep.'
        });
        return;
      }

      // Filtra cada linha mantendo apenas as colunas restantes
      const filteredRows = originalData.map(row => {
        const out = {};
        remainingColumns.forEach(c => { out[c] = row[c]; });
        return out;
      });

     createCSVFile(filteredRows, 'data/filtered_dataset.csv');

    } catch (e) {
      console.error(e);
      await window.electronAPI.showDialog({
        type: 'error',
        buttons: ['OK'],
        title: 'Error saving file',
        message: String(e?.message || e)
      });
    }
  });

  studyInputs.forEach(input => {
    input.addEventListener('change', function() {
      if(this.value == 1 || this.value == 3) {
        // Adiciona os inputs extras apenas se ainda não existem
        if (!container.querySelector('input[name="numOfComp"]')) {
          container.innerHTML = `
            <input type="text" name="numOfComp" placeholder="Number of minimum components" />
            <input type="text" name="minVar" placeholder="Minimum Variance" />
          `;
        }
      } else {
        container.innerHTML = '';
      }
    });
  });

  // Atualiza o valor do peso quando o slider é movido
  slider.addEventListener('input', () => {
    weightValue.textContent = slider.value; // Atualiza o texto com o valor atual do slider
    cosSim = slider.value;
  });


  // registre logs 1x (opcional)
  const offLogs = window.pythonAPI.onLog(({ ch, msg }) => {
    console[ch === 'stderr' ? 'error' : 'log']('[PY]', msg.trim());
  });


  // 4) Gerar grafo quando clicar no botão
  generateBtn.addEventListener('click', async () => {
    let args = getArgsArray(cosSim, study);
    
    if(args.length > 0 ){
      try{
        const res = await window.pythonAPI.run('graph_builder.py', [args]);

        if (res.code !== 0) {
          console.error('Python falhou:', res.stderr);
          return;
        } 
        try {

          imgGraph.src = `../data/grafo.png?${new Date().getTime()}`; // Força reload da imagem
          const data = JSON.parse(res.stdout);   // <-- parse do JSON completo

          graphOBJ = data.graph;  // <-- parse do objeto graph
          louvainOBJ = data.louvain; // <-- parse do objeto louvian

          totalNodesCard.textContent = graphOBJ.nodes || 'N/A';
          totalEdgesCard.textContent = graphOBJ.edges || 'N/A';
          avgDegreeCard.textContent = (graphOBJ.degree).toFixed(2) || 'N/A';

        } catch (e) {
          console.error('Stdout não é JSON válido:', res.stdout, e);
        }


      } catch (e) {
        console.error('Stdout não é JSON válido ou outra falha:', res.stdout, e);
      }
    } else {
        const response = await window.electronAPI.showDialog({
        type: 'info',
        buttons: ['OK'],
        title: 'Warning',
        message: 'Please enter valid numbers.'
      });
      
    }
  });


  // 5) Detectar comunidades quando clicar no botão
  detectCommunityBtn.addEventListener('click', async () => {
      
    destroyCharts(); // Destroi gráficos anteriores, se existirem

    if (!graphOBJ || !graphOBJ.nodes) {
      alert('Please generate the graph first.');
      return;
    }

    study = document.querySelector('input[name="study"]:checked');

    const res = await window.pythonAPI.run('louvain_method.py', [study.value]);
    
    if (res.code !== 0) {
      console.error('Python falhou:', res.stderr);
      return;
    } 

    try {
  
      const data = JSON.parse(res.stdout);   // <-- parse do JSON completo
      louvainOBJ = data.louvain; // <-- parse do objeto louvian

      communitiesQtyCard.textContent = louvainOBJ.communities || 'N/A';
      commSizeCard.textContent = louvainOBJ.sizes || 'N/A';
      modularityCard.textContent = (louvainOBJ.modularity).toFixed(3) || 'N/A';

      imgLouvain.src = `../data/communities_${studies[study.value]}.png?${new Date().getTime()}`; // Força reload da imagem

      renderCommunityChart(fullData);

    } catch (error){
      console.error('Error reading file:', error);
      return;
    }

  });

  // 6) Exportar dados quando clicar no botão
  exportBtn.addEventListener('click', async () => {
    
    // const result = await window.electronAPI.exportFile("filtered_dataset.csv");
    const result = await window.electronAPI.exportData();

    if (result.canceled) {
      alert('Export canceled by user.');
      return;
    }
    
    if (result.error) {
      alert('Error: ' + result.error);
      return;
    }

    alert('All files exported successfully!');
  });

  async function createCSVFile(data, path){
    // Gera CSV filtrado
    const csvOut = Papa.unparse(data);

    // Caminho final: .../data/filtered_dataset.csv
    const outPath = await window.electronAPI.getPath(path);

    // Garante diretório e grava arquivo
    await window.electronAPI.writeFile(outPath, csvOut);
  }

  function updateSelectedColumns() {

    // Verifica opções selecionadas e atualiza o array
    Array.from(excludeSelect.options).forEach(option => {
      if (option.selected && !selectedItems.includes(option.value)) {
        selectedItems.push(option.value);
        option.disabled = true;
      }
    });

    renderTags();
  }

  function renderTags() {
    const selectedContainer = document.getElementById('selected-columns');

    selectedContainer.innerHTML = '';
    
    selectedItems.forEach(value => {
      const tag = document.createElement('div');
      tag.className = 'column-tag';
      tag.dataset.column = value;
      tag.innerHTML = `${value} <button type="button">×</button>`;

      tag.querySelector('button').addEventListener('click', () => {
        selectedItems = selectedItems.filter(item => item !== value);
        const option = Array.from(excludeSelect.options).find(opt => opt.value === value);
        option.disabled = false;
        option.selected = false;
        renderTags();
      });

      selectedContainer.appendChild(tag);
    });
  }
  
  function renderCommunityChart(){
    const categories = Array.from({length: louvainOBJ.communities}, (_, i) => `Community ${i}`);
    const values = categories.map((_, i) => louvainOBJ.sizes[i] || 0);

    barsChartInstance = new ApexCharts(barsContainer, {
      chart: { type: 'bar', height: 350, toolbar: { show: true } },
      title: { text: "Bar Chart: Number of Communities Detected", align: 'center' },
      series: [{ name: "Nodes", data: values }],
      xaxis: { 
          categories: categories,
          title: { text: "Communities" },
          labels: { rotate: -45, rotateAlways: true }
      },
      yaxis: {
          title: { text:"Number of Nodes" }
      }
    });
    barsChartInstance.render();
  }

  /**
   * @brief Destroy all chart instances and clear their containers.
   */
  function destroyCharts() {
        if (barsChartInstance) barsChartInstance.destroy();
        barsContainer.innerHTML = "";
  }

  function getArgsArray(cosSim, study) {
    let args = [];
    study = document.querySelector('input[name="study"]:checked');

    if (study.value == 1 || study.value == 3){ // Se for pca ou pca+yj pega inputs extras{ 
      const numOfCompInput = container.querySelector('input[name="numOfComp"]');
      const minVarInput = container.querySelector('input[name="minVar"]');
      
      const numOfComp = numOfCompInput.value;
      const minVar = minVarInput.value;

      if (!numOfComp || !minVar || numOfComp <= 0 || numOfComp >= (originalColumns.length - 1) || minVar <= 0 || minVar > 100) {
        args = [];

      } else {
        args = [cosSim, study.value, numOfComp, minVar];
      }
    } else {
      args = [cosSim, study.value];
    }
    return args;
  }

});



