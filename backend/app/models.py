from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Project(Base):
    """A solar project. Its id is also the ERC-1155 token id on-chain."""

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    capacity_kwp: Mapped[float] = mapped_column(Float)
    owner_address: Mapped[str] = mapped_column(String(42))
    # pending -> verified / flagged -> minted
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # Filled in after the backend mints credits on-chain
    mint_tx_hash: Mapped[str | None] = mapped_column(String(66), nullable=True)
    minted_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    monthly_reports: Mapped[list["MonthlyReport"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="MonthlyReport.month"
    )
    verifications: Mapped[list["Verification"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class MonthlyReport(Base):
    """Production the project claims for one calendar month."""

    __tablename__ = "monthly_reports"
    __table_args__ = (UniqueConstraint("project_id", "month"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    month: Mapped[int] = mapped_column(Integer)  # 1-12
    reported_kwh: Mapped[float] = mapped_column(Float)

    project: Mapped[Project] = relationship(back_populates="monthly_reports")


class Verification(Base):
    """Result of one verification run (physical check + anomaly model)."""

    __tablename__ = "verifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    expected_kwh_total: Mapped[float] = mapped_column(Float)
    reported_kwh_total: Mapped[float] = mapped_column(Float)
    expected_monthly_kwh: Mapped[list] = mapped_column(JSON)  # 12 values from PVGIS
    monthly_upper_kwh: Mapped[list | None] = mapped_column(JSON, nullable=True)  # physical upper bounds
    annual_limit_kwh: Mapped[float | None] = mapped_column(Float, nullable=True)
    anomaly_months: Mapped[list] = mapped_column(JSON, default=list)  # union of both layers, e.g. [1, 12]
    physical_anomaly_months: Mapped[list | None] = mapped_column(JSON, nullable=True)
    ai_anomaly_months: Mapped[list | None] = mapped_column(JSON, nullable=True)
    ai_month_scores: Mapped[list | None] = mapped_column(JSON, nullable=True)  # 0-1 per month
    risk_score_bp: Mapped[int] = mapped_column(Integer)  # 0-10000, same scale as the contract
    passed: Mapped[bool] = mapped_column(Boolean)
    avoided_tco2: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    project: Mapped[Project] = relationship(back_populates="verifications")


class CreditEvent(Base):
    """Mint / transfer / retire events indexed from the contract."""

    __tablename__ = "credit_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    event_type: Mapped[str] = mapped_column(String(20))  # mint / transfer / retire
    tx_hash: Mapped[str] = mapped_column(String(66))
    log_index: Mapped[int] = mapped_column(Integer, default=0)
    block_number: Mapped[int] = mapped_column(Integer, default=0)
    from_address: Mapped[str | None] = mapped_column(String(42), nullable=True)
    to_address: Mapped[str | None] = mapped_column(String(42), nullable=True)
    amount: Mapped[int] = mapped_column(Integer)  # tonnes CO2
    beneficiary: Mapped[str | None] = mapped_column(String(200), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    block_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (UniqueConstraint("tx_hash", "log_index"),)


class SyncState(Base):
    """Last indexed block per sync job (so event indexing is incremental)."""

    __tablename__ = "sync_state"

    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    last_block: Mapped[int] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)