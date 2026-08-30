import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from http.server import BaseHTTPRequestHandler
from _shared import send_json, GRID_ZONES

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        send_json(self, {
            "service": "GridSense AI REST API",
            "status": "online",
            "supported_zones": list(GRID_ZONES.keys()),
            "version": "1.0.0",
            "runtime": "Python (Vercel Serverless)",
            "model_metrics": {
                "load_forecaster_mape": "1.61%",
                "risk_classifier_pr_auc": "0.9794",
                "training_data": "Real ENTSO-E + NASA POWER (17,136 rows)"
            }
        })
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()
    def log_message(self, *args): pass
