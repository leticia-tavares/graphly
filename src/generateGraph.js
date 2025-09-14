document.addEventListener('DOMContentLoaded', async () => {

  const excludeSelect = document.getElementById('exclude-columns');
  const dataset = await window.electronAPI.loadDataset();
  const filePath =  window.electronAPI.getPath('data-temp/comunidades.csv'); // .csv with detceted communities
  const barsContainer = document.querySelector("#barras");

  // cards
  const totalNodesCard = document.getElementById('total-nodes');
  const totalEdgesCard = document.getElementById('total-edges');
  const avgDegreeCard = document.getElementById('avg-degree');
  const lowerLimitCard = document.getElementById('lower-limit');

  // Slider for cosine similarity weight
  const slider = document.getElementById('weight-slider');
  const weightValue = document.getElementById('weight-value');

  let selectedItems = []; // Array para gerenciar os itens selecionados

  const generateBtn = document.getElementById('generate-graph');
  const updateBtn = document.getElementById('update-dataset');
  const detectCommunityBtn = document.getElementById('detect-community');
  const exportBtn = document.getElementById('export-data');
  
  weightValue.textContent = slider.value; // Inicializa com o valor do slider
  
  let cosSim = 0;    // stores the cossine similarity threshold
  let fullData = []; // Stores all the parsed data from the CSV
  let communitiesQty = 0; // Stores the number of communities detected
  let nodesPerCommunity = {}; // Stores nodes per community
  let originalColumns = []; // Original columns from the dataset
  let originalData = []; // Original data from the dataset

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
    alert(`Itens selecionados: ${selectedItems.join(', ') || 'Nenhum item selecionado.'}`);

    try {
      const remainingColumns = originalColumns.filter(c => !selectedItems.includes(c));

      if (remainingColumns.length === 0) {
        await window.electronAPI.showDialog({
          type: 'warning',
          buttons: ['OK'],
          title: 'Atenção',
          message: 'Você excluiu todas as colunas. Selecione menos colunas para excluir.'
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
        title: 'Erro ao salvar CSV',
        message: String(e?.message || e)
      });
    }
  });

  // Atualiza o valor do peso quando o slider é movido
  slider.addEventListener('input', () => {
    weightValue.textContent = slider.value; // Atualiza o texto com o valor atual do slider
    cosSim = slider.value;
  });

  generateBtn.addEventListener('click', async () => {
/*      // 1) Registra ouvintes primeiro
    window.electronAPI.onPythonOutput((data) => {
      console.log('Recebido do Python:', data);
      // trate/parse aqui e atualize a UI
      const jsonObj = JSON.parse(data);

      totalNodesCard.textContent = jsonObj.nodes || 'N/A';
      totalEdgesCard.textContent = jsonObj.edges || 'N/A';
      avgDegreeCard.textContent = jsonObj.degree || 'N/A';
      lowerLimitCard.textContent = jsonObj.limit || 'N/A';
    });

    window.electronAPI.onPythonError((err) => {
      console.error('Erro do Python:', err);
    });

    window.electronAPI.onPythonExit(({ code, signal }) => {
      console.log(`Python finalizado: code=${code} signal=${signal || 'none'}`);
    });

    // 2) Só então inicia
    const result = await window.electronAPI.pyReceive(cosSim);
    console.log(result); // "Python iniciado!" */

    const code = await window.pythonAPI.run('test.py', ['--foo', 'bar']);
    console.log('Python saiu com código:', code);

    // const sendResult = await window.electronAPI.pySend(cosSim);
    // console.log(sendResult); // "Mensagem enviada para o Python."
  });

  detectCommunityBtn.addEventListener('click', async () => {
    console.log('Detecting communities...');
    let csv;
    try {
      csv = await window.electronAPI.readFile(filePath);
      console.log('File read successfully');

    } catch (error){
      console.error('Error reading file:', error);
      return;
    }

    parseCSV(csv);
    renderCommunityChart(fullData);
  });

  exportBtn.addEventListener('click', async () => {
    const result = await window.electronAPI.exportFile("filtered_dataset.csv");

    if (result.canceled) {
      console.log('Export canceled by user.');
      alert("Export canceled by the user.");
    }
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

  function parseCSV(content){
      Papa.parse(content, {
      header: true, 
      dynamicTyping: true, 
      skipEmptyLines: true, 
      complete: (results) => {
          fullData = results.data; 
          columns = results.meta.fields; 

          communitiesQty = Math.max(...fullData.map(row => row['Comunidade'])) + 1;
          console.log('Comunidades detectadas:', communitiesQty); 

          nodesPerCommunity = {};
          fullData.forEach(row => {
              const community = row['Comunidade'];
              if (!nodesPerCommunity[community]) {
                  nodesPerCommunity[community] = 0;
              }
              nodesPerCommunity[community]++;
          });
      },
      error: (err) => {
          console.error('Error parsing the CSV:', err);
          alert('Error processing the CSV file. Please check the file format.');
      }
  });
  }

  function renderCommunityChart(){
    const categories = Array.from({length: communitiesQty}, (_, i) => `Comunidade ${i}`);
    const values = categories.map((_, i) => nodesPerCommunity[i] || 0);

    barsChartInstance = new ApexCharts(barsContainer, {
      chart: { type: 'bar', height: 350, toolbar: { show: true } },
      title: { text: "Bar Chart: Number of Communities detected", align: 'center' },
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

});

