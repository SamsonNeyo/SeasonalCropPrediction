from pathlib import Path
from typing import Dict, List

import joblib
import numpy as np
import pandas as pd
from pydantic import BaseModel

MODEL_PATH = Path(__file__).resolve().parent.parent / "model_pipeline.joblib"
model = joblib.load(MODEL_PATH)

class PredictionRequest(BaseModel):
    season: str          # "First" or "Second"
    soil_type: str       # "Loam", "Clay", "Sandy"
    temperature: float
    rainfall: float

explanations = {
    "Maize": "Thrives in warm temperatures (22-30°C) and moderate-high rainfall. Best in well-drained loamy soils.",
    "Beans": "Fast-growing legume. Loves First season and fertile loam soils.",
    "Cassava": "Drought-tolerant. Excellent for Sandy soils and lower rainfall periods.",
    "Sweet Potatoes": "Grows well in Sandy soils with moderate rain.",
    "Bananas": "Perennial crop. Prefers consistent moisture and loamy soils.",
    "Coffee": "Requires moderate temperatures and well-distributed rain.",
    "Pineapple": "Thrives in warmer conditions and Sandy soils.",
    "Groundnuts": "Good in loamy soils with adequate rainfall."
}

def get_top_crops(request: PredictionRequest, top_k: int = 3) -> List[Dict]:
    input_data = pd.DataFrame([{
        'season': request.season,
        'soil_type': request.soil_type,
        'temperature': request.temperature,
        'rainfall': request.rainfall
    }])
    
    proba = model.predict_proba(input_data)[0]
    classes = model.classes_
    
    top_indices = np.argsort(proba)[-top_k:][::-1]
    
    results = []
    for idx in top_indices:
        crop = classes[idx]
        confidence = round(proba[idx] * 100, 1)
        results.append({
            "crop": crop,
            "confidence": confidence,
            "explanation": explanations.get(crop, "Suitable based on current conditions.")
        })
    return results


def get_crop_prediction(request: PredictionRequest, crop_query: str) -> Dict | None:
    input_data = pd.DataFrame([{
        'season': request.season,
        'soil_type': request.soil_type,
        'temperature': request.temperature,
        'rainfall': request.rainfall
    }])

    proba = model.predict_proba(input_data)[0]
    classes = model.classes_
    query = crop_query.strip().lower()
    if not query:
        return None

    # Exact match (case-insensitive) first, then contains.
    exact_idx = None
    for i, c in enumerate(classes):
        if str(c).lower() == query:
            exact_idx = i
            break

    match_indices = []
    if exact_idx is not None:
        match_indices = [exact_idx]
    else:
        for i, c in enumerate(classes):
            if query in str(c).lower():
                match_indices.append(i)

    if not match_indices:
        return None

    # If multiple matches, return the one with highest probability.
    best_idx = max(match_indices, key=lambda i: proba[i])
    crop = classes[best_idx]
    confidence = round(proba[best_idx] * 100, 1)
    return {
        "crop": crop,
        "confidence": confidence,
        "explanation": explanations.get(crop, "Suitable based on current conditions.")
    }
