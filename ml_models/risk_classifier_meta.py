import logging
import joblib
import numpy as np
import pandas as pd
import lightgbm as lgb
import shap
from sklearn.metrics import precision_recall_curve, auc, roc_auc_score
from config import FEATURES_DATA_DIR, MODELS_DIR

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# LEAKAGE PREVENTION: load_to_capacity_ratio MUST be absent from FEATURE_COLS
FEATURE_COLS = [
    "load_lag_1h", "load_lag_24h", "load_lag_168h",
    "temperature", "humidity", "wind_speed", "precipitation",
    "temp_humidity_index", "temp_lag_24h",
    "hour_sin", "hour_cos", "dayofweek_sin", "dayofweek_cos",
    "month_sin", "month_cos", "is_weekend",
    "load_rolling_mean_24h", "load_rolling_std_24h", "load_rolling_mean_168h"
]

TARGET_COL = "overload_target"

def train_risk_classifier():
    features_path = FEATURES_DATA_DIR / "training_features.parquet"
    if not features_path.exists():
        raise FileNotFoundError(f"Feature dataset not found at {features_path}. Run build_features.py first.")
        
    df = pd.read_parquet(features_path)
    df = df.sort_values("timestamp").reset_index(drop=True)
    
    # Confirm leakage feature is not present in FEATURE_COLS
    assert "load_to_capacity_ratio" not in FEATURE_COLS, "CRITICAL ERROR: load_to_capacity_ratio found in FEATURE_COLS causing label leakage!"
    
    # Split 80/20 walk-forward
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]
    
    X_train, y_train = train_df[FEATURE_COLS], train_df[TARGET_COL]
    X_test, y_test = test_df[FEATURE_COLS], test_df[TARGET_COL]
    
    pos_count = y_train.sum()
    neg_count = len(y_train) - pos_count
    scale_pos_weight = neg_count / max(1, pos_count)
    
    logger.info(f"Class distribution: {pos_count} positive / {neg_count} negative (scale_pos_weight={scale_pos_weight:.2f})")
    
    model = lgb.LGBMClassifier(
        n_estimators=200,
        learning_rate=0.05,
        num_leaves=31,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        verbosity=-1
    )
    model.fit(X_train, y_train)
    
    # Predict probabilities
    y_probs = model.predict_proba(X_test)[:, 1]
    
    # Compute PR-AUC and ROC-AUC
    precision, recall, _ = precision_recall_curve(y_test, y_probs)
    pr_auc = auc(recall, precision)
    roc_auc = roc_auc_score(y_test, y_probs)
    
    logger.info(f"Risk Classifier Performance -> PR-AUC: {pr_auc:.4f} | ROC-AUC: {roc_auc:.4f}")
    
    if pr_auc > 0.99:
        logger.warning(f"PR-AUC is suspiciously high ({pr_auc:.4f} > 0.99). Investigate potential feature leakage!")
    else:
        logger.info(f"PR-AUC ({pr_auc:.4f}) is within expected realistic range.")
        
    # Fit SHAP explainer
    explainer = shap.TreeExplainer(model)
    
    # Save model and explainer
    model_path = MODELS_DIR / "lgbm_risk_classifier.joblib"
    explainer_path = MODELS_DIR / "shap_explainer.joblib"
    
    joblib.dump(model, model_path)
    joblib.dump(explainer, explainer_path)
    logger.info(f"Saved risk classifier model to {model_path} and explainer to {explainer_path}")
    
    return model, explainer, pr_auc

if __name__ == "__main__":
    train_risk_classifier()
