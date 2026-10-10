from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings, read from environment variables or a .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./dev.db"
    cors_origins: str = "http://localhost:3000"

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