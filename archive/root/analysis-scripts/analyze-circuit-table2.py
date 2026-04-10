import pymupdf
doc = pymupdf.open("146 Fitzwarren Street_Vincente Dos Santos_CE202706_SATISFACTORY.pdf")
page = doc[6]

blocks = page.get_text("dict")["blocks"]
# Sub-column headers (y 95-145) - the individual column labels
print("=== SUB-COLUMN HEADERS (y 95-150) ===")
items = []
for block in blocks:
    if "lines" not in block:
        continue
    for line in block["lines"]:
        for span in line["spans"]:
            if 95 <= span["origin"][1] <= 150:
                items.append((span['origin'][0], span['origin'][1], span['text']))

items.sort(key=lambda x: (x[0], x[1]))
for x, yv, t in items:
    print(f"  x={x:.0f} y={yv:.0f} '{t}'")

# Data row example (first circuit row y=151-168)
print("\n=== FIRST DATA ROW (y 151-170) ===")
items2 = []
for block in blocks:
    if "lines" not in block:
        continue
    for line in block["lines"]:
        for span in line["spans"]:
            if 151 <= span["origin"][1] <= 170:
                items2.append((span['origin'][0], span['origin'][1], span['text']))

items2.sort(key=lambda x: x[0])
for x, yv, t in items2:
    print(f"  x={x:.0f} y={yv:.0f} '{t}'")

# Calculate column widths from vertical lines
v_lines = []
paths = page.get_drawings()
for path in paths:
    for item in path["items"]:
        if item[0] == "l":
            p1, p2 = item[1], item[2]
            if abs(p1.x - p2.x) < 1 and abs(p2.y - p1.y) > 30:
                v_lines.append(round(p1.x))

v_unique = sorted(set(v_lines))
print(f"\n=== MAJOR COLUMN BOUNDARIES (long vertical lines) ===")
print(f"Total: {len(v_unique)}")
for i, x in enumerate(v_unique):
    w = v_unique[i+1] - x if i < len(v_unique)-1 else 0
    print(f"  x={x}  width_to_next={w}")
