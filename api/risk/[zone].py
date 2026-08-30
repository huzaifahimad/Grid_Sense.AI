import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse
from _shared import send_json, get_models, risk_for_zone, GRID_ZONES

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Extract zone from path: /api/risk/ES
        zone_code = self.path.rstrip("/").split("/")[-1].upper()
        if zone_code not in GRID_ZONES:
            send_json(self, {"error": f"Zone '{zone_code}' not found. Valid: {list(GRID_ZONES.keys())}"}, 404)
            return

        models = get_models()
        prob, top_factors, cur_load, cur_temp = risk_for_zone(zone_code, models)
        zone_info = GRID_ZONES[zone_code]
        status = "CRITICAL" if prob >= 0.8 else ("WARNING" if prob >= 0.5 else "SAFE")

        send_json(self, {
            "zone": zone_code,
            "name": zone_info["name"],
            "capacity_mw": zone_info["capacity_mw"],
            "current_load_mw": round(cur_load, 1),
            "temperature_c": round(cur_temp, 1),
            "risk_score": round(prob, 4),
            "status": status,
            "top_contributing_factors": top_factors,
            "data_source": "Real ENTSO-E + NASA POWER"
        })

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
    def log_message(self, *args): pass
