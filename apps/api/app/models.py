from datetime import datetime

from sqlalchemy import (BigInteger, Boolean, DateTime, ForeignKey, Integer, SmallInteger, String, Text,
                        UniqueConstraint, func)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Faculty(Base):
    __tablename__ = "faculties"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    short: Mapped[str] = mapped_column(String(20))
    city: Mapped[str] = mapped_column(String(60))
    university: Mapped[str] = mapped_column(String(120))
    url: Mapped[str | None] = mapped_column(String(300))
    search: Mapped[str] = mapped_column(String(300), index=True)
    programs: Mapped[list["Program"]] = relationship(back_populates="faculty", order_by="Program.id")


class Program(Base):
    __tablename__ = "programs"
    __table_args__ = (UniqueConstraint("faculty_id", "slug"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculties.id", ondelete="CASCADE"), index=True)
    slug: Mapped[str] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(200))
    level: Mapped[str] = mapped_column(String(30), default="osnovne")
    faculty: Mapped[Faculty] = relationship(back_populates="programs")


class Subject(Base):
    __tablename__ = "subjects"
    __table_args__ = (UniqueConstraint("faculty_id", "slug"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculties.id", ondelete="CASCADE"), index=True)
    slug: Mapped[str] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(250))
    code: Mapped[str | None] = mapped_column(String(40))
    espb: Mapped[int | None] = mapped_column(SmallInteger)
    hours: Mapped[str | None] = mapped_column(String(40))
    search: Mapped[str] = mapped_column(String(300), index=True)
    faculty: Mapped[Faculty] = relationship()


class ProgramSubject(Base):
    __tablename__ = "program_subjects"
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id", ondelete="CASCADE"), primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True)
    semester: Mapped[int] = mapped_column(SmallInteger)
    status: Mapped[str] = mapped_column(String(20), default="obavezni")


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    pass_hash: Mapped[str] = mapped_column(String(100))
    faculty_id: Mapped[int | None] = mapped_column(ForeignKey("faculties.id", ondelete="SET NULL"))
    points: Mapped[int] = mapped_column(Integer, default=0)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Material(Base):
    __tablename__ = "materials"
    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    kind: Mapped[str] = mapped_column(String(20))  # rok | kolokvijum | skripta | ostalo
    title: Mapped[str] = mapped_column(String(160))
    year: Mapped[int | None] = mapped_column(SmallInteger)
    note: Mapped[str | None] = mapped_column(Text)
    file_name: Mapped[str] = mapped_column(String(80))
    mime: Mapped[str] = mapped_column(String(60))
    size: Mapped[int] = mapped_column(BigInteger)
    downloads: Mapped[int] = mapped_column(Integer, default=0)
    reports: Mapped[int] = mapped_column(Integer, default=0)
    hidden: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    subject: Mapped[Subject] = relationship()
    user: Mapped[User | None] = relationship()


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id", ondelete="CASCADE"), index=True)
    ip_hash: Mapped[str] = mapped_column(String(64))
    reason: Mapped[str] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Rating(Base):
    __tablename__ = "ratings"
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    difficulty: Mapped[int] = mapped_column(SmallInteger)  # 1..5
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Meta(Base):
    __tablename__ = "meta"
    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
