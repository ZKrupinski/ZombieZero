"""Generate the Android shell from the same dist/ used by GitHub Pages.
Run before and after 'npx cap add android' (see workflow). Never edits dist/.
"""
import argparse
import os
from pathlib import Path
import re
import shutil
import xml.etree.ElementTree as ET
from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
WWW = HERE / "www"
APP = HERE / "android" / "app"
RES = APP / "src" / "main" / "res"
ANDROID = "http://schemas.android.com/apk/res/android"

def replace_once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError(f"Native adapter needs review: expected exactly one {old!r}")
    return text.replace(old, new, 1)

def prepare_web():
    if WWW.exists():
        shutil.rmtree(WWW)
    shutil.copytree(ROOT / "dist", WWW)
    js = WWW / "app.js"
    content = js.read_text(encoding="utf-8")
    # Android owns fullscreen, not the DOM. Never show browser's immersive toast.
    content = replace_once(content,
        "const immersivePWA=()=>window.matchMedia('(display-mode: fullscreen)').matches&&!document.fullscreenElement;",
        "const immersivePWA=()=>window.Capacitor?.isNativePlatform?.()===true||(window.matchMedia('(display-mode: fullscreen)').matches&&!document.fullscreenElement);")
    content = replace_once(content,
        "if('serviceWorker' in navigator){",
        "if(window.Capacitor?.isNativePlatform?.()!==true&&'serviceWorker' in navigator){")
    # Link sharing must point to the actual public site rather than https://localhost.
    # Existing web URL handling is left unchanged unless it uses the location href.
    js.write_text(content, encoding="utf-8")
    # The native asset server provides all files, so no browser SW cache is needed.
    (WWW / "sw.js").unlink(missing_ok=True)
    # Native-only render budget and diagnostic UI; never modify the Pages copy.
    shutil.copyfile(HERE / "native-performance.js", WWW / "native-performance.js")
    html = WWW / "index.html"
    markup = html.read_text(encoding="utf-8")
    markup = replace_once(markup, '<script src="game.js?', '<script src="native-performance.js"></script><script src="game.js?')
    html.write_text(markup, encoding="utf-8")
    game = WWW / "game.js"
    text = game.read_text(encoding="utf-8")
    text = replace_once(text, "function resizeCanvas(){", "function resizeCanvas(drawNow=true){")
    text = replace_once(text,
        "const width=Math.max(1,Math.round(widthCss*dpr));\n const height=Math.max(1,Math.round(heightCss*dpr));",
        "const {width,height}=window.ZZNativePerf.backingSize(widthCss,heightCss,dpr);")
    text = replace_once(text,
        "g.imageSmoothingEnabled=true;\n draw();\n}",
        "g.imageSmoothingEnabled=true;\n if(drawNow!==false)draw();\n}")
    text = replace_once(text,
        "warmTrailLighting();warmSelectedBallTint();draw();",
        "if(window.ZZNativePerf.takeResize())resizeCanvas(false);\n warmTrailLighting();warmSelectedBallTint();draw();")
    text = replace_once(text,
        "Object.assign(perfStats,{tier:perfTier,updateMs,drawMs,workMs});",
        "Object.assign(perfStats,{tier:perfTier,updateMs,drawMs,workMs});\n window.ZZNativePerf.observe(t,elapsed,perfStats,mode,c,fxRenderer);")
    game.write_text(text, encoding="utf-8")

def prepare_android():
    src = APP / "src" / "main"
    target = src / "java" / "com" / "rebeltree" / "zombieballs" / "MainActivity.java"
    if not target.is_file():
        raise RuntimeError(f"Missing generated activity: {target}")
    shutil.copyfile(HERE / "MainActivity.java", target)
    manifest = src / "AndroidManifest.xml"
    ET.register_namespace("android", ANDROID)
    tree = ET.parse(manifest)
    root = tree.getroot()
    ns = "{" + ANDROID + "}"
    activity = root.find("./application/activity")
    if activity is None:
        raise RuntimeError("Missing Android launcher activity")
    activity.set(ns+"screenOrientation", "portrait")
    root.find("application").set(ns+"hardwareAccelerated", "true")
    activity.set(ns+"hardwareAccelerated", "true")
    if not any(p.get(ns+"name")=="android.permission.VIBRATE" for p in root.findall("uses-permission")):
        ET.SubElement(root, "uses-permission", {ns+"name":"android.permission.VIBRATE"})
    tree.write(manifest, encoding="utf-8", xml_declaration=True)

    # Reuse approved v446 icons; generate both Android legacy and adaptive assets.
    icon = Image.open(WWW / "icons" / "icon-512-v446.png").convert("RGBA")
    mask = Image.open(WWW / "icons" / "icon-maskable-512-v446.png").convert("RGB")
    assert icon.size == mask.size == (512,512)
    for density, size in {"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}.items():
        folder = RES / ("mipmap-"+density)
        folder.mkdir(parents=True, exist_ok=True)
        for name in ("ic_launcher","ic_launcher_round"):
            icon.resize((size,size), Image.Resampling.LANCZOS).save(folder / (name+".png"))
        # Adaptive icon viewport is 108dp; keep the existing safe-zone within 72dp.
        dim = int(size * 108 / 48)
        fg = Image.new("RGBA",(dim,dim))
        inset = int(dim * .78)
        fg.alpha_composite(mask.resize((inset,inset), Image.Resampling.LANCZOS).convert("RGBA"),
                           ((dim-inset)//2,(dim-inset)//2))
        fg.save(folder / "ic_launcher_foreground.png")
    adaptive = RES / "mipmap-anydpi-v26"
    adaptive.mkdir(parents=True, exist_ok=True)
    for name in ("ic_launcher","ic_launcher_round"):
        (adaptive / (name+".xml")).write_text(
            '<?xml version="1.0" encoding="utf-8"?>\n'
            '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
            '  <background android:drawable="@color/zz_launcher_background" />\n'
            '  <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
            '</adaptive-icon>\n', encoding="utf-8")
    (RES / "values" / "zz_launcher_colors.xml").write_text(
        '<resources><color name="zz_launcher_background">#101326</color></resources>\n', encoding="utf-8")
    # Replace generated Capacitor splash artwork without changing the game title.
    for splash in RES.glob("drawable*/splash.png"):
        with Image.open(splash) as old:
            w,h=old.size
        canvas=Image.new("RGB",(w,h),"#101326")
        size=max(1,int(min(w,h)*.32))
        thumb=icon.resize((size,size),Image.Resampling.LANCZOS)
        canvas.paste(thumb,((w-size)//2,(h-size)//2),thumb)
        canvas.save(splash)
    gradle = APP / "build.gradle"
    text = gradle.read_text(encoding="utf-8")
    code = int(os.environ.get("GITHUB_RUN_NUMBER","1"))
    text,n = re.subn(r"\bversionCode\s+\d+",f"versionCode {code}",text,count=1)
    if n != 1:
        raise RuntimeError("Missing Android versionCode")
    text,n = re.subn(r'versionName\s+"[^"]+"',f'versionName "0.1.{code}"',text,count=1)
    if n != 1:
        raise RuntimeError("Missing Android versionName")
    gradle.write_text(text,encoding="utf-8")

if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("phase",choices=("web","android"))
    args=parser.parse_args()
    (prepare_web if args.phase=="web" else prepare_android)()
