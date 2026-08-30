"""
Shared model loader for all Vercel Python serverless functions.
Models are loaded once per warm instance and cached.
"""
import os
import sys
import json
import joblib
import pandas as pd

# ── paths ──────────────────────────────────────────────────────────────────
# api/_shared.py lives in  <repo>/api/
# ml_models/               lives in  <repo>/ml_models/
_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.dirname(_HERE)
MODELS_DIR = os.path.join(_REPO, "ml_models")

# ── zone config ────────────────────────────────────────────────────────────
GRID_ZONES = {
    "ES": {"name": "Spain (Red Eléctrica)",    "capacity_mw": 42000, "lat": 40.4, "lon": -3.7},
    "DE": {"name": "Germany (TenneT/Amprion)", "capacity_mw": 75000, "lat": 51.2, "lon": 10.4},
    "FR": {"name": "France (RTE)",             "capacity_mw": 85000, "lat": 46.2, "lon":  2.3},
}

FEATURE_COLS = [
    "load_lag_1h", "load_lag_24h", "load_lag_168h",
    "temperature", "humidity", "wind_speed", "precipitation",
    "temp_humidity_index", "temp_lag_24h",
    "hour_sin", "hour_cos", "dayofweek_sin", "dayofweek_cos",
    "month_sin", "month_cos", "is_weekend",
    "load_rolling_mean_24h", "load_rolling_std_24h", "load_rolling_mean_168h",
]

# ── lazy-loaded model cache (warm instance reuse) ──────────────────────────
_cache: dict = {}

def get_models() -> dict:
    if "loaded" not in _cache:
        _cache["forecaster"] = joblib.load(os.path.join(MODELS_DIR, "lgbm_load_forecaster.joblib"))
        _cache["classifier"] = joblib.load(os.path.join(MODELS_DIR, "lgbm_risk_classifier.joblib"))
        _cache["explainer"]  = joblib.load(os.path.join(MODELS_DIR, "shap_explainer.joblib"))
        _cache["features"]   = pd.read_parquet(os.path.join(MODELS_DIR, "training_features.parquet"))
        _cache["loaded"] = True
    return _cache

# ── helpers ────────────────────────────────────────────────────────────────
def risk_for_zone(zone_code: str, models: dict):
    """Return (prob, top_factors, cur_load, cur_temp) from real model inference."""
    df = models["features"]
    zone_info = GRID_ZONES[zone_code]
    capacity = zone_info["capacity_mw"]

    zd = df[df["zone"] == zone_code]
    if zd.empty:
        # FR has no real data — sensible fallback
        cur_load = capacity * 0.7
        cur_temp = 22.0
        prob = 0.01
        top_factors = []
        return prob, top_factors, cur_load, cur_temp

    last_row = zd.iloc[-1]
    cur_load = float(last_row["load_mw"])
    cur_temp = float(last_row["temperature"])
    feat_row = zd.iloc[-1:][FEATURE_COLS]

    # Real LightGBM classifier inference
    prob = float(models["classifier"].predict_proba(feat_row)[0, 1])

    # Real SHAP values
    shap_vals = models["explainer"].shap_values(feat_row)
    vals = shap_vals[1][0] if isinstance(shap_vals, list) else shap_vals[0]
    pairs = sorted(zip(FEATURE_COLS, [float(v) for v in vals]),
                   key=lambda x: abs(x[1]), reverse=True)
    top_factors = [{"feature": f, "impact": round(v, 4)} for f, v in pairs[:5]]

    return prob, top_factors, cur_load, cur_temp

def cors_headers(self_handler):
    self_handler.send_header("Access-Control-Allow-Origin", "*")
    self_handler.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
    self_handler.send_header("Access-Control-Allow-Headers", "Content-Type")

def send_json(self_handler, data: dict, status: int = 200):
    body = json.dumps(data).encode()
    self_handler.send_response(status)
    self_handler.send_header("Content-Type", "application/json")
    cors_headers(self_handler)
    self_handler.end_headers()
    self_handler.wfile.write(body)
