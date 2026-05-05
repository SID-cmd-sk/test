"""Stub backend so supervisor doesn't spam FATAL. Not used by the static site."""
from fastapi import FastAPI

app = FastAPI()


@app.get("/api/health")
def health():
    return {"status": "ok"}
