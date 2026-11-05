import hashlib
import json
import os
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from .models import Base, Faculty, Meta, Program, ProgramSubject, Subject
from .parsers.common import fold, slugify

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg://puskica:puskica@localhost:5432/puskica")
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/data/uploads"))
SEED_FILE = Path(os.environ.get("SEED_FILE", Path(__file__).resolve().parents[1] / "seed" / "faculties.json"))

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=10)
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)


def seed(db: Session):
    """Идемпотентно заливает факультеты/программы/предметы из seed-файла. Материалы не трогает."""
    if not SEED_FILE.exists():
        return
    raw = SEED_FILE.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    cur = db.get(Meta, "seed_hash")
    if cur and cur.value == digest:
        return
    data = json.loads(raw)
    for f in data:
        fac = db.scalar(select(Faculty).where(Faculty.slug == f["slug"]))
        if not fac:
            fac = Faculty(slug=f["slug"])
            db.add(fac)
        fac.name, fac.short, fac.city = f["name"], f["short"], f["city"]
        fac.university, fac.url = f["university"], f.get("url")
        fac.search = fold(f"{f['name']} {f['short']} {f['city']}")
        db.flush()
        existing = {s.slug: s for s in db.scalars(select(Subject).where(Subject.faculty_id == fac.id))}
        by_code = {s.code: s for s in existing.values() if s.code}
        by_name = {fold(s.name): s for s in existing.values()}
        for p in f["programs"]:
            prog = db.scalar(select(Program).where(Program.faculty_id == fac.id, Program.slug == p["slug"]))
            if not prog:
                prog = Program(faculty_id=fac.id, slug=p["slug"])
                db.add(prog)
            prog.name, prog.level = p["name"], p.get("level", "osnovne")
            db.flush()
            links = {ps.subject_id: ps for ps in db.scalars(select(ProgramSubject).where(ProgramSubject.program_id == prog.id))}
            for s in p["subjects"]:
                subj = (by_code.get(s["code"]) if s.get("code") else None) or by_name.get(fold(s["name"]))
                if not subj:
                    base = slugify(s["name"]) or "predmet"
                    slug, i = base, 2
                    while slug in existing:
                        slug, i = f"{base}-{i}", i + 1
                    subj = Subject(faculty_id=fac.id, slug=slug, name=s["name"], code=s.get("code"),
                                   espb=s.get("espb"), hours=s.get("hours"), search=fold(s["name"]))
                    db.add(subj)
                    db.flush()
                    existing[slug] = subj
                    if subj.code:
                        by_code[subj.code] = subj
                    by_name[fold(subj.name)] = subj
                if subj.id not in links:
                    ps = ProgramSubject(program_id=prog.id, subject_id=subj.id, semester=s["semester"],
                                        status=s.get("status", "obavezni"))
                    db.add(ps)
                    links[subj.id] = ps
    if cur:
        cur.value = digest
    else:
        db.add(Meta(key="seed_hash", value=digest))
    db.commit()
