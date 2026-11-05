#!/usr/bin/env python3
"""
Builds public/fonts/material-symbols-outlined.woff2: the Material Symbols
Outlined font cut down to the icons this storefront uses.

The full variable font (scripts/fonts/, ~4 MB) holds 4,300+ icons over four
axes; the site uses a few hundred icons at one optical size and grade, so the
shipped file keeps only those ligatures, pins opsz=24 and GRAD=0, and keeps
the FILL and wght axes (filled icons and icon weights still work).

Any lowercase string literal in src/ counts as a possible icon name, which
also covers names chosen at runtime (`name={done ? "check" : "close"}`).
Extra names cost nothing; a missing one renders as plain text.

Run after adding a new icon:
    pip install fonttools brotli
    python3 scripts/build-icon-font.py          # rebuild
    python3 scripts/build-icon-font.py --check  # fail if an icon in use is missing
"""
import io
import os
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "scripts/fonts/material-symbols-outlined.full.woff2")
TARGET = os.path.join(ROOT, "public/fonts/material-symbols-outlined.woff2")


def names_in_code():
    found = set()
    for root, _, files in os.walk(os.path.join(ROOT, "src")):
        for name in files:
            if name.endswith((".tsx", ".ts", ".jsx", ".js")):
                text = open(os.path.join(root, name), encoding="utf-8").read()
                found.update(re.findall(r"[\"'`]([a-z][a-z0-9_]{1,40})[\"'`]", text))
                found.update(re.findall(r">\s*([a-z][a-z0-9_]{1,40})\s*</span>", text))
    return found


def ligatures(font):
    """Yields (table, first glyph, ligature, spelled name) for every icon ligature."""
    spell = {glyph: chr(code) for code, glyph in font.getBestCmap().items()}
    for lookup in font["GSUB"].table.LookupList.Lookup:
        for sub in lookup.SubTable:
            table = sub.ExtSubTable if lookup.LookupType == 7 else sub
            for first, ligs in list(getattr(table, "ligatures", {}).items()):
                for lig in ligs:
                    yield table, first, lig, spell.get(first, "") + "".join(spell.get(c, "?") for c in lig.Component)


def build(wanted):
    font = TTFont(SOURCE, lazy=False)
    keep, glyphs = {}, set()
    for table, first, lig, name in ligatures(font):
        if name in wanted:
            keep.setdefault((id(table), first), []).append(lig)
            glyphs.add(lig.LigGlyph)
    for lookup in font["GSUB"].table.LookupList.Lookup:
        for sub in lookup.SubTable:
            table = sub.ExtSubTable if lookup.LookupType == 7 else sub
            if hasattr(table, "ligatures"):
                table.ligatures = {f: keep[(id(table), f)] for f in table.ligatures if (id(table), f) in keep}

    font = instancer.instantiateVariableFont(font, {"opsz": 24, "GRAD": 0})
    buf = io.BytesIO()
    font.flavor = None
    font.save(buf)
    buf.seek(0)
    font = TTFont(buf, lazy=False)

    options = subset.Options()
    options.layout_features = ["liga", "rlig", "calt", "ccmp"]
    options.notdef_outline = True
    options.name_IDs = ["*"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(text="".join(sorted(set("".join(wanted)))) + " ", glyphs=sorted(glyphs))
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(TARGET)
    print(f"{TARGET}: {len(glyphs)} icons, {os.path.getsize(TARGET) // 1024} KB")


def check():
    """Icons written literally in the markup must exist in the shipped font."""
    shipped = {name for *_, name in ligatures(TTFont(TARGET))}
    available = {name for *_, name in ligatures(TTFont(SOURCE))}
    used = set()
    for root, _, files in os.walk(os.path.join(ROOT, "src")):
        for name in files:
            if name.endswith(".tsx"):
                text = open(os.path.join(root, name), encoding="utf-8").read()
                used.update(re.findall(r"\bname=\"([a-z0-9_]+)\"", text))
                used.update(re.findall(r"material-symbols-outlined[^\"]*\"[^>]*>\s*([a-z0-9_]+)\s*<", text))
    missing = sorted(n for n in used & available if n not in shipped)
    if missing:
        sys.exit(f"Icons missing from the font, run scripts/build-icon-font.py: {', '.join(missing)}")
    print(f"All {len(used & available)} icons in use are in the font.")


if __name__ == "__main__":
    check() if "--check" in sys.argv else build(names_in_code())
