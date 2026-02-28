from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

DATA_PATH = Path(__file__).resolve().parent / "data" / "crop_dataset.csv"
MODEL_PATH = Path(__file__).resolve().parent / "model_pipeline.joblib"


def _synthetic_dataset() -> pd.DataFrame:
    np.random.seed(42)
    n = 1500
    seasons = np.random.choice(["First", "Second"], n)
    soils = np.random.choice(["Loam", "Clay Loam", "Sandy Loam"], n)
    temps = np.random.normal(26.5, 4.5, n).clip(18, 35)
    rainfalls = np.random.normal(170, 85, n).clip(50, 420)
    crops = []
    for season, soil, temp, rain in zip(seasons, soils, temps, rainfalls):
        if season == "First" and 150 < rain < 280 and 22 < temp < 30 and soil in {"Loam", "Clay Loam"}:
            crops.append("Maize")
        elif season == "First" and soil == "Sandy Loam" and rain > 180:
            crops.append("Cassava")
        elif 20 < temp < 28 and soil == "Loam":
            crops.append("Beans")
        elif rain > 120 and soil in {"Loam", "Clay Loam"}:
            crops.append("Groundnuts")
        elif rain > 220 and temp > 24:
            crops.append("Rice")
        else:
            crops.append(np.random.choice(["Maize", "Beans", "Cassava", "Groundnuts", "Banana", "Rice"]))
    return pd.DataFrame(
        {
            "season": seasons,
            "soil_type": soils,
            "temperature": temps,
            "rainfall": rainfalls,
            "crop": crops,
        }
    )


def _load_dataset() -> pd.DataFrame:
    if DATA_PATH.exists():
        return pd.read_csv(DATA_PATH)
    return _synthetic_dataset()


def main() -> None:
    df = _load_dataset().dropna().copy()
    season_encoder = LabelEncoder()
    soil_encoder = LabelEncoder()
    crop_encoder = LabelEncoder()
    df["season_encoded"] = season_encoder.fit_transform(df["season"])
    df["soil_type_encoded"] = soil_encoder.fit_transform(df["soil_type"])
    df["crop_encoded"] = crop_encoder.fit_transform(df["crop"])
    X = df[["season_encoded", "soil_type_encoded", "temperature", "rainfall"]]
    y = df["crop_encoded"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    accuracy = accuracy_score(y_test, preds)
    cm = confusion_matrix(y_test, preds)
    artifact = {
        "model": model,
        "encoders": {"season": season_encoder, "soil_type": soil_encoder, "crop": crop_encoder},
        "feature_columns": ["season_encoded", "soil_type_encoded", "temperature", "rainfall"],
    }
    joblib.dump(artifact, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")
    print(f"Accuracy: {accuracy:.4f}")
    print("Confusion matrix:")
    print(cm)
    print("Target accuracy >= 85% achieved." if accuracy >= 0.85 else "Target accuracy >= 85% not reached.")


if __name__ == "__main__":
    main()
