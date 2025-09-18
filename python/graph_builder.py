import sys
import json
import pickle

import pandas as pd
import numpy as np
import networkx as nx
import matplotlib.pyplot as plt
import matplotlib as mpl
from matplotlib.lines import Line2D

from sklearn import metrics
from sklearn.decomposition import PCA, IncrementalPCA, KernelPCA # reducao de dimensionalidade
from sklearn.metrics.pairwise import cosine_similarity           # calculo de similaridade
from sklearn import preprocessing
from sklearn.preprocessing import PowerTransformer


def applyPCA(data, num_of_comp, var):
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
    total_explicado = 0
    qtd_final = 0
    
    # identifica a qtd de componentes que atendem a porcentagem minima de variancia total
    for comp in range(0, num_of_comp):
        if total_explicado < var:
            pca_var.append('componente' + str(comp))
            total_explicado = total_explicado + pca.explained_variance_ratio_[comp]
            qtd_final = qtd_final + 1
        else: 
            comp = num_of_comp
            
    df_pca = pd.DataFrame(temp_pca[:,0:qtd_final])
    df_pca.index = data.index
    df_pca.columns = [pca_var]
    
    return df_pca

def powerTransformer(data):
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

def createGraph(base, study, neighborhoods, studies,cos_sim = 0.5):
    
    # pega a base de estudo a ser utilizada
    similarity = cosine_similarity(base, base)  # encontra similaridade global
    
    df_sim = pd.DataFrame(similarity)
    df_sim.columns = base.index
    df_sim.index = base.index
    
    sim_values = similarity[np.triu_indices(neighborhoods, k = 1)] #lista de valores de similaridade
    
    for i in range(neighborhoods):
        similarity[i,i] = 0  # elimina futuras autoarestas
    
    # corte das arestas baseado na estatistica descritiva
    # lim_inf = pd.DataFrame(sim_values).describe().transpose()['75%'][0]  # limite inferior dos pesos das arestas
    lim_inf = cos_sim

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
    
    # Nome do arquivo baseado no estudo
    # arquivo_saida = f"data/grafo_{studies[study]}.png"
    graph_img = f"data/grafo.png"

    # Plotar e salvar
    plot_grafo(
        graph,
        titulo=f"Network - {studies[study]}",
        usar_peso=True,
        rotulos=True,
        salvar_em=graph_img
    )
    
    bairrosCG = sorted(max(nx.connected_components(graph), key = len))  # bairros do componente gigante
    gigante = graph.subgraph(bairrosCG)  # cria subgrafo com esses bairros

    graph_info = {
        "nodes": len(graph.nodes),
        "edges": len(graph.edges),
        "degree": sum(dict(graph.degree).values()) / len(graph.nodes)
    }

    # similarityCG = nx.adjacency_matrix(gigante).todense()  # exporta a matriz de adjacencias do componente gigante
    
    # dfsimCG = pd.DataFrame(similarityCG)
    # dfsimCG.columns = [list(bairrosCG)]
    # dfsimCG.index = [list(bairrosCG)]
    
    return graph_info, gigante, graph


def plot_grafo(G, titulo="Rede", usar_peso=True, seed=42, rotulos=False, salvar_em=None, dpi=150):
    """
    Plota um grafo de forma simples e legível e opcionalmente salva como imagem.
    
    Parâmetros:
        G          : networkx.Graph
        titulo     : título do gráfico
        usar_peso  : bool -> se True, usa atributo 'weight' no layout/tamanho de arestas
        seed       : int  -> semente para reprodutibilidade do layout
        rotulos    : bool -> se True, mostra rótulos dos nós
        salvar_em  : str  -> caminho do arquivo PNG para salvar a figura (ex.: 'grafo.png')
        dpi        : int  -> resolução da imagem salva
    """
    pos = nx.spring_layout(G, weight='weight' if usar_peso else None, seed=seed)

    # Tamanho do nó via grau
    grau = dict(G.degree(weight='weight') if usar_peso else G.degree())
    g_vals = np.array(list(grau.values()), dtype=float)
    if g_vals.max() == 0:
        g_vals += 1.0
    tamanhos = 300 * (g_vals / g_vals.max()) + 50

    # Espessura da aresta via peso
    if usar_peso:
        w = np.array([G[u][v].get('weight',1.0) for u,v in G.edges()], dtype=float)
        if w.max() == 0:
            w += 1.0
        widths = 2.0 * (w / w.max())
    else:
        widths = 1.0

    # Plot
    fig, ax = plt.subplots(figsize=(9,7))
    nx.draw_networkx_edges(G, pos, width=widths, alpha=0.25, ax=ax)
    nx.draw_networkx_nodes(
        G, pos,
        node_size=tamanhos,
        node_color='skyblue',
        edgecolors='k',
        linewidths=0.5,
        ax=ax
    )

    if rotulos:
        nx.draw_networkx_labels(G, pos, font_size=8, ax=ax)

    ax.set_title(titulo)
    ax.axis('off')
    plt.tight_layout()

    # Salvar se solicitado
    if salvar_em:
        plt.savefig(salvar_em, dpi=dpi, bbox_inches='tight')
    

def apply_study(df, study, num_of_comp=15, min_var=90):
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
    

    
def main():
    cos_sim = 0.5 # default
    study = 0     # default
    num_of_comp = 15 # default
    min_var = 90     # default

    # check to see if csv file exists
    try:
        with open('data/filtered_dataset.csv', 'r') as f:
            df = pd.read_csv('data/filtered_dataset.csv', index_col=0)
            pass
    except FileNotFoundError:
        # lê o dataset original
        df = pd.read_csv('data/original_dataset.csv', index_col=0)


    neighborhoods = df.shape[0] # number of neighborhoods
    
    studies = ['original', 'pca', 'yj', 'pca+yj']

    if(len(sys.argv)) >= 2:
        data = sys.argv[1].strip('[]').split(',')
        cos_sim = float(data[0])
        study = int(data[1])
        if study == 1 or study == 3:
            num_of_comp = int(data[2])
            min_var = int(data[3])

    # cria a base de acordo com o estudo selecionado
    df_study = apply_study(df, study, num_of_comp, min_var)

    # constroi o grafo
    res, gigante, graph = createGraph(df_study, study, neighborhoods, studies, cos_sim) 

    # graph data to json
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
    
    with open('data/graph.gpickle', 'wb') as file:
        pickle.dump(gigante, file, pickle.HIGHEST_PROTOCOL)

    # ÚNICA saída no stdout:
    print(json.dumps(result, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()