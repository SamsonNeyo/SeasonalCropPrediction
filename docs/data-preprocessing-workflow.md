# Data Preprocessing Workflow

This diagram reflects the current preprocessing logic implemented in `backend/train_model.py` and `backend/app/ml_model.py`.

```mermaid
flowchart TD
    A["Start training"] --> B{"Does backend/data/crop_dataset.csv exist?"}
    B -->|Yes| C["Load CSV with pandas"]
    B -->|No| D["Generate synthetic dataset"]

    C --> E["Find source columns<br/>crop or label<br/>temperature<br/>rainfall<br/>optional season<br/>optional soil_type<br/>optional pH"]
    E --> F["Convert temperature and rainfall to numeric"]
    F --> G["Trim and standardize crop names"]
    G --> H{"Season column present?"}
    H -->|Yes| I["Normalize season values<br/>1 to First<br/>2 to Second<br/>first season to First<br/>second season to Second"]
    H -->|No| J["Infer season from rainfall<br/>rainfall >= 150 to First<br/>otherwise Second"]

    I --> K{"Soil column present?"}
    J --> K
    K -->|Yes| L["Normalize soil labels<br/>ferrallitic or clay to Clay Loam<br/>sandy to Sandy Loam<br/>loam to Loam"]
    K -->|No| M{"pH column present?"}
    M -->|Yes| N["Derive soil type from pH<br/>less than 5.8 to Clay Loam<br/>greater than 7.2 to Sandy Loam<br/>otherwise Loam"]
    M -->|No| O["Default soil type to Loam"]

    L --> P["Drop rows missing season, soil_type, temperature, rainfall, or crop"]
    N --> P
    O --> P
    D --> P

    P --> Q["Label encode season, soil_type, and crop"]
    Q --> R["Build features<br/>season_encoded<br/>soil_type_encoded<br/>temperature<br/>rainfall"]
    R --> S["Train test split with stratify=y"]
    S --> T["Train RandomForestClassifier"]
    T --> U["Evaluate accuracy and confusion matrix"]
    U --> V["Save artifact<br/>model<br/>encoders<br/>feature_columns"]

    V --> W["Prediction request arrives"]
    W --> X["Normalize request season<br/>1 or first to First<br/>2 or second to Second"]
    X --> Y["Normalize request soil<br/>clay or ferrallitic to Clay<br/>sandy to Sandy<br/>otherwise Loam"]
    Y --> Z{"Encoders available?"}
    Z -->|Yes| AA["Safely encode season and soil using trained classes"]
    Z -->|No| AB["Use raw season and soil values"]
    AA --> AC["Create input frame with encoded values and weather features"]
    AB --> AD["Create input frame with raw values and weather features"]
    AC --> AE["Run model predict_proba"]
    AD --> AE
    AE --> AF["Rank crops and return top recommendations"]
```

## Notes

- If `crop_dataset.csv` is missing, the training pipeline falls back to a synthetic dataset.
- Soil normalization is not fully consistent between training and inference: training uses `Clay Loam` and `Sandy Loam`, while inference maps to `Clay` and `Sandy` before encoder fallback.
- The saved artifact bundles the trained model and the encoders used to transform categorical inputs.
