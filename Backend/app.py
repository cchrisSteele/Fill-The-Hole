# app.py
import json
import os
import sqlite3
from pathlib import Path
from urllib.request import Request, urlopen
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, request

app = Flask(__name__)

@app.get("/api/health")
def health():
    return jsonify(status="ok"), 200

@app.post("/api/admin/create-schema")
def create_schema():
    check_key = request.headers.get("X-Admin-Key")
    if not check_db_creds(check_key):
        return jsonify({"error": "Unauthorized"}), 401

    schema = Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")

    statements = []
    current = ""
    for line in schema.splitlines(keepends=True):
        current += line
        if sqlite3.complete_statement(current):
            if current.strip():
                statements.append(current)
            current = ""

    if current.strip():
        return jsonify({"error": "Incomplete statement in schema.sql"}), 500

    database_url = os.environ["TURSO_DATABASE_URL"]
    http_url = database_url.replace("libsql://", "https://").replace(
        "turso://", "https://"
    ).rstrip("/")

    payload = {
        "requests": [
            *[{"type": "execute", "stmt": {"sql": sql}} for sql in statements],
            {"type": "close"},
        ]
    }
    turso_request = Request(
        f"{http_url}/v2/pipeline",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {os.environ['TURSO_AUTH_TOKEN']}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urlopen(turso_request, timeout=20) as response:
        result = json.load(response)

    errors = [item for item in result["results"] if item["type"] == "error"]
    if errors:
        return jsonify({"error": "Schema creation failed", "details": errors}), 500

    return jsonify({"message": "Schema created successfully"}), 200



# Helper Fucntions

def check_db_creds(key):
    admin_key = os.environ.get("ADMIN_KEY")
    if not key or key != admin_key:
        return False

    else:
        return True

if __name__ == "__main__":
    app.run(debug=True)