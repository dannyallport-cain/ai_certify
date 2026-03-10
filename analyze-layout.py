import fitz
doc = fitz.open('146 Fitzwarren Street_Vincente Dos Santos_CE202706_SATISFACTORY.pdf')
for p in range(min(8, len(doc))):
    page = doc[p]
    w = page.rect.width
    h = page.rect.height
    blocks = page.get_text('dict')['blocks']
    print(f'\n=== PAGE {p+1} ({w:.0f}x{h:.0f}) ===')
    rows = {}
    for b in blocks:
        if b['type'] == 0:
            y_key = round(b['bbox'][1] / 5) * 5
            x = b['bbox'][0]
            text = ' '.join(s['text'] for l in b['lines'] for s in l['spans'])[:80]
            if y_key not in rows:
                rows[y_key] = []
            rows[y_key].append((x, text))
    for yk in sorted(rows.keys()):
        items = sorted(rows[yk], key=lambda i: i[0])
        if len(items) > 1:
            parts = ' ||| '.join(f'x={i[0]:.0f}: {i[1]}' for i in items)
            print(f'  y~{yk}: SIDE-BY-SIDE: {parts}')
        else:
            print(f'  y~{yk}: x={items[0][0]:.0f}: {items[0][1]}')
doc.close()
