from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (register tables)
from .config import get_settings
from .db import Base, engine

settings = get_settings()
Base.metadata.create_all(engine)

app = FastAPI(title="ZK Pass API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"ok": True, "paypal_mode": settings.paypal_mode}


from .routers import auth, credentials  # noqa: E402

for r in (auth, credentials):
    app.include_router(r.router)
