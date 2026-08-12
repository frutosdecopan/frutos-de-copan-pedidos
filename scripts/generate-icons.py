"""
Genera todos los íconos de la app (favicon, apple-touch-icon, íconos PWA
para "instalar" en el celular) a partir del logo fuente ("logo FDC.jpg"),
usando Pillow. Se corre una sola vez (o cuando cambie el logo) — no forma
parte del build normal.

Uso: python scripts/generate-icons.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "logo-source.jpg"
OUT = ROOT / "public"
OUT.mkdir(exist_ok=True)

BG_COLOR = (255, 162, 0)  # muestreado del propio logo (naranja de fondo)

def load_source() -> Image.Image:
    im = Image.open(SOURCE).convert("RGB")
    # Ya es cuadrada (1500x1500), pero por si acaso se recorta al lado menor.
    side = min(im.size)
    left = (im.width - side) // 2
    top = (im.height - side) // 2
    return im.crop((left, top, left + side, top + side))

def save_png(im: Image.Image, size: int, name: str):
    resized = im.resize((size, size), Image.LANCZOS)
    resized.save(OUT / name, "PNG")
    print(f"  {name} ({size}x{size})")

def make_maskable(im: Image.Image, size: int, name: str, safe_ratio: float = 0.7):
    # Android "maskable": el sistema puede recortar en círculo/redondeado —
    # el contenido importante debe caber en la zona segura central (~66-80%).
    # Se escala el logo al `safe_ratio` del lienzo y se rellena el resto con
    # el mismo naranja de fondo, para que no se vea ningún borde/costura.
    canvas = Image.new("RGB", (size, size), BG_COLOR)
    inner = int(size * safe_ratio)
    logo_small = im.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(logo_small, (offset, offset))
    canvas.save(OUT / name, "PNG")
    print(f"  {name} ({size}x{size}, maskable, safe_ratio={safe_ratio})")

def main():
    print(f"Fuente: {SOURCE}")
    im = load_source()

    print("Generando PNGs...")
    save_png(im, 16, "favicon-16x16.png")
    save_png(im, 32, "favicon-32x32.png")
    save_png(im, 180, "apple-touch-icon.png")
    save_png(im, 192, "icon-192.png")
    save_png(im, 512, "icon-512.png")

    print("Generando ícono maskable (Android)...")
    make_maskable(im, 512, "icon-512-maskable.png")

    print("Generando favicon.ico (multi-resolución)...")
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    im.resize((256, 256), Image.LANCZOS).save(
        OUT / "favicon.ico", format="ICO", sizes=ico_sizes
    )
    print("  favicon.ico (16/32/48)")

    print("Listo — todo en", OUT)

if __name__ == "__main__":
    main()
