from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import Base, engine, get_db
from app.models import MonthlyReport, Project
from app.schemas import ProjectCreate, ProjectOut
from app.pvgis import PVGISError, get_expected_production

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Hackathon shortcut: create tables on startup instead of migrations.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="CarbonCredit Guardian API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


def to_out(project: Project) -> ProjectOut:
    latest = max(project.verifications, key=lambda v: v.created_at, default=None)
    return ProjectOut(
        id=project.id,
        name=project.name,
        latitude=project.latitude,
        longitude=project.longitude,
        capacity_kwp=project.capacity_kwp,
        owner_address=project.owner_address,
        status=project.status,
        created_at=project.created_at,
        monthly_kwh=[r.reported_kwh for r in project.monthly_reports],
        latest_verification=latest,
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        name=payload.name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        capacity_kwp=payload.capacity_kwp,
        owner_address=payload.owner_address,
        monthly_reports=[
            MonthlyReport(month=i + 1, reported_kwh=kwh) for i, kwh in enumerate(payload.monthly_kwh)
        ],
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return to_out(project)


@app.get("/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    projects = db.scalars(select(Project).order_by(Project.created_at.desc())).all()
    return [to_out(p) for p in projects]


@app.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return to_out(project)

@app.get("/pvgis/expected")
def pvgis_expected(lat: float, lon: float, capacity_kwp: float):
    """Debug endpoint: expected monthly output from PVGIS."""
    try:
        result = get_expected_production(lat, lon, capacity_kwp)
    except PVGISError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {
        "monthly_kwh": result.monthly_kwh,
        "monthly_sd_kwh": result.monthly_sd_kwh,
        "annual_kwh": result.annual_kwh,
    }