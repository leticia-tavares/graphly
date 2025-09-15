import sys
import json
# para testar se o python está funcionando
# & $py .\python\test.py 

import pandas as pd
import numpy as np
import networkx as nx
import matplotlib.pyplot as plt

from sklearn import metrics
from sklearn.cluster import KMeans, SpectralClustering
from sklearn.decomposition import PCA, IncrementalPCA, KernelPCA # reducao de dimensionalidade
from sklearn.metrics import davies_bouldin_score
from sklearn.metrics.pairwise import cosine_similarity           # calculo de similaridade
from sklearn import preprocessing
from sklearn.preprocessing import PowerTransformer

from community import community_louvain


cos_sim = 0.5 # default

if(len(sys.argv)) >= 2:
    message = sys.argv[1]
    cos_sim = float(message)

df = pd.read_csv('data/original_dataset.csv', index_col=0)
# print(df.head())

neighborhoods = df.shape[0] # number of neighborhoods
# print(neighborhoods)

num_of_var = df.shape[1] # total number of variables
# print(num_of_var)

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

    print("Quantidade final: ", qtd_final)
    print("Total explicado: ", total_explicado)
    print("Componentes: ", pca.explained_variance_ratio_)

    # plot da variancia explicada por componente
    """     features = range(pca.n_components_)
    plt.bar(features, pca.explained_variance_ratio_, color='black')
    plt.xlabel('Componentes do PCA')
    plt.ylabel('Variancia explicada %')
    plt.xticks(features) """
    
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

def communityDetection(graph, neighborhoods, study, lim_inf, show=True, save_csv=True, outdir='.'):
    """
    Detecta comunidades (Louvain) e plota distribuição de tamanhos.
    """
    # --- métricas de centralidade (ok manter como está) ---
    metricas = [list(nx.degree_centrality(graph).values())]
    metricas.append(list(nx.clustering(graph, weight='weight').values()))
    metricas.append(list(nx.closeness_centrality(graph).values()))
    
    # As duas abaixo exigem grafo conectado; "gigante" já é o componente gigante
    metricas.append(list(nx.current_flow_closeness_centrality(graph, weight='weight').values()))
    metricas.append(list(nx.betweenness_centrality(graph, weight='weight', normalized=True).values()))
    metricas.append(list(nx.current_flow_betweenness_centrality(graph, weight='weight').values()))
    metricas.append(list(nx.load_centrality(graph, weight='weight').values()))
    metricas.append(list(nx.harmonic_centrality(graph).values()))

    dfmetricas = pd.DataFrame(
        np.array(metricas).T.tolist(),
        columns=['C.grau','C.clustering','C.closeness','C.cf.closeness',
                 'C.betweenness','C.cf.betweenness','C.load','C.harmonic']
    )
    dfmetricas.index = list(graph.nodes)

    # --- Louvain ---
    particao = community_louvain.best_partition(graph, weight='weight') # dict com as comunidades
    dftemp = pd.DataFrame(list(particao.items()), columns=['Bairro','Comunidade'])

    qtdcomunidades = int(dftemp['Comunidade'].max()) + 1
    qtdelementos = [list(particao.values()).count(x) for x in range(qtdcomunidades)]

    print(f"{qtdcomunidades} comunidades; tamanhos: {qtdelementos}; "
          f"modularidade = {community_louvain.modularity(particao, graph, weight='weight'):.4f}")

    # --- Plot: crie figura nova e dê show() ---
    fig, ax = plt.subplots(figsize=(6,4))
    ax.bar(range(qtdcomunidades), qtdelementos)
    ax.set_title(f'Comunidades ({study})')
    ax.set_xlabel('Comunidade')
    ax.set_ylabel('Número de nós')
    ax.grid(True, axis='y', alpha=0.3)
    fig.tight_layout()

    if show:
        plt.show()

    # --- Saída (CSV) ---
    dfparticao = pd.concat([dftemp.set_index('Bairro'), dfmetricas], axis=1)
    if save_csv:
        fname = f"{outdir}/comunidades_{study}_liminf_{lim_inf:.4f}.csv"
        dfparticao.to_csv(fname, index=True)

    # Retorne também a figura, se quiser salvar PNG fora
    return dfparticao, fig, ax, particao

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
        print(f"✅ Gráfico salvo em: {salvar_em}")

    # plt.show()

