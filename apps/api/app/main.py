import hashlib
import os
import re
import secrets
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from .db import UPLOAD_DIR, get_db, init_db
from .models import Faculty, Material, Program, ProgramSubject, Rating, Report, Subject, User
from .parsers.common import fold

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
COOKIE = "pk_session"
MAX_UPLOAD = 25 * 1024 * 1024
ALLOWED = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
KINDS = {"rok", "kolokvijum", "skripta", "ostalo"}
POINTS_UPLOAD = 10
POINTS_DOWNLOAD = 1


@asynccontextmanager
async def lifespan(_app):
    init_db()
    yield


app = FastAPI(title="Puškica API", lifespan=lifespan, docs_url="/api/docs", openapi_url="/api/openapi.json")

# ---------- rate limit (per-process, достаточно для MVP) ----------
_hits: dict[str, deque] = defaultdict(deque)


def limit(req: Request, key: str, n: int, per: int):
    ip = req.headers.get("x-real-ip") or (req.client.host if req.client else "?")
    k, now = f"{key}:{ip}", time.time()
    q = _hits[k]
    while q and q[0] < now - per:
        q.popleft()
    if len(q) >= n:
        raise HTTPException(429, "Previše pokušaja, sačekaj malo.")
    q.append(now)
    return ip


# ---------- auth ----------
def make_token(uid: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=60)
    return jwt.encode({"sub": str(uid), "exp": exp}, JWT_SECRET, algorithm="HS256")


def current_user(req: Request, db: Session = Depends(get_db)) -> User | None:
    tok = req.cookies.get(COOKIE)
    if not tok:
        return None
    try:
        uid = int(jwt.decode(tok, JWT_SECRET, algorithms=["HS256"])["sub"])
    except Exception:  # noqa: BLE001
        return None
    return db.get(User, uid)


def need_user(u: User | None = Depends(current_user)) -> User:
    if not u:
        raise HTTPException(401, "Prijavi se da nastaviš.")
    return u


def set_cookie(resp: Response, uid: int):
    resp.set_cookie(COOKIE, make_token(uid), max_age=60 * 86400, httponly=True, samesite="lax",
                    secure=os.environ.get("COOKIE_SECURE", "1") == "1", path="/")


class Creds(BaseModel):
    username: str = Field(min_length=3, max_length=24)
    password: str = Field(min_length=6, max_length=100)
    faculty: str | None = None


def user_out(u: User, db: Session):
    fac = db.get(Faculty, u.faculty_id) if u.faculty_id else None
    uploads = db.scalar(select(func.count()).select_from(Material).where(Material.user_id == u.id, Material.hidden.is_(False)))
    return {"id": u.id, "username": u.username, "points": u.points, "uploads": uploads,
            "faculty": {"slug": fac.slug, "short": fac.short, "name": fac.name} if fac else None,
            "created_at": u.created_at.isoformat() if u.created_at else None}


@app.post("/api/auth/register")
def register(c: Creds, req: Request, resp: Response, db: Session = Depends(get_db)):
    limit(req, "reg", 5, 3600)
    if not re.fullmatch(r"[A-Za-z0-9_.]{3,24}", c.username):
        raise HTTPException(400, "Korisničko ime: 3–24 znaka, slova, brojevi, _ i .")
    if db.scalar(select(User).where(func.lower(User.username) == c.username.lower())):
        raise HTTPException(409, "Ovo korisničko ime je zauzeto.")
    fac = db.scalar(select(Faculty).where(Faculty.slug == c.faculty)) if c.faculty else None
    u = User(username=c.username, pass_hash=bcrypt.hashpw(c.password.encode(), bcrypt.gensalt()).decode(),
             faculty_id=fac.id if fac else None)
    db.add(u)
    db.commit()
    set_cookie(resp, u.id)
    return user_out(u, db)


@app.post("/api/auth/login")
def login(c: Creds, req: Request, resp: Response, db: Session = Depends(get_db)):
    limit(req, "login", 10, 600)
    u = db.scalar(select(User).where(func.lower(User.username) == c.username.lower()))
    if not u or not bcrypt.checkpw(c.password.encode(), u.pass_hash.encode()):
        raise HTTPException(401, "Pogrešno korisničko ime ili lozinka.")
    set_cookie(resp, u.id)
    return user_out(u, db)


@app.post("/api/auth/logout")
def logout(resp: Response):
    resp.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@app.get("/api/me")
def me(u: User | None = Depends(current_user), db: Session = Depends(get_db)):
    return user_out(u, db) if u else None


