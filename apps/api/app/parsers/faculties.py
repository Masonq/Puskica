"""Парсеры наставних планов. Каждый возвращает dict факультета с программами и предметами.

Формат:
{slug, name, short, city, university, url,
 programs: [{slug, name, level, subjects: [{code, name, semester, espb, hours, status}]}]}
"""
import re

from .common import cyr_to_lat, fetch, slugify, table_rows, to_int

ETF = "https://www.etf.bg.ac.rs"
MATF = "https://www.matf.bg.ac.rs"


def _etf_plan(url: str):
    subs, sem, cols = [], None, None
    for c in table_rows(fetch(url)):
        if len(c) == 1:
            m = re.match(r"(\d+)\.\s*semestar", c[0], re.I)
            if m:
                sem = int(m.group(1))
            continue
        low = [x.lower() for x in c]
        if "predmet" in low:
            cols = {k: low.index(k) for k in ("šifra", "predmet", "status", "krediti") if k in low}
            cols["hours"] = next((i for i, x in enumerate(low) if x.startswith("časovi")), None)
            continue
        if not cols or not sem or len(c) <= cols["predmet"]:
            continue
        name = re.sub(r"\s*\d\)\s*$", "", c[cols["predmet"]]).strip()
        name = re.sub(r"\s+", " ", name)
        if not name or name.lower().startswith(("izborni blok", "ukupno")):
            continue
        espb = to_int(c[cols["krediti"]]) if "krediti" in cols and cols["krediti"] < len(c) else None
        if espb is None:
            continue
        code = c[cols["šifra"]].split()[0] if "šifra" in cols and c[cols["šifra"]] else None
        st = c[cols["status"]].strip().upper() if "status" in cols else "O"
        h = cols.get("hours")
        subs.append({
            "code": code, "name": name, "semester": sem, "espb": espb,
            "hours": (c[h].replace(" ", "") or None) if h is not None and h < len(c) else None,
            "status": "obavezni" if st == "O" else "izborni",
        })
    return subs


def parse_etf():
    programs = [{
        "slug": "softversko-inzenjerstvo",
        "name": "Softversko inženjerstvo (SI)",
        "level": "osnovne",
        "subjects": _etf_plan(f"{ETF}/sr-lat/studiranje/osnovne-akademske-studije/softversko-inzenjerstvo-si/nastavni-plan-i-program-2024"),
    }]
    base = f"{ETF}/sr-lat/studiranje/osnovne-akademske-studije/er/2019"
    first = _etf_plan(f"{base}/prva-godina-studijskog-programa-er")
    modules = [
        ("racunarska-tehnika-i-informatika", "ER — Računarska tehnika i informatika"),
        ("elektronika-i-digitalni-sistemi", "ER — Elektronika i digitalni sistemi"),
        ("energetika", "ER — Energetika"),
        ("signali-i-sistemi", "ER — Signali i sistemi"),
        ("telekomunikacije-i-informacione-tehnologije", "ER — Telekomunikacije i IT"),
        ("fizicka-elektronika", "ER — Fizička elektronika"),
    ]
    for slug, name in modules:
        try:
            rest = _etf_plan(f"{base}/{slug}")
        except Exception:  # noqa: BLE001
            rest = []
        programs.append({"slug": f"er-{slug}", "name": name, "level": "osnovne", "subjects": first + rest})
    return {
        "slug": "etf", "name": "Elektrotehnički fakultet", "short": "ETF", "city": "Beograd",
        "university": "Univerzitet u Beogradu", "url": ETF, "programs": programs,
    }


SEM_WORDS = {"PRVI": 1, "DRUGI": 2, "TREĆI": 3, "TRECI": 3, "ČETVRTI": 4, "PETI": 5, "ŠESTI": 6,
             "SEDMI": 7, "OSMI": 8}


def _matf_plan(url: str):
    subs, year, sem_in_year = [], 0, None
    for c in table_rows(fetch(url)):
        c = [cyr_to_lat(x) for x in c]
        if not c:
            continue
        m = re.match(r"(\d)\.\s*godina", c[0], re.I)
        if m:
            year = int(m.group(1))
            continue
        w = c[0].split(" ")[0].upper()
        if w in SEM_WORDS and "SEMESTAR" in c[0].upper():
            s = SEM_WORDS[w]
            sem_in_year = s if s > 2 else (year - 1) * 2 + s
            continue
        if sem_in_year and len(c) >= 5 and c[0] and to_int(c[-1]):
            name = c[0].strip()
            low = name.lower()
            if low.startswith("izborni") or low.startswith("ukupno") or "blok" in low:
                continue
            name = re.sub(r"\s*\((dva|два) semestra\)", "", name, flags=re.I).strip()
            if any(x["name"] == name for x in subs):
                continue
            subs.append({
                "code": None, "name": name, "semester": sem_in_year, "espb": to_int(c[-1]),
                "hours": f"{c[1] or 0}+{c[2] or 0}+{c[3] or 0}", "status": "obavezni",
            })
    return subs


