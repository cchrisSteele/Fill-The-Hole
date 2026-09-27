CREATE TABLE IF NOT EXISTS potholes (
    uid INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    severity INTEGER NOT NULL CHECK (severity IN (0, 1, 2, 3)),
    verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
    expires_at TEXT
);