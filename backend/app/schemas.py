from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator


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
    monthly_upper_kwh: list[float] | None = None
    annual_limit_kwh: float | None = None
    anomaly_months: list[int]
    physical_anomaly_months: list[int] | None = None
    ai_anomaly_months: list[int] | None = None
    ai_month_scores: list[float] | None = None
    risk_score_bp: int
    passed: bool
    avoided_tco2: float
    created_at: datetime

    @computed_field
    @property
    def credit_amount(self) -> int:
        """Whole tonnes of CO2 = number of credit tokens to mint."""
        return int(self.avoided_tco2)


class VerifyResponse(BaseModel):
    project_id: int
    status: str
    physical_ratio: float
    reasons: list[str]
    verification: VerificationOut


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
    mint_tx_hash: str | None = None
    minted_amount: int | None = None
    latest_verification: VerificationOut | None = None


class MintResponse(BaseModel):
    project_id: int
    status: str
    tx_hash: str
    minted_amount: int
    to: str
    explorer_url: str


class CreditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_type: str  # mint / transfer / retire
    amount: int
    from_address: str | None
    to_address: str | None
    beneficiary: str | None
    reason: str | None
    tx_hash: str
    block_number: int
    block_timestamp: datetime | None

    @computed_field
    @property
    def explorer_url(self) -> str:
        return f"https://sepolia.etherscan.io/tx/{self.tx_hash}"


class CreditHistory(BaseModel):
    project_id: int
    project_name: str
    status: str
    risk_score_bp: int | None
    minted: int
    transferred: int
    retired: int
    outstanding: int  # minted - retired: credits still in circulation
    events: list[CreditEventOut]
    sync_error: str | None = None  # set if the chain could not be reached; data may be slightly stale


class SyncResponse(BaseModel):
    from_block: int
    to_block: int
    new_events: int
    skipped: list[tuple[int, int]] = []  # block ranges the RPC no longer serves (pruned history)