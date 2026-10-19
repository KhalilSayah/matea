"""MATEA — fabrique le paquet d'aperçu hébergé sur claude.ai.

    python tools/build-preview.py

Le site réel, celui qu'on déploie sur Vercel, n'est pas touché. L'hébergeur
d'aperçu enveloppe lui-même la page d'entrée dans son propre squelette de
document : si on lui donne un index.html complet, on se retrouve avec deux
documents imbriqués. Ce script produit donc dans .preview/ une copie où seul
index.html est dépouillé de <!doctype>, <html>, <head> et <body>. Les autres
pages sont servies telles quelles et gardent le leur.

Sortie : .preview/ (ignoré par git).
"""

import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, '.preview')


def strip_shell(html):
    """Retire le squelette de document, garde <title>, les <link> et le corps."""
    head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
    body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)

    keep = []
    title = re.search(r'<title>.*?</title>', head, re.S)
    if title:
        keep.append(title.group(0))
    # les feuilles de style restent : polices Google et CSS du site
    keep += re.findall(r'<link[^>]+rel="stylesheet"[^>]*>', head)
    return '\n'.join(keep) + '\n' + body.strip() + '\n'


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)

    with open(os.path.join(ROOT, 'index.html'), encoding='utf-8') as f:
        index = f.read()
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(strip_shell(index))

    for page in ('commander.html', 'admin.html'):
        shutil.copy(os.path.join(ROOT, page), os.path.join(OUT, page))

    shutil.copytree(os.path.join(ROOT, 'assets'), os.path.join(OUT, 'assets'))

    n = sum(len(files) for _, _, files in os.walk(OUT))
    print('.preview/ construit —', n, 'fichiers')


if __name__ == '__main__':
    main()
