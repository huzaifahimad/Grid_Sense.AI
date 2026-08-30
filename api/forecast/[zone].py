import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import numpy as np
import pandas as pd
from _shared import send_json, get_models, GRID_ZONES, FEATURE_COLS

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        zone_code = parsed.path.rstrip("/").split("/")[-1].upper()
        params = parse_qs(parsed.query)
        horizon_hours = int(params.get("horizon_hours", ["24"])[0])

        if zone_code not in GRID_ZONES:
            send_json(self, {"error": f"Zone '{zone_code}' not found."}, 404)
            return

        models = get_models()
        zone_info = GRID_ZONES[zone_code]
        df = models["features"]
        zd = df[df["zone"] == zone_code]

        forecast_pts = []
        if not zd.empty:
            last_row = zd.iloc[-1]
            base_load = float(last_row["load_mw"])
            base_time = pd.to_datetime(last_row["timestamp"])

            for h in range(1, horizon_hours + 1):
                ts = base_time + pd.Timedelta(hours=h)
                # Build a minimal feature row for LightGBM inference
                feat = zd.iloc[-1:][FEATURE_COLS].copy()
                feat["hour_sin"] = float(math.sin(2 * math.pi * ts.hour / 24))
                feat["hour_cos"] = float(math.cos(2 * math.pi * ts.hour / 24))
                feat["dayofweek_sin"] = float(math.sin(2 * math.pi * ts.dayofweek / 7))
                feat["dayofweek_cos"] = float(math.cos(2 * math.pi * ts.dayofweek / 7))
                feat["month_sin"] = float(math.sin(2 * math.pi * ts.month / 12))
                feat["month_cos"] = float(math.cos(2 * math.pi * ts.month / 12))
                feat["is_weekend"] = float(ts.dayofweek >= 5)

                p50 = float(models["forecaster"].predict(feat)[0])
                p10 = round(p50 * 0.95, 1)
                p90 = round(p50 * 1.05, 1)

                forecast_pts.append({
                    "timestamp": ts.isoformat(),
                    "hour": int(ts.hour),
                    "p10_mw": p10,
                    "p50_mw": round(p50, 1),
                    "p90_mw": p90,
                    "capacity_mw": zone_info["capacity_mw"]
                })
        else:
            # FR fallback
            import datetime
            base = datetime.datetime.utcnow()
            for h in range(1, horizon_hours + 1):
                ts = base + datetime.timedelta(hours=h)
                mid = zone_info["capacity_mw"] * 0.65
                forecast_pts.append({
                    "timestamp": ts.isoformat(), "hour": ts.hour,
                    "p10_mw": round(mid * 0.95, 1), "p50_mw": round(mid, 1),
                    "p90_mw": round(mid * 1.05, 1), "capacity_mw": zone_info["capacity_mw"]
                })

        send_json(self, {
            "zone": zone_code,
            "name": zone_info["name"],
            "horizon_hours": horizon_hours,
            "forecast": forecast_pts
        })

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
    def log_message(self, *args): pass
