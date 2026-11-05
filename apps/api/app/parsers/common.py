"""Общие утилиты для парсеров факультетов."""
import re
import time
import unicodedata
import urllib.request

UA = "Mozilla/5.0 (compatible; PuskicaBot/1.0; +https://puskica.com/bot)"

CYR2LAT = {
    "А": "A", "Б": "B", "В": "V", "Г": "G", "Д": "D", "Ђ": "Đ", "Е": "E", "Ж": "Ž", "З": "Z", "И": "I",
    "Ј": "J", "К": "K", "Л": "L", "Љ": "Lj", "М": "M", "Н": "N", "Њ": "Nj", "О": "O", "П": "P", "Р": "R",
    "С": "S", "Т": "T", "Ћ": "Ć", "У": "U", "Ф": "F", "Х": "H", "Ц": "C", "Ч": "Č", "Џ": "Dž", "Ш": "Š",
}
CYR2LAT.update({k.lower(): v.lower() for k, v in list(CYR2LAT.items())})


def cyr_to_lat(s: str) -> str:
    return "".join(CYR2LAT.get(ch, ch) for ch in s)


def fold(s: str) -> str:
    """Латиница без диакритики, нижний регистр — для поиска и slug."""
    s = cyr_to_lat(s).replace("đ", "dj").replace("Đ", "Dj")
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c)).lower()


def slugify(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", fold(s)).strip("-")
    return s[:80]


def fetch(url: str, retries: int = 3) -> str:
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.read().decode("utf-8", "ignore")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f"fetch failed {url}: {last}")


def clean(html: str) -> str:
    s = re.sub(r"<[^>]+>", " ", html)
    s = s.replace("&nbsp;", " ").replace("&amp;", "&")
    return re.sub(r"\s+", " ", s).strip()


def table_rows(html: str):
    html = re.sub(r"<script.*?</script>|<style.*?</style>", "", html, flags=re.S)
    for r in re.findall(r"<tr.*?</tr>", html, re.S):
        yield [clean(x) for x in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, re.S)]


def to_int(s, default=None):
    m = re.search(r"\d+", s or "")
    return int(m.group()) if m else default