def plot_communities(G, titulo="Rede", usar_peso=True, seed=42, rotulos=False, salvar_em=None, dpi=150):
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
        print(f"✅ Gráfico salvo em: {salvar_em}")

    plt.show()

def createGraph(study, cos_sim = 0.5):
    print("\n\n*********** ESTUDO - " + studies[study] + "*************\n\n")
    
    # pega a base de estudo a ser utilizada
    base = bases[study] 
    similarity = cosine_similarity(base, base)  # encontra similaridade global
    
    df_sim = pd.DataFrame(similarity)
    df_sim.columns = base.index
    df_sim.index = base.index
    
    sim_values = similarity[np.triu_indices(neighborhoods, k = 1)] #lista de valores de similaridade
    
    for i in range(neighborhoods):
        similarity[i,i] = 0  # elimina futuras autoarestas
    
    # corte das arestas baseado na estatistica descritiva
    lim_inf = pd.DataFrame(sim_values).describe().transpose()['75%'][0]  # limite inferior dos pesos das arestas
    print("Corte das Arestas [ " + studies[study] + "]: ", lim_inf)

    # usa a similaridade passada como parametro
    # lim_inf = cos_sim
    
    similarity2 = np.where(similarity < lim_inf, 0, similarity)  # anula similaridades abaixo do limite
    adjacencias = np.where(similarity < lim_inf, 0, 1)           # cria matriz binaria de adjacencias 
    
    df_sim2 = pd.DataFrame(similarity2) # matriz de referencia para construcao do grafo
    df_sim2.columns = df_sim.index
    df_sim2.index = df_sim.index
    
    graph = nx.from_pandas_adjacency(df_sim2)  # constroi o grafo

    # garante que o grafo esteja conectado (pega o maior componente conectado)
    if not nx.is_connected(graph):
        graph = max((graph.subgraph(c).copy() for c in nx.connected_components(graph)), key=len)

    #plot_grafo(graph, titulo=f"Grafo - {studies[study]}", usar_peso=True, rotulos=True)
    
    # Nome do arquivo baseado no estudo
    arquivo_saida = f"data/grafo_{studies[study]}.png"

    # Plotar e salvar
    plot_grafo(
        graph,
        titulo=f"Grafo - {studies[study]}",
        usar_peso=True,
        rotulos=True,
        salvar_em=arquivo_saida
    )
    
    # print as listas os componentes conectados
    # for item in nx.connected_components(graph):
    #     print("\n", len(item), sorted(item))
    
    bairrosCG = sorted(max(nx.connected_components(graph), key = len))  # bairros do componente gigante
    gigante = graph.subgraph(bairrosCG)  # cria subgrafo com esses bairros

    graph_info = {
        "nodes": len(graph.nodes),
        "edges": len(graph.edges),
        "degree": sum(dict(graph.degree).values()) / len(graph.nodes)
    }
    
    print('Number of nodes', len(graph.nodes))
    print('Number of edges', len(graph.edges))
    print('Average degree', sum(dict(graph.degree).values()) / len(graph.nodes))
    
    similarityCG = nx.adjacency_matrix(gigante).todense()  # exporta a matriz de adjacencias do componente gigante
    
    dfsimCG = pd.DataFrame(similarityCG)
    dfsimCG.columns = [list(bairrosCG)]
    dfsimCG.index = [list(bairrosCG)]
    
    # Chamada da função passando lim_inf
    # df_communities, fig, ax, communities = communityDetection(gigante, len(bairrosCG), studies[study], lim_inf, show=False, outdir='data')

    
    # with open(f"data/communities_{studies[study]}.json", "w") as file:     
    #     json.dump(communities, file, indent=4)

    # # salvar PNG do gráfico de barras
    # fig.savefig(f"comunidades_{studies[study]}_liminf_{lim_inf:.4f}.png", dpi=150)

    return graph_info


# cria as bases de estudo
studies = ['original', 'pca', 'yj', 'pca+yj']

df_pca = applyPCA(df, 15, 90)
df_yj = powerTransformer(df)
df_pcayj = applyPCA(df_yj, 15, 90)

bases = [df, df_pca, df_yj, df_pcayj] 


#  constroi o grafo 
res = createGraph(0) 

# cria o json para enviar para o node
json_graph = {}
json_obj = json.dumps(res)
print(json_obj) 


sys.stdout.flush()



