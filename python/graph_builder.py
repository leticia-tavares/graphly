import sys
import json
import pickle

import pandas as pd
import numpy as np
import networkx as nx
import matplotlib.pyplot as plt

from sklearn.decomposition import IncrementalPCA          # reducao de dimensionalidade
from sklearn.metrics.pairwise import cosine_similarity    # calculo de similaridade
from sklearn.preprocessing import PowerTransformer        # yeo-johnson 

def applyPCA(data: pd.DataFrame, num_of_comp: int, var: float = 70.0) -> pd.DataFrame:
    """
    Função para aplicar PCA incremental em um dataframe de dados

    Args:
        data (dataframe): dataset a ser reduzido
        num_of_comp (int): número de componentes mínimos
        var (int): variância mínima

    Returns:
        dataframe: dataset com dimensão reduzida
    """
    pca = IncrementalPCA(n_components = num_of_comp)
    pca.fit(data)
    temp_pca = pca.transform(data)

    pca_var = []
    total_exp = 0
    total_qty = 0
    
    # identifica a qtd de componentes que atendem a porcentagem minima de variancia total
    for comp in range(0, num_of_comp):
        if total_exp < var:
            pca_var.append('componente' + str(comp))
            total_exp = total_exp + pca.explained_variance_ratio_[comp]
            total_qty = total_qty + 1
        else: 
            comp = num_of_comp
            
    df_pca = pd.DataFrame(temp_pca[:,0:total_qty])
    df_pca.index = data.index
    df_pca.columns = [pca_var]
    
    return df_pca

def powerTransformer(data: pd.DataFrame) -> pd.DataFrame:
    """
    Transforma os dados para ficarem mais próximos de uma distribuição normal

    Args:
        data (dataframe) : dataset original

    Return:
        dataframe: dataset transformado (yeo-johnson)
    """

    columns = list(data.columns)
    pt = PowerTransformer(method='yeo-johnson', standardize=True)
    
    data_pt = pt.fit_transform(data)
    df_pt = pd.DataFrame(data_pt)
    df_pt.columns = [s + '-yj' for s in columns]
    df_pt.index = data.index
    return df_pt

def createGraph(base: pd.DataFrame, study: int, nodes: int, lim_inf = 0.5) -> tuple:
    """
    Cria o grafo a partir da base de dados transformada
    Args:
        base (pd.Dataframe): base de dados com estudo selecionado
        study (int): identificador do estudo
        nodes (int): numero inicial de registros
        lim_inf (float, optional): filtro para criacao de arestas

    Returns:
        tuple: 
    """

    # nomes dos estudos
    studies = ['original', 'pca', 'yj', 'pca+yj']
    
    # pega a base de estudo a ser utilizada
    similarity = cosine_similarity(base, base)  # encontra similaridade global
    # similarity = cosine_similarity(base)  # encontra similaridade global
    
    df_sim = pd.DataFrame(similarity)
    df_sim.columns = base.index
    df_sim.index = base.index
    
    # sim_values = similarity[np.triu_indices(nodes, k = 1)] #lista de valores de similaridade
    
    for i in range(nodes):
        similarity[i,i] = 0  # elimina futuras autoarestas
    
    # usa a similaridade passada como parametro
    similarity2 = np.where(similarity < lim_inf, 0, similarity)  # anula similaridades abaixo do limite
    adjacencias = np.where(similarity < lim_inf, 0, 1)           # cria matriz binaria de adjacencias 
    
    df_sim2 = pd.DataFrame(similarity2) # matriz de referencia para construcao do grafo
    df_sim2.columns = df_sim.index
    df_sim2.index = df_sim.index

    # salva a matriz de similaridade em csv
    # fname = f"data/sim_matrix_{studies[study]}_liminf_{lim_inf:.4f}.csv"
    fname = f"data/sim_matrix_{studies[study]}.csv"

    df_sim2.to_csv(fname, index=True)
    
    graph = nx.from_pandas_adjacency(df_sim2)  # constroi o grafo

    # garante que o grafo esteja conectado (pega o maior componente conectado)
    if not nx.is_connected(graph):
        graph = max((graph.subgraph(c).copy() for c in nx.connected_components(graph)), key=len)
    
    # arquivo_saida = f"data/grafo_{studies[study]}.png"
    graph_img = f"data/grafo.png"

    # Plotar e salvar
    plot_graph(
        graph,
        title=f"Network - {studies[study]}",
        use_weight=True,
        labels=True,
        save_at=graph_img
    )
    
    nodesCG = sorted(max(nx.connected_components(graph), key = len))  # nós do componente gigante
    gigante = graph.subgraph(nodesCG)  # cria subgrafo 

    graph_info = {
        "nodes": len(graph.nodes),
        "edges": len(graph.edges),
        "degree": sum(dict(graph.degree).values()) / len(graph.nodes)
    }
    
    return graph_info, gigante, graph


