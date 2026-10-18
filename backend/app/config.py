from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings, read from environment variables or a .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./dev.db"
    cors_origins: str = "http://localhost:3000"

    # Turkish national grid combined margin for solar/wind projects (2021),
    # Ministry of Energy and Natural Resources, TUESEF information form.
    grid_emission_factor_t_per_mwh: float = 0.6345

    # Public URL of this API, used for on-chain token metadata links
    public_base_url: str = "https://carboncredit-guardian.onrender.com"

    chain_id: int = 11155111  # Sepolia
    # First block to scan for contract events (just before the first real mint)
    contract_start_block: int = 11934000
    sepolia_rpc_url: str = ""
    contract_address: str = ""
    verifier_private_key: str = ""

    @property
    def sqlalchemy_url(self) -> str:
        # Render gives "postgres://...", SQLAlchemy + psycopg3 needs "postgresql+psycopg://..."
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url


settings = Settings()