import sys
import json
import pickle

import pandas as pd
import numpy as np
import networkx as nx
import matplotlib.pyplot as plt
import matplotlib as mpl
from matplotlib.lines import Line2D
# import community as community_louvain

from community import community_louvain

def communityDetection(graph: nx.Graph, study: int, save_csv: bool = True) -> tuple:

    """
    Detecta comunidades (Louvain) e plota distribuição de tamanhos.
    Args:
        graph (nx.Graph): rede do dataset original
        study (int): índice do estudo
        save_csv (bool, optional): opção de salvar o dataset

    Returns:
        df_partition: pd.DataFrame
        partition: dict
        json_louvain: dict
    """
    # --- métricas de centralidade  ---
    metrics = [list(nx.degree_centrality(graph).values())]
    metrics.append(list(nx.clustering(graph, weight='weight').values()))
    metrics.append(list(nx.closeness_centrality(graph).values()))
    
    # exigem grafo conectado
    metrics.append(list(nx.current_flow_closeness_centrality(graph, weight='weight').values()))
    metrics.append(list(nx.betweenness_centrality(graph, weight='weight', normalized=True).values()))
    metrics.append(list(nx.current_flow_betweenness_centrality(graph, weight='weight').values()))
    metrics.append(list(nx.load_centrality(graph, weight='weight').values()))
    metrics.append(list(nx.harmonic_centrality(graph).values()))

    # cria dataframe com os resultados
    dfmetrics = pd.DataFrame(
        np.array(metrics).T.tolist(),
        columns=['C.grau','C.clustering','C.closeness','C.cf.closeness',
                 'C.betweenness','C.cf.betweenness','C.load','C.harmonic']
    )
    
    dfmetrics.index = list(graph.nodes)

    # --- Louvain ---
    partition = community_louvain.best_partition(graph, weight='weight') # dict com as comunidades
    dftemp = pd.DataFrame(list(partition.items()), columns=['Nodes','Community'])

    qty_communities = int(dftemp['Community'].max()) + 1
    nodes_per_com = [list(partition.values()).count(x) for x in range(qty_communities)]
    
    json_louvain = {
        "qtd_communities": qty_communities,
        "sizes": nodes_per_com,
        "modularity": community_louvain.modularity(partition, graph, weight='weight'),
    }

    # --- Saída (CSV) ---
    df_partition = pd.concat([dftemp.set_index('Nodes'), dfmetrics], axis=1)

    if save_csv:
        fname = f"data/communities_{study}.csv"
        df_partition.to_csv(fname, index=True)

    return df_partition, partition, json_louvain


def plot_communities(G: nx.Graph, title: str = "Rede", use_weight: bool = True, seed: int = 42, labels: bool = False, 
                     save_at = None, dpi: int = 150, partition = None, subtitles: bool = True, cmap_base: str = "tab20"):
    """
    Plota um grafo de forma simples e legível e opcionalmente salva como imagem.
    
    Args:
        G          : networkx.Graph
        title     : título do gráfico
        use_weight  : bool -> se True, usa atributo 'weight' no layout/tamanho de arestas
        seed       : int  -> semente para reprodutibilidade do layout
        labels    : bool -> se True, mostra rótulos dos nós
        save_at  : str  -> caminho do arquivo PNG para salvar a figura (ex.: 'grafo.png')
        dpi        : int  -> resolução da imagem salva
    """
    pos = nx.spring_layout(G, weight='weight' if use_weight else None, seed=seed)

    # Tamanho do nó via grau
    grau = dict(G.degree(weight='weight') if use_weight else G.degree())
    g_vals = np.array(list(grau.values()), dtype=float)
    if g_vals.max() == 0:
        g_vals += 1.0
    tamanhos = 300 * (g_vals / g_vals.max()) + 50

    # # Espessura da aresta via peso
    if use_weight:
        w = np.array([G[u][v].get('weight',1.0) for u,v in G.edges()], dtype=float)
        if w.max() == 0:
            w += 1.0
        widths = 2.0 * (w / w.max())
    else:
          widths = 1.0

    # widths = 1.0

     # --- Cores por comunidade ---
    if partition is not None:
        # comunidades distintas e mapeamento para 0..k-1
        com_ids = sorted(set(partition.values()))
        k = len(com_ids)
        id2idx = {cid: i for i, cid in enumerate(com_ids)}
        
        # colormap com k cores bem separadas
        cmap = mpl.colormaps[cmap_base].resampled(k)
        # vetor de cores na ordem de G.nodes()
        node_colors = [cmap(id2idx[partition[n]]) for n in G.nodes()]
    else:
        node_colors = 'skyblue'

    # Plot
    fig, ax = plt.subplots(figsize=(9, 7))
    nx.draw_networkx_edges(G, pos, width=widths, alpha=0.25, ax=ax, edge_color="#999999")
    nx.draw_networkx_nodes(
        G, pos,
        node_size=tamanhos,
        node_color=node_colors,
        edgecolors='k',
        linewidths=0.5,
        ax=ax
    )

    if labels:
        nx.draw_networkx_labels(G, pos, font_size=8, ax=ax)

    # Legenda (uma entrada por comunidade)
    if partition is not None and subtitles:
        # monta counter por comunidade
        from collections import Counter
        counter = Counter(partition.values())
        handles = []
        labels = []
        for cid in com_ids:
            color = mpl.colormaps[cmap_base].resampled(k)(id2idx[cid])
            handles.append(Line2D([0], [0], marker='o', linestyle='',
                                  markerfacecolor=color, markeredgecolor='k', markersize=8))
            labels.append(f"Community {cid} (n={counter[cid]})")
        ax.legend(handles, labels, loc='best', fontsize=8, frameon=True)

    ax.set_title(title)
    ax.axis('off')
    plt.tight_layout()

    # Salvar se solicitado
    if save_at:
        plt.savefig(save_at, dpi=dpi, bbox_inches='tight')

    # plt.show()


def main():
  
    studies = ['original', 'pca', 'yj', 'pca+yj']

    study = int(sys.argv[1])

    with open('data/graph.gpickle', 'rb') as file:
        graph = pickle.load(file)

    df_communities, communities, res = communityDetection(graph, studies[study])
    plot_communities(graph, title=f"Communities - {studies[study]}", partition=communities ,labels=True, save_at=f"data/communities_{studies[study]}.png")

    # cria json com resultados
    json_louvian = json.dumps(res)

    qtd_communities = json.loads(json_louvian)["qtd_communities"]
    sizes = json.loads(json_louvian)["sizes"]
    modularity = json.loads(json_louvian)["modularity"]

    # Monta o resultado final
    result = {
        "louvain": {  
            "communities": qtd_communities,
            "sizes": sizes,       
            "modularity": modularity,
        }
    }

    # ÚNICA saída no stdout:
    print(json.dumps(result, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()



