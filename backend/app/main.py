from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.verify import verify_claim
from app.db import Base, add_missing_columns, engine, get_db
from app.indexer import sync_events, sync_if_stale
from app.models import CreditEvent, MonthlyReport, Project, Verification
from app.pvgis import PVGISError, get_expected_production
from app.chain import ChainError, mint_credits
from app.schemas import CreditEventOut, CreditHistory, MintResponse, ProjectCreate, SyncResponse, ProjectOut, VerificationOut, VerifyResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Hackathon shortcut: create tables on startup instead of migrations.
    Base.metadata.create_all(bind=engine)
    add_missing_columns()
    yield


app = FastAPI(title="CarbonCredit Guardian API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_origin_regex=settings.cors_origin_regex or None,
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
        mint_tx_hash=project.mint_tx_hash,
        minted_amount=project.minted_amount,
        latest_verification=latest,
    )


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/pvgis/expected")
def pvgis_expected(lat: float, lon: float, capacity_kwp: float):
    """Expected monthly output from PVGIS for a location and capacity (physical best case)."""
    try:
        result = get_expected_production(lat, lon, capacity_kwp)
    except PVGISError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {
        "monthly_kwh": result.monthly_kwh,
        "monthly_sd_kwh": result.monthly_sd_kwh,
        "annual_kwh": result.annual_kwh,
    }


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


@app.post("/projects/{project_id}/verify", response_model=VerifyResponse)
def verify_project(project_id: int, db: Session = Depends(get_db)):
    """Run both verification layers (physical limit + AI anomaly model) and store the result."""
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status == "minted":
        raise HTTPException(status_code=409, detail="Credits already minted for this project")

    try:
        expected = get_expected_production(project.latitude, project.longitude, project.capacity_kwp)
    except PVGISError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    reported = [r.reported_kwh for r in project.monthly_reports]
    result = verify_claim(reported, expected, settings.grid_emission_factor_t_per_mwh)

    verification = Verification(
        project_id=project.id,
        expected_kwh_total=result.expected_kwh_total,
        reported_kwh_total=result.reported_kwh_total,
        expected_monthly_kwh=result.expected_monthly_kwh,
        monthly_upper_kwh=result.monthly_upper_kwh,
        annual_limit_kwh=result.annual_limit_kwh,
        anomaly_months=result.anomaly_months,
        physical_anomaly_months=result.exceeding_months,
        ai_anomaly_months=result.ai_anomaly_months,
        ai_month_scores=result.ai_month_scores,
        risk_score_bp=result.risk_score_bp,
        passed=result.passed,
        avoided_tco2=result.avoided_tco2,
    )
    project.status = "verified" if result.passed else "flagged"
    db.add(verification)
    db.commit()
    db.refresh(verification)

    return VerifyResponse(
        project_id=project.id,
        status=project.status,
        physical_ratio=result.physical_ratio,
        reasons=result.reasons,
        verification=VerificationOut.model_validate(verification),
    )


@app.post("/projects/{project_id}/mint", response_model=MintResponse)
def mint_project(project_id: int, db: Session = Depends(get_db)):
    """Mint credits on-chain for a verified project (1 token = 1 tCO2) to its owner."""
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status == "minted":
        raise HTTPException(status_code=409, detail="Credits already minted for this project")
    if project.status != "verified":
        raise HTTPException(status_code=409, detail=f"Project must be verified first (status: {project.status})")

    latest = max(project.verifications, key=lambda v: v.created_at)
    amount = int(latest.avoided_tco2)
    if amount <= 0:
        raise HTTPException(status_code=409, detail="Nothing to mint (less than 1 tCO2 verified)")

    metadata_uri = f"{settings.public_base_url.rstrip('/')}/projects/{project.id}"
    try:
        tx_hash = mint_credits(project.owner_address, project.id, amount, metadata_uri, latest.risk_score_bp)
    except ChainError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    project.status = "minted"
    project.mint_tx_hash = tx_hash
    project.minted_amount = amount
    db.commit()

    return MintResponse(
        project_id=project.id,
        status=project.status,
        tx_hash=tx_hash,
        minted_amount=amount,
        to=project.owner_address,
        explorer_url=f"https://sepolia.etherscan.io/tx/{tx_hash}",
    )