# ---------- каталог ----------
def fac_out(f: Faculty, subjects: int = 0, materials: int = 0):
    return {"slug": f.slug, "name": f.name, "short": f.short, "city": f.city, "university": f.university,
            "url": f.url, "subjects": subjects, "materials": materials}


def material_out(m: Material, with_subject=False):
    d = {"id": m.id, "kind": m.kind, "title": m.title, "year": m.year, "note": m.note, "mime": m.mime,
         "size": m.size, "downloads": m.downloads, "created_at": m.created_at.isoformat(),
         "author": m.user.username if m.user else None}
    if with_subject:
        s = m.subject
        d["subject"] = {"slug": s.slug, "name": s.name, "faculty": s.faculty.slug, "faculty_short": s.faculty.short}
    return d


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    return {"ok": True, "subjects": db.scalar(select(func.count()).select_from(Subject))}


@app.get("/api/home")
def home(db: Session = Depends(get_db)):
    subj_counts = dict(db.execute(select(Subject.faculty_id, func.count()).group_by(Subject.faculty_id)).all())
    mat_counts = dict(db.execute(
        select(Subject.faculty_id, func.count(Material.id)).join(Material, Material.subject_id == Subject.id)
        .where(Material.hidden.is_(False)).group_by(Subject.faculty_id)).all())
    facs = db.scalars(select(Faculty).order_by(Faculty.name)).all()
    latest = db.scalars(select(Material).where(Material.hidden.is_(False)).order_by(Material.created_at.desc()).limit(8)).all()
    top = db.execute(
        select(Faculty.slug, Faculty.short, Faculty.name, func.coalesce(func.sum(User.points), 0).label("pts"))
        .join(User, User.faculty_id == Faculty.id).group_by(Faculty.id).order_by(func.sum(User.points).desc()).limit(10)
    ).all()
    return {
        "faculties": [fac_out(f, subj_counts.get(f.id, 0), mat_counts.get(f.id, 0)) for f in facs],
        "latest": [material_out(m, True) for m in latest],
        "leaderboard": [{"slug": r.slug, "short": r.short, "name": r.name, "points": int(r.pts)} for r in top],
        "totals": {
            "subjects": db.scalar(select(func.count()).select_from(Subject)),
            "materials": db.scalar(select(func.count()).select_from(Material).where(Material.hidden.is_(False))),
            "users": db.scalar(select(func.count()).select_from(User)),
        },
    }


@app.get("/api/faculties/{slug}")
def faculty(slug: str, db: Session = Depends(get_db)):
    f = db.scalar(select(Faculty).where(Faculty.slug == slug))
    if not f:
        raise HTTPException(404)
    mats = dict(db.execute(select(Material.subject_id, func.count()).join(Subject).where(
        Subject.faculty_id == f.id, Material.hidden.is_(False)).group_by(Material.subject_id)).all())
    subjects = {s.id: s for s in db.scalars(select(Subject).where(Subject.faculty_id == f.id))}
    programs = []
    for p in db.scalars(select(Program).where(Program.faculty_id == f.id).order_by(Program.id)):
        rows = db.scalars(select(ProgramSubject).where(ProgramSubject.program_id == p.id)
                          .order_by(ProgramSubject.semester)).all()
        programs.append({"slug": p.slug, "name": p.name, "level": p.level, "subjects": [
            {"slug": subjects[r.subject_id].slug, "name": subjects[r.subject_id].name,
             "code": subjects[r.subject_id].code, "espb": subjects[r.subject_id].espb,
             "semester": r.semester, "status": r.status, "materials": mats.get(r.subject_id, 0)}
            for r in rows if r.subject_id in subjects]})
    return {**fac_out(f, len(subjects), sum(mats.values())), "programs": programs}


@app.get("/api/subjects/{fac}/{slug}")
def subject(fac: str, slug: str, u: User | None = Depends(current_user), db: Session = Depends(get_db)):
    s = db.scalar(select(Subject).join(Faculty).where(Faculty.slug == fac, Subject.slug == slug))
    if not s:
        raise HTTPException(404)
    links = db.execute(select(ProgramSubject.semester, ProgramSubject.status, Program.name)
                       .join(Program).where(ProgramSubject.subject_id == s.id)).all()
    mats = db.scalars(select(Material).where(Material.subject_id == s.id, Material.hidden.is_(False))
                      .order_by(Material.year.desc().nulls_last(), Material.created_at.desc())).all()
    avg, cnt = db.execute(select(func.avg(Rating.difficulty), func.count()).where(Rating.subject_id == s.id)).one()
    mine = db.get(Rating, (s.id, u.id)) if u else None
    return {
        "slug": s.slug, "name": s.name, "code": s.code, "espb": s.espb, "hours": s.hours,
        "faculty": fac_out(s.faculty),
        "programs": [{"name": n, "semester": sem, "status": st} for sem, st, n in links],
        "materials": [material_out(m) for m in mats],
        "difficulty": {"avg": round(float(avg), 1) if avg else None, "count": cnt, "mine": mine.difficulty if mine else None},
    }


