# PRD — Graphly
> **Product Requirements Document** · v1.1.0  

---

## 1. Overview

**Graphly** is a cross-platform desktop application that transforms tabular data into graphs, detects communities (Louvain algorithm), and generates interactive visualizations — all locally, with no dependency on external servers.

The project was developed as an undergraduate thesis and its source code is available at: [github.com/leticia-tavares/graphly](https://github.com/leticia-tavares/graphly).

---

## 2. Problem & Motivation

Complex network analysis tools typically require advanced programming knowledge or depend on proprietary software. Graphly addresses this by providing an accessible graphical interface that allows any user — without deep technical expertise — to apply data science techniques such as similarity-based graph construction and community detection.

---

## 3. Product Goals

| # | Goal |
|---|------|
| 1 | Allow CSV file upload and validation |
| 2 | Display descriptive statistics and a tabular preview of the dataset |
| 3 | Generate interactive chart visualizations (histogram, scatter, bar chart, boxplot) |
| 4 | Build graphs from tabular data using cosine similarity |
| 5 | Apply preprocessing (PCA and/or Yeo-Johnson) before graph construction |
| 6 | Run community detection using the Louvain algorithm |
| 7 | Export all generated artifacts (CSV and PNG) |
| 8 | Run on the three major operating systems: Windows, Linux, and macOS |

---

## 4. Target Users

- Researchers and students in data science, statistics, or engineering
- Analysts working with tabular data who want to explore relationships between records
- Users without deep programming knowledge who want to apply network analysis

---

## 5. Tech Stack

### 5.1 Frontend / Desktop
| Technology | Version | Role |
|---|---|---|
| Electron.js | ^34.2.0 | Cross-platform desktop framework |
| HTML5 / CSS3 / JavaScript | — | User interface |
| ApexCharts | ^4.5.0 | Interactive charts |
| Grid.js | ^6.2.0 | Data tables |
| PapaParse | ^5.5.2 | CSV parsing in the frontend |

### 5.2 Backend (Main Process)
| Technology | Version | Role |
|---|---|---|
| Node.js | >= 18.x | Main process runtime |
| Electron IPC | — | main ↔ renderer communication |
| child_process (spawn) | native | Python script execution |

### 5.3 Analysis Layer (Python)
| Library | Min Version | Role |
|---|---|---|
| Python | >= 3.11 | Analysis script runtime |
| pandas | >= 2.2 | Data manipulation |
| numpy | >= 1.26 | Numerical operations |
| scikit-learn | >= 1.5 | PCA, cosine similarity, PowerTransformer |
| networkx | >= 3.3 | Graph creation and analysis |
| matplotlib | >= 3.8 | Graph image generation |
| python-louvain | >= 0.16 | Community detection (Louvain) |

---

## 6. System Architecture

The application follows a three-layer architecture:

```
┌─────────────────────────────────────────────────────────┐
│              Renderer Process (Electron)                 │
│  HTML + CSS + JS · ApexCharts · Grid.js · PapaParse     │
└────────────────────────┬────────────────────────────────┘
                         │  IPC (ipcMain / ipcRenderer)
                         │  via preload.js (contextBridge)
┌────────────────────────▼────────────────────────────────┐
│              Main Process (Node.js)                      │
│  main.js · bootstrap-python.js · utils.js               │
│  Window management, file I/O, dialogs, Python venv       │
└────────────────────────┬────────────────────────────────┘
                         │  child_process.spawn (stdout JSON)
┌────────────────────────▼────────────────────────────────┐
│              Analysis Layer (Python)                     │
│  graph_builder.py · louvain_method.py · ensure_deps.py  │
│  pandas · numpy · networkx · sklearn · matplotlib        │
└─────────────────────────────────────────────────────────┘
```

**Main data flow:**
1. Renderer sends an IPC event to the Main Process
2. Main Process calls `spawn()` on a Python script, passing parameters via `sys.argv`
3. Python script processes the data and returns the result as JSON via `stdout`
4. Main Process forwards the JSON to the Renderer via IPC
5. Renderer updates the UI with the received data

---

## 7. File Structure

```
graphly/
├── main.js                   # Electron main process
├── preload.js                # Secure bridge between main and renderer
├── bootstrap-python.js       # Locates Python, creates venv, installs dependencies
├── ensure_deps.py            # Ensures Python dependencies at runtime
├── utils.js                  # Filesystem utilities
├── requirements.txt          # Python dependencies
├── package.json
│
├── renderer/
│   ├── index.html            # Page: Home (upload)
│   ├── overview.html         # Page: Dataset overview
│   ├── visualization.html    # Page: Chart creation
│   ├── graphs.html           # Page: Graph generation and community detection
│   ├── style.css             # Global styles
│   └── renderer.js           # Navigation logic
│
├── src/
│   ├── showData.js           # Overview page logic
│   ├── plot.js               # Visualization page logic
│   └── generateGraph.js      # Graphs page logic
│
├── python/
│   ├── graph_builder.py      # Graph construction (PCA, YJ, cosine similarity)
│   └── louvain_method.py     # Community detection + centrality metrics
│
├── assets/                   # Icons, logos, fonts
├── wheels/                   # Python wheels for offline installation
└── data/                     # Runtime-generated artifacts (cleared on exit)
```

---

## 8. Features by Page

### 8.1 Home (`index.html`)
- `.csv` file upload via native OS dialog
- File extension validation (`.csv` only)
- Automatic redirect to Overview after a successful upload

### 8.2 Overview (`overview.html`)
- Summary cards: number of rows, number of columns, file size, % missing values
- Tabular preview of the first 10 records via Grid.js
- Per-column summary table: type, unique values, missing values, mean, min, max

### 8.3 Visualization (`visualization.html`)
- Column selection for analysis (interactive tags with removal)
- Individual configuration for 4 chart types:
  - **Histogram**: frequency distribution of a numeric column
  - **Scatter Plot**: correlation between two columns (with Row ID in tooltip)
  - **Bar Chart**: sum of numeric values grouped by a category column
  - **Boxplot**: statistical distribution of multiple columns (Q1, median, Q3, min, max)
- Rendered via ApexCharts (interactive, exportable as image)

### 8.4 Graphs (`graphs.html`)
**Graph Construction:**
- Column exclusion before graph generation (multi-select with tags)
- Cosine similarity threshold slider (0–1, step 0.01)
- Preprocessing selection:
  - None (raw data)
  - PCA (with sliders for minimum number of components and minimum variance %)
  - Yeo-Johnson (normalization toward a normal distribution)
  - PCA + Yeo-Johnson
- Result cards: nodes, edges, average degree
- Image display of the generated graph

**Community Detection:**
- Runs the Louvain algorithm on the generated graph
- Result cards: number of communities, sizes, modularity
- Graph image colored by community
- Bar chart showing node distribution per community

**Export:**
- Exports all files from `/data` to a user-selected directory
- Generated artifacts:
  - `graph.gpickle` — serialized graph (NetworkX)
  - `sim_matrix_*.csv` — filtered similarity matrix
  - `graph.png` — graph image
  - `communities_*.csv` — nodes with community labels and centrality metrics
  - `communities_*.png` — graph image colored by community
  - `original_dataset.csv` / `filtered_dataset.csv` — datasets for reproducibility

---

## 9. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR01 | The system must only accept `.csv` file uploads |
| FR02 | The system must show an error dialog if the uploaded file is not `.csv` |
| FR03 | The system must display descriptive statistics for the loaded dataset |
| FR04 | The system must allow generating histograms, scatter plots, bar charts, and boxplots |
| FR05 | The system must allow column exclusion before graph construction |
| FR06 | The system must allow adjustment of the cosine similarity threshold |
| FR07 | The system must support preprocessing via PCA, Yeo-Johnson, or both combined |
| FR08 | The system must construct the graph as the largest connected component |
| FR09 | The system must display node count, edge count, and average degree after graph generation |
| FR10 | The system must run the Louvain algorithm for community detection |
| FR11 | The system must display the number of communities, their sizes, and modularity |
| FR12 | The system must compute and export per-node centrality metrics |
| FR13 | The system must export all artifacts to a user-chosen directory |
| FR14 | The system must clean up temporary files on exit |

---

## 10. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR01 | The application must run on Windows, Linux, and macOS |
| NFR02 | The system must work 100% offline, with no calls to external servers |
| NFR03 | The system must automatically detect and configure the Python environment (venv) |
| NFR04 | The system must automatically install Python dependencies via pip |
| NFR05 | The system must support offline installation via `.whl` files in `/wheels` |
| NFR06 | Communication between Node.js and Python must be asynchronous |
| NFR07 | The renderer context must be isolated from Node.js (`contextIsolation: true`) |
| NFR08 | Python results must be returned exclusively as JSON via stdout |
| NFR09 | The application must perform adequately for small and medium-sized datasets |
| NFR10 | The source code must be available in a public repository |

---

## 11. Centrality Metrics Computed

The `louvain_method.py` script computes the following metrics for each node:

| Metric | Description |
|--------|-------------|
| `C.grau` | Degree centrality |
| `C.clustering` | Weighted clustering coefficient |
| `C.closeness` | Closeness centrality |
| `C.cf.closeness` | Current Flow Closeness Centrality |
| `C.betweenness` | Weighted, normalized betweenness centrality |
| `C.cf.betweenness` | Current Flow Betweenness Centrality |
| `C.load` | Load centrality |
| `C.harmonic` | Harmonic centrality |

---

## 12. Runtime-Generated Files

| File | Contents | External Use |
|------|----------|--------------|
| `graph.gpickle` | Serialized graph (NetworkX binary) | Integration with external Python scripts |
| `sim_matrix_*.csv` | Filtered similarity matrix | Statistical analysis of threshold criteria |
| `graph.png` | Static graph visualization | Insertion into reports |
| `communities_*.csv` | Nodes with community labels and centrality metrics | External analysis and attribute enrichment |
| `communities_*.png` | Graph image colored by community | Insertion into reports |
| `original_dataset.csv` | Original dataset | Experiment reproducibility |
| `filtered_dataset.csv` | Dataset after column exclusion | Experiment reproducibility |

> **Warning:** The `/data` folder is automatically deleted when the application closes. Export your files before exiting.

---

## 13. IPC Channel Reference

| Channel | Type | Description |
|---------|------|-------------|
| `select-file` | handle | Opens native OS file selection dialog |
| `save-dataset` | on | Saves dataset to a global variable in the main process |
| `load-dataset` | handle | Returns the saved dataset |
| `get-path` | handle | Returns an absolute path inside userData |
| `write-file` | handle | Writes a file to the filesystem |
| `export-data` | handle | Copies `/data` contents to a user-chosen directory |
| `python:run` | handle | Runs a Python script; returns `{code, stdout, stderr}` |
| `python:log` | send | Streams real-time Python logs to the renderer |
| `show-dialog` | handle | Displays a native dialog (info, error, confirmation) |
| `navigate` | on | Navigates between HTML pages |

---

## 14. Python Environment Bootstrap

The `bootstrap-python.js` module automatically handles:

1. **Python detection** (≥ 3.11) in priority order:
   - Explicit override / `GRAPHLY_PYTHON` environment variable
   - Known macOS paths (Homebrew, pyenv, Frameworks)
   - Generic platform names (`python3.12`, `py -3.12`, etc.)

2. **Virtualenv creation/validation** at `userData/pyenv`

3. **Dependency installation** (online → offline fallback via `/wheels`)

---


## 15. Future Work (Backlog)

| Priority | Item |
|----------|------|
| High | Support for additional input formats (Excel, JSON, Parquet) |
| High | Web version with a Python REST API backend |
| Medium | Integration with Graph Neural Networks (GNNs) for node classification and edge prediction |
| Medium | Alternative community detection algorithms (Leiden, Infomap) |
| Medium | Extended export formats (GraphML, GEXF, PDF report) |
| Low | Dark mode UI |
| Low | Persistent user preference settings |
| Low | Interactive in-app graph visualization (D3.js / Sigma.js) |

---

## 18. Known Limitations

- Very large datasets may impact performance (no formal maximum size has been tested)
- The generated graph corresponds to the **largest connected component** — smaller subgraphs are discarded
- The `/data` folder is temporary and **deleted on application exit** — users must export before closing
- Graph construction requires the dataset to contain only numeric columns after filtering

---

*Document generated from the source code and undergraduate thesis of Letícia Tavares dos Santos — UFRJ, 2025.*
