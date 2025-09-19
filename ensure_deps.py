# -*- coding: utf-8 -*-
"""
Módulo utilitário para garantir dependências via pip em tempo de execução.
Uso:
    from ensure_deps import ensure
    ensure({
        "pandas": ">=2.2",
        "numpy": ">=1.26",
        "networkx": ">=3.3",
        "scikit-learn": ">=1.5",
        "matplotlib": ">=3.8",
        "python-louvain": ">=0.16",
    }, extra_index_url=None, find_links=None, no_index=False)

Obs.: Para funcionar offline, empacote os wheels em uma pasta e chame:
    ensure(pkgs, find_links="wheels", no_index=True)
"""
import sys, subprocess, importlib
from typing import Dict, Optional

def _pip(*args: str) -> int:
    """
    Chama pip via subprocess.
    Args: argumentos para pip, ex: "install", "pandas>=2.2

    Returns:
        int: código de saída do pip
    """

    cmd = [sys.executable, "-m", "pip"] + list(args)
    return subprocess.call(cmd)


def _installed(modname: str) -> bool:
    """
    Verifica se um módulo está instalado.
    Args:
        modname (str): nome do módulo

    Returns:
        bool: True se instalado, False caso contrário
    """
    try:
        importlib.import_module(modname)
        return True
    except Exception:
        return False
    

def ensure(pkgs: Dict[str, str],
          extra_index_url: Optional[str] = None,
          find_links: Optional[str] = None,
          no_index: bool = False) -> None:
    """
    Garante instalação (ou atualização) de pacotes.
    Args:
        pkgs: dict {nome_modulo_ou_pacote: spec_version}, ex: {"pandas": ">=2.2"}
        extra_index_url: URL adicional para buscar pacotes (opcional)
        find_links: caminho local ou URL para buscar pacotes (opcional)
        no_index: se True, não usa o índice PyPI padrão (útil para ambientes offline)
    """
    # Atualiza pip básico
    _pip("install", "--upgrade", "pip", "setuptools", "wheel")

    base_args = ["install", "--upgrade"]
    if extra_index_url:
        base_args += ["--extra-index-url", extra_index_url]
    if find_links:
        base_args += ["--find-links", find_links]
    if no_index:
        base_args += ["--no-index"]

    to_install = []
    for name, spec in pkgs.items():
        if not _installed(name):
            to_install.append(f"{name}{spec}")
    if to_install:
        _pip(*base_args, *to_install)
