import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib
from datetime import datetime

# Generate realistic synthetic data for Luwero crops
np.random.seed(42)
n = 1200

seasons = np.random.choice(['First', 'Second'], n)
soils = np.random.choice(['Loam', 'Clay', 'Sandy'], n)
temps = np.random.normal(26.5, 4.5, n).clip(18, 35)
rainfalls = np.random.normal(170, 85, n).clip(50, 420)

crops = []
for s, soil, t, r in zip(seasons, soils, temps, rainfalls):
    if s == 'First' and 150 < r < 280 and 22 < t < 30 and soil in ['Loam', 'Clay']:
        crops.append('Maize')
    elif s == 'First' and soil == 'Sandy' and r > 180:
        crops.append('Cassava')
    elif r < 120 and soil == 'Sandy':
        crops.append('Sweet Potatoes')
    elif 20 < t < 28 and soil == 'Loam':
        crops.append('Beans')
    elif soil == 'Loam' and r > 100:
        crops.append('Bananas')
    elif t > 24 and r < 150:
        crops.append('Coffee')
    elif soil == 'Sandy' and 22 < t < 32:
        crops.append('Pineapple')
    elif r > 120 and soil in ['Loam', 'Clay']:
        crops.append('Groundnuts')
    else:
        crops.append(np.random.choice(['Maize', 'Beans', 'Cassava', 'Bananas']))

df = pd.DataFrame({
    'season': seasons,
    'soil_type': soils,
    'temperature': temps,
    'rainfall': rainfalls,
    'crop': crops
})

X = df[['season', 'soil_type', 'temperature', 'rainfall']]
y = df['crop']

preprocessor = ColumnTransformer(
    transformers=[
        ('cat', OneHotEncoder(handle_unknown='ignore'), ['season', 'soil_type']),
        ('num', StandardScaler(), ['temperature', 'rainfall'])
    ])

model = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', RandomForestClassifier(n_estimators=200, random_state=42, max_depth=15))
])

model.fit(X, y)

joblib.dump(model, 'model_pipeline.joblib')
print("Model trained and saved!")
print("Classes:", model.classes_)