class RateIn(BaseModel):
    difficulty: int = Field(ge=1, le=5)


@app.post("/api/subjects/{fac}/{slug}/rate")
def rate(fac: str, slug: str, body: RateIn, u: User = Depends(need_user), db: Session = Depends(get_db)):
    s = db.scalar(select(Subject).join(Faculty).where(Faculty.slug == fac, Subject.slug == slug))
    if not s:
        raise HTTPException(404)
    r = db.get(Rating, (s.id, u.id))
    if r:
        r.difficulty = body.difficulty
    else:
        db.add(Rating(subject_id=s.id, user_id=u.id, difficulty=body.difficulty))
    db.commit()
    avg, cnt = db.execute(select(func.avg(Rating.difficulty), func.count()).where(Rating.subject_id == s.id)).one()
    return {"avg": round(float(avg), 1), "count": cnt, "mine": body.difficulty}


@app.get("/api/search")
def search(q: str = "", db: Session = Depends(get_db)):
    toks = [t for t in re.split(r"\s+", fold(q).strip()) if len(t) >= 2 or t.isdigit()][:5]
    if not toks:
        return {"subjects": [], "faculties": []}
    sq = select(Subject).join(Faculty)
    fq = select(Faculty)
    for t in toks:
        sq = sq.where((Subject.search.contains(t)) | (Faculty.search.contains(t)) | (func.lower(Subject.code) == t))
        fq = fq.where(Faculty.search.contains(t))
    subs = db.scalars(sq.order_by(func.length(Subject.name)).limit(30)).all()
    return {
        "subjects": [{"slug": s.slug, "name": s.name, "code": s.code, "espb": s.espb, "faculty": s.faculty.slug,
                      "faculty_short": s.faculty.short} for s in subs],
        "faculties": [fac_out(f) for f in db.scalars(fq.limit(8))],
    }


@app.get("/api/sitemap")
def sitemap(db: Session = Depends(get_db)):
    rows = db.execute(select(Faculty.slug, Subject.slug).join(Subject, Subject.faculty_id == Faculty.id)).all()
    return {"faculties": [f for (f,) in db.execute(select(Faculty.slug)).all()],
            "subjects": [{"faculty": f, "slug": s} for f, s in rows]}


# ---------- материалы ----------
@app.post("/api/materials")
async def upload(req: Request, fac: str = Form(...), subject: str = Form(...), kind: str = Form(...),
                 title: str = Form(..., min_length=2, max_length=160), year: int | None = Form(None),
                 note: str | None = Form(None, max_length=1000), file: UploadFile = File(...),
                 u: User = Depends(need_user), db: Session = Depends(get_db)):
    limit(req, "upload", 30, 3600)
    if kind not in KINDS:
        raise HTTPException(400, "Nepoznat tip materijala.")
    if year is not None and not (1990 <= year <= datetime.now().year + 1):
        raise HTTPException(400, "Neispravna godina.")
    s = db.scalar(select(Subject).join(Faculty).where(Faculty.slug == fac, Subject.slug == subject))
    if not s:
        raise HTTPException(404, "Predmet nije pronađen.")
    head = await file.read(16)
    mime = file.content_type or ""
    sig_ok = (head.startswith(b"%PDF") and mime == "application/pdf") or \
             (head[:3] == b"\xff\xd8\xff" and mime == "image/jpeg") or \
             (head.startswith(b"\x89PNG") and mime == "image/png") or \
             (head[:4] == b"RIFF" and head[8:12] == b"WEBP" and mime == "image/webp")
    if mime not in ALLOWED or not sig_ok:
        raise HTTPException(400, "Dozvoljeni su PDF, JPG, PNG i WEBP.")
    name = f"{uuid.uuid4().hex}.{ALLOWED[mime]}"
    path = UPLOAD_DIR / name
    size = len(head)
    with open(path, "wb") as out:
        out.write(head)
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD:
                out.close()
                path.unlink(missing_ok=True)
                raise HTTPException(413, "Fajl je veći od 25 MB.")
            out.write(chunk)
    m = Material(subject_id=s.id, user_id=u.id, kind=kind, title=title.strip(), year=year,
                 note=(note or "").strip() or None, file_name=name, mime=mime, size=size)
    db.add(m)
    u.points += POINTS_UPLOAD
    db.commit()
    return {"id": m.id, "points": u.points}


