## Graphly

O Graphly é uma aplicação desktop multiplataforma desenvolvida em Node.js + Electron, projetada para transformar dados tabulares em grafos, detectar comunidades (Louvain) e gerar visualizações interativas.
Todo o processamento é feito localmente, sem necessidade de conexão com servidores externos.

### ✨ Funcionalidades
* 📂 Upload de arquivos CSV.
* 📊 Criação de grafos a partir de dados tabulares.
* 🧩 Detecção de comunidades (algoritmo de Louvain).
* 🖼️ Exportação de resultados em CSV e PNG.
* 🖥️ Interface intuitiva construída em HTML, CSS e JavaScript.

### 🏗️ Arquitetura
A aplicação segue uma arquitetura composta por:
* Backend (Node.js): responsável pela integração, execução de scripts e acesso ao sistema de arquivos.
* Frontend (Electron.js): interface gráfica, upload de dados e visualizações.
* Análise (Python): processamento de grafos e detecção de comunidades.

### 📦 Instalação
Clone o repositório:
```
git clone https://github.com/leticia-tavares/graphly.git
cd graphly
```

Instale as dependências Node.js:
```
npm install
```

Execute a aplicação:
```
npm start
```

### ⚠️ Pré-requisitos
Antes de instalar, verifique se possui os seguintes requisitos no seu sistema:
* Node.js (versão recomendada: >= 18.x) → [Download Node.js](https://nodejs.org/en)
* Python (versão suportada: >= 3.11.x)
* npm (instalado junto com o Node.js)

⚠️️ **Importante**: versões diferentes de Python podem causar incompatibilidade. Certifique-se de ter o Python configurado corretamente no PATH.

### 📚 Exemplos de Uso
1. Faça upload de um dataset .csv.
2. Tenha uma visão geral a respeito do seu dataset. 
3. Plot gráficos como histogramas, gráficos de correlação, entre outros.
4. Configure a construção do grafo (limiar, pré-processamento).
5. Execute a detecção de comunidades.
6. Exporte os arquivos com os resultados obtidos.


### 🤝 Contribuição
Contribuições são bem-vindas!
1. Fork o projeto
2. Crie uma branch (git checkout -b feature/nova-funcionalidade)
3. Commit suas alterações (git commit -m 'Adicionei nova funcionalidade')
4. Faça push da branch (git push origin feature/nova-funcionalidade)
5. Abra um Pull Request

⚡ Desenvolvido por Letícia Tavares como Projeto de Graduação do curso de Engenharia Eletrônica e de Computação da Universidade Federal do Rio de Janeiro.
