from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import init_db

app = FastAPI()

# Allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def root():
    return {"message": "FinanceAppV2 backend running!"}

from routes import router
app.include_router(router)
