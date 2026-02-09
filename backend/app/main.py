from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from .ml_model import PredictionRequest, get_top_crops, get_crop_prediction
import pandas as pd
from pydantic import BaseModel
import httpx
from pathlib import Path
from dotenv import load_dotenv
from .openai_client import chat_with_openai, OpenAIError
import time

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ENV_PATH)

app = FastAPI(title="Luwero Crop Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/predict")
async def predict_crop(request: PredictionRequest):
    recommendations = get_top_crops(request)
    return {
        "recommendations": recommendations,
        "inputs": request.dict()
    }


@app.post("/predict/search")
async def predict_crop_search(request: PredictionRequest, crop: str):
    result = get_crop_prediction(request, crop)
    if not result:
        raise HTTPException(status_code=404, detail="Crop not found in recommendations.")
    return {
        "result": result,
        "query": crop,
        "inputs": request.dict()
    }

@app.get("/")
async def root():
    return {"message": "Luwero Crop Prediction API is running"}


class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
async def chat(request: ChatRequest, http_request: Request):
    try:
        if not request.message.strip():
            raise HTTPException(status_code=400, detail="Message is required.")
        client_ip = http_request.client.host if http_request.client else "unknown"
        now = time.time()
        recent = [t for t in _RATE_LIMIT.get(client_ip, []) if now - t < _RATE_LIMIT_WINDOW]
        if len(recent) >= _RATE_LIMIT_MAX:
            raise HTTPException(status_code=429, detail="Too many requests. Please wait a few seconds.")
        recent.append(now)
        _RATE_LIMIT[client_ip] = recent
        cache_key = f"{client_ip}:{request.message.strip().lower()}"
        answer = await chat_with_openai(request.message, cache_key=cache_key)
        return {"answer": answer}
    except OpenAIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

# For testing purposes, you can run this app with Uvicorn:
# uvicorn app.main:app --reload --host
# cmd /c "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
# Make sure to replace <IP_ADDRESS> with your actual local IP address if testing from a mobile device.
_RATE_LIMIT: dict[str, list[float]] = {}
_RATE_LIMIT_WINDOW = 10  # seconds
_RATE_LIMIT_MAX = 1
