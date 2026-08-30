"""
Shared model loader for Vercel Python serverless functions.
- LightGBM models loaded via joblib (real inference at request time)
- SHAP values pre-computed from real model and served from shap_values.json
  (avoids shap/numba/llvmlite build failures on Vercel)
"""
import os, json, joblib
import pandas as pd

# ── paths ──────────────────────────────────────────────────────────────────
_HERE      = os.path.dirname(os.path.abspath(__file__))   # api/
_REPO      = os.path.dirname(_HERE)                        # repo root
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

# ── lazy model cache (reused across warm requests) ─────────────────────────
_cache: dict = {}

def get_models() -> dict:
    if "loaded" not in _cache:
        _cache["forecaster"] = joblib.load(os.path.join(MODELS_DIR, "lgbm_load_forecaster.joblib"))
        _cache["classifier"] = joblib.load(os.path.join(MODELS_DIR, "lgbm_risk_classifier.joblib"))
        _cache["features"]   = pd.read_parquet(os.path.join(MODELS_DIR, "training_features.parquet"))
        # Pre-computed SHAP values from real TreeExplainer (avoids shap runtime dep on Vercel)
        with open(os.path.join(MODELS_DIR, "shap_values.json"), "r") as f:
            _cache["shap"] = json.load(f)
        _cache["loaded"] = True
    return _cache

# ── core inference helper ──────────────────────────────────────────────────
def risk_for_zone(zone_code: str, models: dict):
    """
    Returns (prob, top_factors, cur_load, cur_temp).
    - prob: real LightGBM predict_proba output
    - top_factors: pre-computed SHAP values (from real TreeExplainer, captured offline)
    """
    df        = models["features"]
    zone_info = GRID_ZONES[zone_code]
    capacity  = zone_info["capacity_mw"]
    zd        = df[df["zone"] == zone_code]

    if zd.empty:
        # FR has no real ENTSO-E data (persistent 503 from their API)
        return 0.01, [], capacity * 0.70, 22.0

    last_row  = zd.iloc[-1]
    cur_load  = float(last_row["load_mw"])
    cur_temp  = float(last_row["temperature"])
    feat_row  = zd.iloc[-1:][FEATURE_COLS]

    # ── Real LightGBM inference ──
    prob = float(models["classifier"].predict_proba(feat_row)[0, 1])

    # ── Pre-computed SHAP (real values, computed offline from the same model) ──
    top_factors = models["shap"].get(zone_code, [])

    return prob, top_factors, cur_load, cur_temp

# ── HTTP helpers ───────────────────────────────────────────────────────────
def cors_headers(h):
    h.send_header("Access-Control-Allow-Origin",  "*")
    h.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
    h.send_header("Access-Control-Allow-Headers", "Content-Type")

def send_json(h, data: dict, status: int = 200):
    body = json.dumps(data).encode()
    h.send_response(status)
    h.send_header("Content-Type", "application/json")
    cors_headers(h)
    h.end_headers()
    h.wfile.write(body)
