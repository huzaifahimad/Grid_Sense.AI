import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from http.server import BaseHTTPRequestHandler
from _shared import send_json, get_models, risk_for_zone, GRID_ZONES

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        models = get_models()
        assets = []
        for zone_code, zone_info in GRID_ZONES.items():
            prob, _, cur_load, cur_temp = risk_for_zone(zone_code, models)
            load_ratio = round(cur_load / zone_info["capacity_mw"], 3)
            status = "CRITICAL" if prob >= 0.8 else ("WARNING" if prob >= 0.5 else "SAFE")
            assets.append({
                "zone": zone_code,
                "name": zone_info["name"],
                "capacity_mw": zone_info["capacity_mw"],
                "current_load_mw": round(cur_load, 1),
                "load_ratio": load_ratio,
                "temperature_c": round(cur_temp, 1),
                "risk_score": round(prob, 4),
                "status": status
            })
        assets.sort(key=lambda x: x["risk_score"], reverse=True)
        send_json(self, {"assets": assets})
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
    def log_message(self, *args): pass
