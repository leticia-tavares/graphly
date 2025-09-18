import sys
import json
import pickle

import pandas as pd
import numpy as np
import networkx as nx
import matplotlib.pyplot as plt
import matplotlib as mpl
from matplotlib.lines import Line2D

from community import community_louvain



def communityDetection(graph, study, save_csv=True):
    """
    Detecta comunidades (Louvain) e plota distribuição de tamanhos.
    """
    # --- métricas de centralidade  ---
    metricas = [list(nx.degree_centrality(graph).values())]
    metricas.append(list(nx.clustering(graph, weight='weight').values()))
    metricas.append(list(nx.closeness_centrality(graph).values()))
    
    # exigem grafo conectado
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
    
    json_louvain = {
        "qtd_communities": qtdcomunidades,
        "sizes": qtdelementos,
        "modularity": community_louvain.modularity(particao, graph, weight='weight'),
    }

    # --- Saída (CSV) ---
    dfparticao = pd.concat([dftemp.set_index('Bairro'), dfmetricas], axis=1)

    if save_csv:
        fname = f"data/communities_{study}.csv"
        dfparticao.to_csv(fname, index=True)

    # Retorne também a figura, se quiser salvar PNG fora
    return dfparticao, particao, json_louvain


def plot_communities(G, titulo="Rede", usar_peso=True, seed=42, rotulos=False, 
                     salvar_em=None, dpi=150, particao=None, mostrar_legenda=True, cmap_base="tab20"):
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

    # # Espessura da aresta via peso
    if usar_peso:
        w = np.array([G[u][v].get('weight',1.0) for u,v in G.edges()], dtype=float)
        if w.max() == 0:
            w += 1.0
        widths = 2.0 * (w / w.max())
    else:
          widths = 1.0

    # widths = 1.0

     # --- Cores por comunidade ---
    if particao is not None:
        # comunidades distintas e mapeamento para 0..k-1
        com_ids = sorted(set(particao.values()))
        k = len(com_ids)
        id2idx = {cid: i for i, cid in enumerate(com_ids)}
        
        # colormap com k cores bem separadas
        cmap = mpl.colormaps[cmap_base].resampled(k)
        # vetor de cores na ordem de G.nodes()
        node_colors = [cmap(id2idx[particao[n]]) for n in G.nodes()]
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

    if rotulos:
        nx.draw_networkx_labels(G, pos, font_size=8, ax=ax)

    # Legenda (uma entrada por comunidade)
    if particao is not None and mostrar_legenda:
        # monta contagem por comunidade
        from collections import Counter
        contagem = Counter(particao.values())
        handles = []
        labels = []
        for cid in com_ids:
            color = mpl.colormaps[cmap_base].resampled(k)(id2idx[cid])
            handles.append(Line2D([0], [0], marker='o', linestyle='',
                                  markerfacecolor=color, markeredgecolor='k', markersize=8))
            labels.append(f"Comunidade {cid} (n={contagem[cid]})")
        ax.legend(handles, labels, loc='best', fontsize=8, frameon=True)

    ax.set_title(titulo)
    ax.axis('off')
    plt.tight_layout()

    # Salvar se solicitado
    if salvar_em:
        plt.savefig(salvar_em, dpi=dpi, bbox_inches='tight')

    # plt.show()



def main():
  
    study = 0     # default
    studies = ['original', 'pca', 'yj', 'pca+yj']

    if(len(sys.argv)) >= 2:
        study = int(sys.argv[1])

    with open('data/graph.gpickle', 'rb') as file:
        graph = pickle.load(file)

    #  Chamada da função passando lim_inf
    df_communities, communities, res = communityDetection(graph, studies[study])
    plot_communities(graph, titulo=f"Communities - {studies[study]}", particao=communities ,rotulos=True, salvar_em=f"data/communities_{studies[study]}.png")

    # louvian data to json 
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



