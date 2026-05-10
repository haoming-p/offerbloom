from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"

    jwt_secret: str = "changeme"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    frontend_url: str = "http://localhost:5173"

    # Cloudflare R2
    r2_account_id: str = ""
    r2_endpoint: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "offerbloom-files"
    r2_public_url: str = ""

    anthropic_api_key: str = ""

    demo_user_email: str = ""
    cleanup_secret: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