def plot_graph(graph: nx.Graph, title: str ="Network", use_weight: bool = True, 
               seed: int = 42, labels=False, save_at = None) -> None:
    """
    Plota um grafo de forma simples e legível e opcionalmente salva como imagem.
    
    Args:
        graph          : networkx.Graph
        use_weight : bool -> se True, usa atributo 'weight' no layout/tamanho de arestas
        seed       : int  -> semente para reprodutibilidade do layout
        labels     : bool -> se True, mostra rótulos dos nós
        save_at    : str  -> caminho do arquivo PNG para salvar a figura (ex.: 'grafo.png')
    """

    # Layout
    pos = nx.spring_layout(graph, weight='weight' if use_weight else None, seed=seed)

    # Tamanho do nó via grau
    grau = dict(graph.degree(weight='weight') if use_weight else graph.degree())
    g_vals = np.array(list(grau.values()), dtype=float)

    # normaliza e escala
    if g_vals.max() == 0:
        g_vals += 1.0
    tamanhos = 300 * (g_vals / g_vals.max()) + 50

    # Espessura da aresta via peso
    if use_weight:
        w = np.array([graph[u][v].get('weight',1.0) for u,v in graph.edges()], dtype=float)
        if w.max() == 0:
            w += 1.0
        widths = 2.0 * (w / w.max())
    else:
        widths = 1.0

    # Plot
    fig, ax = plt.subplots(figsize=(9,7))
    nx.draw_networkx_edges(graph, pos, width=widths, alpha=0.25, ax=ax)
    nx.draw_networkx_nodes(
        graph, pos,
        node_size=tamanhos,
        node_color='skyblue',
        edgecolors='k',
        linewidths=0.5,
        ax=ax
    )

    if labels:
        nx.draw_networkx_labels(graph, pos, font_size=8, ax=ax)

    ax.set_title(title)
    ax.axis('off')
    plt.tight_layout()

    # Salvar se solicitado
    if save_at:
        plt.savefig(save_at, dpi=150, bbox_inches='tight')

def apply_study(df: pd.DataFrame, study: int, num_of_comp: int = 15, min_var: int = 90) -> pd.DataFrame:
    """
    Aplica a transformação de dados conforme o estudo selecionado.

    Args:
        df (dataframe): dataset original
        study (int): índice do estudo a ser aplicado
        num_of_comp (int, optional): número de componentes para PCA. Padrão é 15.
        min_var (int, optional): variância mínima para PCA. Padrão é 90.

    Returns:
        dataframe: dataset transformado conforme o estudo selecionado
    """
    if study == 0:
        return df  # original
    elif study == 1:
        return applyPCA(df, num_of_comp, min_var)  # pca
    elif study == 2:
        return powerTransformer(df)  # yeo-johnson
    else:
        return applyPCA(powerTransformer(df), num_of_comp, min_var)  # pca + yeo-johnson
 
def check_first_column(path_csv: str) -> pd.DataFrame:
    """
    Verifica se a primeira coluna do CSV deve ser usada como índice
    Args:
        path_csv (str): caminho para o arquivo CSV

    Returns:
        pd.DataFrame: DataFrame com ou sem a primeira coluna como índice
    """

    df = pd.read_csv(path_csv)
    first_col = df.columns[0]

    # checagem de unicidade e nulos
    is_unique = df[first_col].is_unique
    has_nulls = df[first_col].isnull().any()

    if is_unique and not has_nulls:
        df = pd.read_csv(path_csv, index_col=0)
        return df
    else:
        df = pd.read_csv(path_csv)
        return df

    
def main():

    # verifica se o dataset filtrado existe
    try:
        with open('data/filtered_dataset.csv', 'r') as f:
            df = check_first_column('data/filtered_dataset.csv')
            pass
    except FileNotFoundError:
        # lê o dataset original
        df = check_first_column('data/original_dataset.csv')

    # pega o valor de colunas do dataset
    num_of_comp = df.shape[1] - 1

    # numero de registros
    nodes = df.shape[0] 

    min_var = 70.0 # valor padrao


    # lê os parâmetros da linha de comando
    data = sys.argv[1].strip('[]').split(',')

    cos_sim = float(data[0])

    # checa o tipo de estudo e seus parâmetros
    study = int(data[1])
    if study == 1 or study == 3:
        num_of_comp = int(data[2])
        min_var = int(data[3])

    # cria a base de acordo com o estudo selecionado
    df_study = apply_study(df, study, num_of_comp, min_var)

    # constroi o grafo
    res, gigante, graph = createGraph(df_study, study, nodes, cos_sim) 

    # pega os dados do grafo em formato json
    json_graph = json.dumps(res)
    nodes = json.loads(json_graph)["nodes"]
    edges = json.loads(json_graph)["edges"] 
    degree = json.loads(json_graph)["degree"]

    # Monta o resultado final
    result = {
        "graph": {
            "nodes": nodes,
            "edges": edges,
            "degree": degree,
        }
    }
    
    # Salva o grafo em formato pickle
    with open('data/graph.gpickle', 'wb') as file:
        pickle.dump(gigante, file, pickle.HIGHEST_PROTOCOL)

    # ÚNICA saída no stdout:
    print(json.dumps(result, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()