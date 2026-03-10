import pymupdf
doc = pymupdf.open("146 Fitzwarren Street_Vincente Dos Santos_CE202706_SATISFACTORY.pdf")
page = doc[6]
w, h = page.rect.width, page.rect.height
print(f"Page 7: {w} x {h}")

paths = page.get_drawings()
print(f"\nTotal drawing objects: {len(paths)}")

h_lines = []
v_lines = []
for path in paths:
    for item in path["items"]:
        if item[0] == "l":
            p1, p2 = item[1], item[2]
            if abs(p1.y - p2.y) < 1:
                h_lines.append((round(p1.x,1), round(p1.y,1), round(p2.x,1)))
            elif abs(p1.x - p2.x) < 1:
                v_lines.append((round(p1.x,1), round(p1.y,1), round(p2.y,1)))

v_x_positions = sorted(set(round(v[0]) for v in v_lines))
print(f"\nVertical line X positions (column boundaries): {len(v_x_positions)}")
for x in v_x_positions:
    print(f"  x={x}")

h_y_positions = sorted(set(round(h[1]) for h in h_lines))
print(f"\nHorizontal line Y positions (row boundaries): {len(h_y_positions)}")
for yv in h_y_positions:
    print(f"  y={yv}")

blocks = page.get_text("dict")["blocks"]
print("\n=== HEADER TEXT (y < 130) ===")
for block in blocks:
    if "lines" not in block:
        continue
    for line in block["lines"]:
        for span in line["spans"]:
            if span["origin"][1] < 130:
                print(f"  y={span['origin'][1]:.0f} x={span['origin'][0]:.0f} size={span['size']:.1f} '{span['text']}'")

# Also check for rectangles (filled cells)
print("\n=== FILLED RECTANGLES (header area y < 130) ===")
for path in paths:
    if path.get("fill"):
        for item in path["items"]:
            if item[0] == "re":
                rect = item[1]
                if rect.y0 < 130:
                    print(f"  rect: x={rect.x0:.0f}-{rect.x1:.0f} y={rect.y0:.0f}-{rect.y1:.0f} fill={path['fill']}")

# Show the group headers - text between y=70 and y=90 which is the group header row
print("\n=== GROUP HEADER ROW TEXT (y 70-95) ===")
for block in blocks:
    if "lines" not in block:
        continue
    for line in block["lines"]:
        for span in line["spans"]:
            if 70 <= span["origin"][1] <= 95:
                print(f"  y={span['origin'][1]:.0f} x={span['origin'][0]:.0f} size={span['size']:.1f} bold={'Bold' in span.get('font','')} '{span['text']}'")
