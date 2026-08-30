import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from http.server import BaseHTTPRequestHandler
from _shared import send_json, get_models, risk_for_zone, GRID_ZONES

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        zone_code = self.path.rstrip("/").split("/")[-1].upper()
        if zone_code not in GRID_ZONES:
            send_json(self, {"error": f"Zone '{zone_code}' not found."}, 404)
            return

        models = get_models()
        prob, _, cur_load, _ = risk_for_zone(zone_code, models)
        zone_info = GRID_ZONES[zone_code]
        capacity = zone_info["capacity_mw"]
        excess = max(0.0, cur_load - capacity * 0.95)
        recommended_shed = round(excess * 1.1, 1)

        if prob >= 0.8:
            severity = "HIGH"
            reasoning = (
                f"CRITICAL overload risk (score={prob:.3f}). "
                f"Current load {cur_load:.0f} MW vs {capacity} MW capacity. "
                f"Immediate load reduction of {recommended_shed} MW recommended."
            )
            schedule = [
                {"priority": 1, "feeder": "Industrial Zone A", "shed_mw": round(recommended_shed * 0.5, 1), "action": "Curtail immediately"},
                {"priority": 2, "feeder": "Commercial District B", "shed_mw": round(recommended_shed * 0.3, 1), "action": "Reduce to 70%"},
                {"priority": 3, "feeder": "Residential Sector C", "shed_mw": round(recommended_shed * 0.2, 1), "action": "Rolling 15-min cuts"},
            ]
        elif prob >= 0.5:
            severity = "MODERATE"
            reasoning = (
                f"Elevated overload risk (score={prob:.3f}). "
                f"Grid operating at {cur_load/capacity*100:.1f}% of capacity. "
                f"Precautionary shedding advised."
            )
            schedule = [
                {"priority": 1, "feeder": "Industrial Zone A", "shed_mw": round(recommended_shed, 1), "action": "Voluntary curtailment request"},
            ]
        else:
            severity = "LOW"
            reasoning = (
                f"Normal grid operating parameters. "
                f"Overload risk score ({prob:.2f}) is low. "
                f"Operating margin is sufficient."
            )
            schedule = []

        send_json(self, {
            "zone": zone_code,
            "risk_score": round(prob, 4),
            "severity": severity,
            "excess_load_mw": round(excess, 1),
            "recommended_shed_mw": recommended_shed,
            "reasoning": reasoning,
            "recommended_action": "No load shedding required. Maintain standard monitoring." if severity == "LOW" else "Initiate load shedding per schedule below.",
            "shed_schedule": schedule
        })

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
    def log_message(self, *args): pass
