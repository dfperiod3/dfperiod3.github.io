#!/usr/bin/env python3
"""Build perilous_frontiers/data.json from the community Perilous Frontiers spreadsheet.

Usage:
    python3 tools/build_data.py                # download the sheet and rebuild data.json
    python3 tools/build_data.py path/to.xlsx   # use a local .xlsx export instead

Tabs used:
    Pieces           - piece codes, names and scheme grouping (section header rows)
    Sets by Category - set/bundle codes, names, categories and prices (Web, GF, GF Bundle)
    Set Comps        - set -> piece quantities (bundles are listed per constituent set)
    Bundle Builder   - bundle -> set quantities (informational only)

Requires openpyxl (pip install openpyxl).
"""
import collections
import datetime
import json
import os
import sys
import tempfile
import urllib.request

import openpyxl

SHEET_ID = "19gbXlWYlA12Q_4Mj2LTzqhgbcyVtuQR0fl3VCSm91sg"
EXPORT_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=xlsx"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data.json")


def rows(wb, name):
    return list(wb[name].iter_rows(values_only=True))


def num(v):
    return None if v in (None, "") else float(v)


def load_pieces(wb):
    pieces = {}
    group = None
    for r in rows(wb, "Pieces")[1:]:
        code, full, name = r[0], r[2], r[3]
        if code and not full:  # section header row, e.g. "Desert Scheme"
            group = code.strip()
            continue
        if not full:
            continue
        pieces[full] = {"code": full, "name": name.strip(), "group": group}
    return pieces


def load_sets(wb):
    sets = collections.OrderedDict()
    category = None
    for r in rows(wb, "Sets by Category")[1:]:
        tag, code, name, web, gf, gf_bundle = r[:6]
        if not code:
            if tag and tag.startswith("BELOW THIS LINE"):
                category = "Added in campaign"
            elif tag:
                category = tag.strip()
            continue
        is_bundle = code.startswith("7-B")
        sets[code] = {
            "code": code,
            "name": name.strip(),
            "category": category,
            "bundle": is_bundle,
            "stretchGoal": tag == "SG",
            "price": {
                # A bundle's GF price is the sum of its sets; "GF Bundle" is what it actually costs.
                "gf": num(gf_bundle) if is_bundle and gf_bundle else num(gf),
                "web": num(web),
            },
            "contents": collections.Counter(),
        }
    return sets


def main():
    if len(sys.argv) > 1:
        path = sys.argv[1]
    else:
        path = os.path.join(tempfile.mkdtemp(), "pf.xlsx")
        print(f"Downloading {EXPORT_URL}")
        urllib.request.urlretrieve(EXPORT_URL, path)

    wb = openpyxl.load_workbook(path, data_only=True)
    pieces = load_pieces(wb)
    sets = load_sets(wb)

    for r in rows(wb, "Set Comps")[1:]:
        set_code, piece_code, qty = r[2], r[6], r[8]
        if not set_code:
            continue
        if set_code not in sets:
            sys.exit(f"Set {set_code} in 'Set Comps' is missing from 'Sets by Category'")
        if piece_code not in pieces:
            sys.exit(f"Piece {piece_code} in 'Set Comps' is missing from 'Pieces'")
        sets[set_code]["contents"][piece_code] += int(qty)

    for r in rows(wb, "Bundle Builder")[1:]:
        bundle, set_code, qty = r[0], r[2], r[4]
        if bundle in sets and set_code:
            sets[bundle].setdefault("sets", {})[set_code] = int(qty)

    out_sets = []
    for s in sets.values():
        if s["price"]["gf"] is None:
            print(f"  skipping {s['code']} {s['name']}: no price")
            continue
        if not s["contents"]:
            print(f"  skipping {s['code']} {s['name']}: no contents")
            continue
        s["contents"] = dict(s["contents"])
        out_sets.append(s)

    used = {p for s in out_sets for p in s["contents"]}
    out_pieces = [p for p in pieces.values() if p["code"] in used]

    data = {
        "source": f"https://docs.google.com/spreadsheets/d/{SHEET_ID}",
        "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "pieces": out_pieces,
        "sets": out_sets,
    }
    with open(OUT, "w") as f:
        json.dump(data, f, indent=1)
    print(f"Wrote {len(out_sets)} sets and {len(out_pieces)} pieces to {os.path.normpath(OUT)}")


if __name__ == "__main__":
    main()
