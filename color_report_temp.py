import re
from pathlib import Path
from collections import defaultdict
root = Path('.')
exclude = {'node_modules', 'dist', '.git'}
file_exts = {'.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.svg', '.md'}
patterns = {
    'hex': re.compile(r'#[0-9A-Fa-f]{3,8}\b'),
    'rgba': re.compile(r'rgba\([^\)]*\)'),
    'css-var': re.compile(r'var\(--[a-zA-Z0-9_-]+\)'),
    'tailwind-brand': re.compile(r'\b(?:text|bg|border|from|to|via|ring|stroke|fill)-(?:brand-[^\s:\)]+)\b'),
    'tailwind-color': re.compile(r'\b(?:text|bg|border|from|to|via|ring|stroke|fill)-(?:[a-zA-Z0-9_-]+)-(?:50|100|200|300|400|500|600|700|800|900|950)\b'),
}
files = [p for p in root.rglob('*') if p.is_file() and p.suffix.lower() in file_exts and not any(part in exclude for part in p.parts)]
counts = {k: defaultdict(int) for k in patterns}
files_by = {k: defaultdict(set) for k in patterns}
for p in files:
    txt = p.read_text('utf-8', errors='ignore')
    for name, pat in patterns.items():
        for m in pat.finditer(txt):
            v = m.group(0)
            counts[name][v] += 1
            files_by[name][v].add(str(p))
print('FILES', len(files))
for name in ['hex', 'rgba', 'css-var', 'tailwind-brand', 'tailwind-color']:
    print('---', name.upper(), '---')
    for v, c in sorted(counts[name].items(), key=lambda item: (-item[1], item[0]))[:10]:
        print(f'{v} ({c})')
        paths = sorted(files_by[name][v])
        for p in paths[:5]:
            print('   ', p)
        if len(paths) > 5:
            print('   ', f'... +{len(paths) - 5} more files')
