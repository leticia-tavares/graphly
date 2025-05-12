/* const excludeSelect = document.getElementById('exclude-columns');
const selectedContainer = document.getElementById('selected-columns');

function updateSelectedColumns() {
  //selectedContainer.innerHTML = '';
  Array.from(excludeSelect.selectedOptions).forEach(option => {
    const tag = document.createElement('div');
    tag.className = 'column-tag';
    tag.dataset.column = option.value;
    tag.innerHTML = `${option.value} <button type="button">×</button>`;

    tag.querySelector('button').addEventListener('click', () => {
      option.selected = false;
      updateSelectedColumns();
    });

    selectedContainer.appendChild(tag);
  });
}

excludeSelect.addEventListener('change', updateSelectedColumns);

// Initialize on page load (in case of form resubmission)
window.addEventListener('DOMContentLoaded', updateSelectedColumns); */

const excludeSelect = document.getElementById('exclude-columns');
const selectedContainer = document.getElementById('selected-columns');

function updateSelectedColumns() {
  //selectedContainer.innerHTML = '';

  Array.from(excludeSelect.options).forEach(option => {
    // Remove tags duplicadas
    if (!option.selected) {
      option.disabled = false;
      return;
    }

    // Desabilita a opção para não ser selecionada novamente
    option.disabled = true;

    const tag = document.createElement('div');
    tag.className = 'column-tag';
    tag.dataset.column = option.value;
    tag.innerHTML = `${option.value} <button type="button">×</button>`;

    tag.querySelector('button').addEventListener('click', () => {
      option.selected = false;
      option.disabled = false; // Reabilita a opção
      updateSelectedColumns();
    });

    selectedContainer.appendChild(tag);
  });
}

excludeSelect.addEventListener('change', updateSelectedColumns);
window.addEventListener('DOMContentLoaded', updateSelectedColumns);