import os
from pydantic_settings import BaseSettings
from functools import lru_cache

COOKIES_FILE = os.path.join(os.path.dirname(__file__), "..", "cookies.json")


def _read_cookies_file() -> str:
    path = os.path.abspath(COOKIES_FILE)
    if os.path.exists(path):
        with open(path) as f:
            return f.read().strip()
    return ""


class Settings(BaseSettings):
    yahoo_cookies: str = ""
    production_host: str = "https://finance.lancelotshih.com"

    class Config:
        env_file = ".env"

    @property
    def effective_cookies(self) -> str:
        """cookies.json on disk takes priority over the env var."""
        from_file = _read_cookies_file()
        return from_file if from_file else self.yahoo_cookies


@lru_cache()
def get_settings() -> Settings:
    return Settings()
