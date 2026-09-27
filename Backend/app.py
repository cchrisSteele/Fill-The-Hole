import json
import os
import sqlite3
from pathlib import Path
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from flask import Flask, jsonify, request

load_dotenv()
app = Flask(__name__)

SQL_DIR = Path(__file__).parent


@app.get("/api/health")
def health():
    return jsonify(status="ok"), 200


@app.post("/api/create-schema")
def create_schema():
    # check creds
    if not check_db_creds(request.headers.get("X-Admin-Key")):
        return jsonify(error="Unauthorized"), 401

    return run_sql_file("sql/schema.sql")


@app.post("/api/gen_potholes")
def gen_potholes():
    if not check_db_creds(request.headers.get("X-Admin-Key")):
            return jsonify(error="Unauthorized"), 401
    
    return run_sql_file("sql/gen_potholes.sql")

@app.get("/api/print_potholes")
def get_all_potholes():
    result = execute_sql(["SELECT * FROM potholes ORDER BY uid;"])
    query = result["results"][0]

    if query["type"] == "error":
        return jsonify(error="Database query failed"), 500

    data = query["response"]["result"]
    columns = [column["name"] for column in data["cols"]]

    potholes = [
        {
            name: cell.get("value")
            for name, cell in zip(columns, row)
        }
        for row in data["rows"]
    ]

    return jsonify(potholes=potholes), 200

@app.post("/api/new_pothole")
def new_pothole():
    data = request.get_json(silent=True) or {}

    user_id = data.get("user_id")
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    severity = data.get("severity")

    if not isinstance(user_id, str) or not user_id.strip():
        return jsonify(error="user_id is required"), 400

    if isinstance(latitude, bool) or not isinstance(latitude, (int, float)) or not -90 <= latitude <= 90:
        return jsonify(error="latitude must be between -90 and 90"), 400

    if isinstance(longitude, bool) or not isinstance(longitude, (int, float)) or not -180 <= longitude <= 180:
        return jsonify(error="longitude must be between -180 and 180"), 400

    if type(severity) is not int or severity not in (0, 1, 2, 3):
        return jsonify(error="severity must be 0, 1, 2, or 3"), 400

    result = execute_sql([{
        "sql": """
            INSERT INTO potholes (user_id, latitude, longitude, severity)
            VALUES (?, ?, ?, ?)
            RETURNING uid;
        """,
        "args": [
            {"type": "text", "value": user_id.strip()},
            {"type": "float", "value": str(latitude)},
            {"type": "float", "value": str(longitude)},
            {"type": "integer", "value": str(severity)},
        ],
    }])

    query = result["results"][0]
    if query["type"] == "error":
        return jsonify(error="Could not create pothole", details=query), 500

    uid = int(query["response"]["result"]["rows"][0][0]["value"])
    return jsonify(uid=uid, message="Pothole created"), 201

# Helper functions

def run_sql_file(filename):
    try:
        statements = read_sql_statements(filename)
        result = execute_sql(statements)
    except (FileNotFoundError, ValueError, KeyError) as exc:
        return jsonify(error=str(exc)), 500

    errors = [
        item for item in result["results"]
        if item["type"] == "error"
    ]
    if errors:
        return jsonify(error="Schema creation failed", details=errors), 500

    return jsonify(message="Schema created successfully"), 200

def check_db_creds(key):
    admin_key = os.environ.get("ADMIN_KEY")
    return bool(admin_key) and key == admin_key


def read_sql_statements(filename):
    """Read and split a trusted SQL file into complete statements."""
    sql = (SQL_DIR / filename).read_text(encoding="utf-8")
    statements = []
    current = ""

    for line in sql.splitlines(keepends=True):
        current += line

        if sqlite3.complete_statement(current):
            # Ignore chunks containing only comments or whitespace.
            statement = "\n".join(
                part for part in current.splitlines()
                if part.strip() and not part.lstrip().startswith("--")
            ).strip()

            if statement:
                statements.append(statement)

            current = ""

    # A file can end with comments after its last SQL statement.
    remaining = "\n".join(
        part for part in current.splitlines()
        if part.strip() and not part.lstrip().startswith("--")
    ).strip()
    if remaining:
        raise ValueError(f"Incomplete statement in {filename}")

    return statements


def execute_sql(statements):
    """Run SQL statements through Turso's HTTP pipeline."""
    database_url = os.environ["TURSO_DATABASE_URL"]
    http_url = database_url.replace("libsql://", "https://", 1).replace(
        "turso://", "https://", 1
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
        return json.load(response)


if __name__ == "__main__":
    app.run(debug=True)