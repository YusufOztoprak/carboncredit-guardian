from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    capacity_kwp: float = Field(gt=0, description="Installed capacity in kWp")
    owner_address: str = Field(pattern=r"^0x[a-fA-F0-9]{40}$")
    monthly_kwh: list[float] = Field(description="Reported production for Jan..Dec in kWh")

    @field_validator("monthly_kwh")
    @classmethod
    def twelve_non_negative_values(cls, v: list[float]) -> list[float]:
        if len(v) != 12:
            raise ValueError("monthly_kwh must contain exactly 12 values (Jan..Dec)")
        if any(x < 0 for x in v):
            raise ValueError("monthly_kwh values must be >= 0")
        return v


class VerificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    expected_kwh_total: float
    reported_kwh_total: float
    expected_monthly_kwh: list[float]
    anomaly_months: list[int]
    risk_score_bp: int
    passed: bool
    avoided_tco2: float
    created_at: datetime


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    latitude: float
    longitude: float
    capacity_kwp: float
    owner_address: str
    status: str
    created_at: datetime
    monthly_kwh: list[float]
    latest_verification: VerificationOut | None = None