@app.get("/api/materials/{mid}")
def material(mid: int, db: Session = Depends(get_db)):
    m = db.get(Material, mid)
    if not m or m.hidden:
        raise HTTPException(404)
    return material_out(m, True)


@app.get("/api/files/{mid}")
def file(mid: int, req: Request, download: int = 0, u: User | None = Depends(current_user),
         db: Session = Depends(get_db)):
    m = db.get(Material, mid)
    if not m or m.hidden:
        raise HTTPException(404)
    counted = False
    if download and not (u and u.id == m.user_id):
        try:
            limit(req, f"dl{mid}", 1, 86400)  # одна засчитанная загрузка с IP в сутки
            counted = True
        except HTTPException:
            pass
    if counted:
        db.execute(update(Material).where(Material.id == mid).values(downloads=Material.downloads + 1))
        if m.user_id and m.downloads < 1000:
            db.execute(update(User).where(User.id == m.user_id).values(points=User.points + POINTS_DOWNLOAD))
        db.commit()
    ext = m.file_name.rsplit(".", 1)[-1]
    fname = re.sub(r"[^A-Za-z0-9._-]+", "-", fold(m.title))[:60] + f".{ext}"
    return FileResponse(UPLOAD_DIR / m.file_name, media_type=m.mime,
                        content_disposition_type="attachment" if download else "inline", filename=fname,
                        headers={"Cache-Control": "private, max-age=86400"})


class ReportIn(BaseModel):
    reason: str = Field(min_length=3, max_length=300)


@app.post("/api/materials/{mid}/report")
def report(mid: int, body: ReportIn, req: Request, db: Session = Depends(get_db)):
    ip = limit(req, "report", 10, 3600)
    m = db.get(Material, mid)
    if not m:
        raise HTTPException(404)
    iph = hashlib.sha256(f"{ip}{JWT_SECRET}".encode()).hexdigest()
    if db.scalar(select(Report).where(Report.material_id == mid, Report.ip_hash == iph)):
        return {"ok": True}
    db.add(Report(material_id=mid, ip_hash=iph, reason=body.reason))
    m.reports += 1
    if m.reports >= 3:
        m.hidden = True
    db.commit()
    return {"ok": True}


@app.get("/api/me/materials")
def my_materials(u: User = Depends(need_user), db: Session = Depends(get_db)):
    mats = db.scalars(select(Material).where(Material.user_id == u.id).order_by(Material.created_at.desc())).all()
    return [material_out(m, True) | {"hidden": m.hidden} for m in mats]


@app.delete("/api/materials/{mid}")
def delete_material(mid: int, u: User = Depends(need_user), db: Session = Depends(get_db)):
    m = db.get(Material, mid)
    if not m or (m.user_id != u.id and not u.is_admin):
        raise HTTPException(404)
    m.hidden = True
    if m.user_id == u.id:
        u.points = max(0, u.points - POINTS_UPLOAD)
    db.commit()
    return {"ok": True}


# ---------- модерация ----------
def need_admin(req: Request):
    if not ADMIN_TOKEN or not secrets.compare_digest(req.headers.get("x-admin-token", ""), ADMIN_TOKEN):
        raise HTTPException(403)


@app.get("/api/admin/reports", dependencies=[Depends(need_admin)])
def admin_reports(db: Session = Depends(get_db)):
    rows = db.scalars(select(Material).where(Material.reports > 0).order_by(Material.reports.desc()).limit(200)).all()
    return [material_out(m, True) | {"reports": m.reports, "hidden": m.hidden} for m in rows]


@app.post("/api/admin/materials/{mid}/{action}", dependencies=[Depends(need_admin)])
def admin_action(mid: int, action: str, db: Session = Depends(get_db)):
    m = db.get(Material, mid)
    if not m or action not in {"hide", "restore"}:
        raise HTTPException(404)
    m.hidden = action == "hide"
    if action == "restore":
        m.reports = 0
    db.commit()
    return {"ok": True}
