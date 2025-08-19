document.addEventListener('DOMContentLoaded', async () => {

  const excludeSelect = document.getElementById('exclude-columns');
  const dataset = await window.electronAPI.loadDataset();
  const filePath =  window.electronAPI.getPath('data-temp/comunidades.csv'); // .csv with detceted communities

  let fullData = []; // Stores all the parsed data from the CSV
  let columns = []; // Stores all column names from the CSV
  let communitiesQty = 0; // Stores the number of communities detected

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

  // Generate the final dataset content
  Papa.parse(dataset.content, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: (results) => {
      console.log('Resultados completos do PapaParse:', results);

      const columns = results.meta.fields;

      if (columns.length < 2) {
        console.error('CSV deve ter no mínimo duas colunas.');
        return;
      }

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

  let selectedItems = []; // Array para gerenciar os itens selecionados

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

  const generateBtn = document.getElementById('generate-graph');

  // Evento para confirmar e mostrar todos os selecionados corretamente
  generateBtn.addEventListener('click', () => {
    alert(`Itens selecionados: ${selectedItems.join(', ') || 'Nenhum item selecionado.'}`);
  });

  excludeSelect.addEventListener('change', updateSelectedColumns);
  document.addEventListener('DOMContentLoaded', renderTags);

  // Slider for cosine similarity weight
  const slider = document.getElementById('weight-slider');
  const weightValue = document.getElementById('weight-value');
  
  weightValue.textContent = slider.value; // Inicializa com o valor do slider

  // Atualiza o valor do peso quando o slider é movido
  slider.addEventListener('input', () => {
    weightValue.textContent = slider.value; // Atualiza o texto com o valor atual do slider

  });

  // Função para ler o conteúdo do arquivo
  async function getFileContent(filePath) {
    try {
      const content = await window.electronAPI.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error('Erro ao ler o arquivo:', error);
      throw error;
    }
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
      },
      error: (err) => {
          console.error('Error parsing the CSV:', err);
          alert('Error processing the CSV file. Please check the file format.');
      }
  });
  }

  function renderCommunityChart(data){


  }

  const detectCommunityBtn = document.getElementById('detect-community');
  
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
  });

});

