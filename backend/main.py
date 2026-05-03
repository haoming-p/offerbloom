from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers.auth import router as auth_router
from routers.files import router as files_router
from routers.onboarding import router as onboarding_router
from routers.questions import router as questions_router
from routers.answers import router as answers_router
from routers.practices import router as practices_router

app = FastAPI(title="OfferBloom API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(files_router)
app.include_router(onboarding_router)
app.include_router(questions_router)
app.include_router(answers_router)
app.include_router(practices_router)


@app.get("/health")
def health():
    return {"status": "ok"}
