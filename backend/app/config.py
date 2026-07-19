"""
Application configuration.

Environment-based configuration supporting both SQLite (development)
and PostgreSQL (production).
"""
import os
from typing import Optional
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Base configuration."""
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./pfap.db"
    )
    
    # API
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    
    # CORS
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "*")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    @property
    def is_sqlite(self) -> bool:
        """Check if database URL is SQLite."""
        return self.DATABASE_URL.startswith("sqlite://")
    
    @property
    def is_postgresql(self) -> bool:
        """Check if database URL is PostgreSQL."""
        return self.DATABASE_URL.startswith("postgresql://")
    
    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.ENVIRONMENT == "production"
    
    @property
    def database_connect_args(self) -> dict:
        """Get database-specific connection arguments."""
        if self.is_sqlite:
            return {"check_same_thread": False}
        return {}
    
    @property
    def cors_origins(self) -> list[str]:
        """Parse CORS origins from environment variable."""
        if self.ALLOWED_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


config = Config()