def parse_matf():
    progs = [
        ("informatika", "Informatika", "osnovne-informatika"),
        ("matematika", "Matematika", "osnovne-matematika"),
        ("astronomija-i-astrofizika", "Astronomija i astrofizika", "osnovne-astronomija-astrofizika"),
    ]
    programs = []
    for slug, name, path in progs:
        try:
            programs.append({"slug": slug, "name": name, "level": "osnovne",
                             "subjects": _matf_plan(f"{MATF}/studije/osnovne-studije/{path}/")})
        except Exception:  # noqa: BLE001
            pass
    return {
        "slug": "matf", "name": "Matematički fakultet", "short": "MATF", "city": "Beograd",
        "university": "Univerzitet u Beogradu", "url": MATF, "programs": programs,
    }


# Все факультеты Univerziteta u Beogradu — страницы существуют сразу, предметы добавляются парсерами и студентами.
UB_FACULTIES = [
    ("arhitektonski", "Arhitektonski fakultet", "ARH", "https://www.arh.bg.ac.rs"),
    ("biologija", "Biološki fakultet", "BIO", "https://www.bio.bg.ac.rs"),
    ("ekonomski", "Ekonomski fakultet", "EKOF", "https://www.ekof.bg.ac.rs"),
    ("etf", "Elektrotehnički fakultet", "ETF", "https://www.etf.bg.ac.rs"),
    ("fakultet-bezbednosti", "Fakultet bezbednosti", "FB", "https://www.fb.bg.ac.rs"),
    ("fasper", "Fakultet za specijalnu edukaciju i rehabilitaciju", "FASPER", "https://www.fasper.bg.ac.rs"),
    ("fizicka-hemija", "Fakultet za fizičku hemiju", "FFH", "https://www.ffh.bg.ac.rs"),
    ("fizicki", "Fizički fakultet", "FF", "https://www.ff.bg.ac.rs"),
    ("fakultet-sporta", "Fakultet sporta i fizičkog vaspitanja", "FSFV", "https://www.fsfv.bg.ac.rs"),
    ("filoloski", "Filološki fakultet", "FIL", "https://www.fil.bg.ac.rs"),
    ("filozofski", "Filozofski fakultet", "FILOZ", "https://www.f.bg.ac.rs"),
    ("fon", "Fakultet organizacionih nauka", "FON", "https://www.fon.bg.ac.rs"),
    ("fpn", "Fakultet političkih nauka", "FPN", "https://www.fpn.bg.ac.rs"),
    ("geografski", "Geografski fakultet", "GEF", "https://www.gef.bg.ac.rs"),
    ("gradjevinski", "Građevinski fakultet", "GRF", "https://www.grf.bg.ac.rs"),
    ("hemijski", "Hemijski fakultet", "HEM", "https://www.chem.bg.ac.rs"),
    ("medicinski", "Medicinski fakultet", "MED", "https://www.med.bg.ac.rs"),
    ("masinski", "Mašinski fakultet", "MAS", "https://www.mas.bg.ac.rs"),
    ("matf", "Matematički fakultet", "MATF", "https://www.matf.bg.ac.rs"),
    ("pravni", "Pravni fakultet", "PRAVNI", "https://www.ius.bg.ac.rs"),
    ("poljoprivredni", "Poljoprivredni fakultet", "AGRIF", "https://www.agrif.bg.ac.rs"),
    ("rudarsko-geoloski", "Rudarsko-geološki fakultet", "RGF", "https://www.rgf.bg.ac.rs"),
    ("saobracajni", "Saobraćajni fakultet", "SF", "https://www.sf.bg.ac.rs"),
    ("sumarski", "Šumarski fakultet", "SFB", "https://www.sfb.bg.ac.rs"),
    ("stomatoloski", "Stomatološki fakultet", "STOM", "https://www.stomf.bg.ac.rs"),
    ("tehnolosko-metalurski", "Tehnološko-metalurški fakultet", "TMF", "https://www.tmf.bg.ac.rs"),
    ("uciteljski", "Učiteljski fakultet", "UF", "https://www.uf.bg.ac.rs"),
    ("veterinarski", "Fakultet veterinarske medicine", "VET", "https://www.vet.bg.ac.rs"),
    ("farmaceutski", "Farmaceutski fakultet", "PHARM", "https://www.pharmacy.bg.ac.rs"),
    ("pravoslavni-bogoslovski", "Pravoslavni bogoslovski fakultet", "PBF", "https://www.bfspc.bg.ac.rs"),
    ("tehnicki-bor", "Tehnički fakultet u Boru", "TFBOR", "https://www.tfbor.bg.ac.rs"),
]

PARSERS = {"etf": parse_etf, "matf": parse_matf}


def collect():
    out = []
    for slug, name, short, url in UB_FACULTIES:
        fac = {"slug": slug, "name": name, "short": short, "city": "Beograd" if slug != "tehnicki-bor" else "Bor",
               "university": "Univerzitet u Beogradu", "url": url, "programs": []}
        if slug in PARSERS:
            try:
                parsed = PARSERS[slug]()
                fac["programs"] = parsed["programs"]
            except Exception as e:  # noqa: BLE001
                print("parser failed", slug, e)
        out.append(fac)
    for f in out:
        for p in f["programs"]:
            p["slug"] = slugify(p["slug"])
    return out
