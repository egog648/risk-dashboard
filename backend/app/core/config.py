from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # FRED API — loaded from .env, never hardcoded
    FRED_API_KEY: str

    # Tiingo — market price data (free at app.tiingo.com)
    TIINGO_API_KEY: str

    # Database
    DATABASE_URL: str = "sqlite:///./data/risk_dashboard.db"

    # App
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    # Data refresh schedule
    DATA_REFRESH_CRON: str = "0 6 * * *"

    # Observability thresholds
    SLOW_REQUEST_THRESHOLD_MS: int = 2000
    REFRESH_ERROR_WARN_RATIO: float = 0.25

    # CORS — allow frontend dev server
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()
