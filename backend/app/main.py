from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.agents.checkpoint import close_global_checkpointer, init_global_checkpointer
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import logger, setup_logging
from app.db.seed_data import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Initializing SentinelPay enterprise backend services...")
    # Initialize persistent LangGraph checkpointer
    await init_global_checkpointer()
    # Initialize DB and seed synthetic data
    await seed_database()
    logger.info("SentinelPay platform initialized and ready for operations.")
    yield
    logger.info("Shutting down SentinelPay services...")
    await close_global_checkpointer()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise-Grade Governed Agentic FinTech Platform with Deterministic Policy Gating, Multi-Agent LangGraph Orchestration, and Custom Financial MCP Gateway.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error occurred. Transaction halted safely."},
    )


# Mount API V1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1": settings.API_V1_STR,
        "status": "ONLINE",
    }
