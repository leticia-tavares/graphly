/* Script to alter the preferred theme in the applicaton */

const themeSelect = document.getElementById('theme');

/* Funcao para salvar na memoria a preferencia do usuario */
function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

/* // Toggle theme on click
themeToggle.addEventListener('click', () => {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    window.electron.setTheme(newTheme);
}); */

themeSelect.addEventListener('change', () => {
    applyTheme(themeSelect.value);
});

document.addEventListener('DOMContentLoaded', () => {
    const savedThemed = localStorage.getItem('theme') || 'system';
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);
});