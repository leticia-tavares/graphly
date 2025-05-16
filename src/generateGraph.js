const excludeSelect = document.getElementById('exclude-columns');
const selectedContainer = document.getElementById('selected-columns');
const generateBtn = document.getElementById('generate-graph');

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

// Evento para confirmar e mostrar todos os selecionados corretamente
generateBtn.addEventListener('click', () => {
  alert(`Itens selecionados: ${selectedItems.join(', ') || 'Nenhum item selecionado.'}`);
});

excludeSelect.addEventListener('change', updateSelectedColumns);
window.addEventListener('DOMContentLoaded', renderTags);