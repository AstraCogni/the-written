#!/usr/bin/env python3
"""
SCORM Builder — build script
Inlines all CSS and JS source files into dist/SCORM_Builder.html.

Usage:
  python3 build.py

Output:
  dist/SCORM_Builder.html  — self-contained single-file builder, ready to ship
"""
import os, re

BASE = os.path.dirname(os.path.abspath(__file__))

def read(rel):
    with open(os.path.join(BASE, rel), encoding='utf-8') as f:
        return f.read()

def build():
    html = read('index.html')

    # ── Inline CSS ────────────────────────────────────────────────────────────
    css = read('builder/css/builder.css')
    html = html.replace(
        '<link rel="stylesheet" href="builder/css/builder.css">',
        f'<style>\n{css}</style>'
    )

    # ── Inline JS files in load order ─────────────────────────────────────────
    js_files = [
        'builder/js/presets.js',
        'builder/js/parser.js',
        'builder/js/generator.js',
        'builder/js/preview.js',
        'builder/js/app.js',
    ]

    for js_path in js_files:
        tag     = f'<script src="{js_path}"></script>'
        content = read(js_path)
        html    = html.replace(tag, f'<script>\n{content}\n</script>')

    # ── Write output ──────────────────────────────────────────────────────────
    os.makedirs(os.path.join(BASE, 'docs'), exist_ok=True)
    out = os.path.join(BASE, 'docs', 'index.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)

    size_kb = os.path.getsize(out) / 1024
    print(f'Built: docs/index.html  ({size_kb:.1f} KB)')
    print('Open docs/index.html in Chrome to test, or serve via:')
    print('  python3 -m http.server 8000')

if __name__ == '__main__':
    build()
