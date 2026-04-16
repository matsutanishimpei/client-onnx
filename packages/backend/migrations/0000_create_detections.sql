-- Initial migration for detections table
CREATE TABLE IF NOT EXISTS detections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  summary TEXT,
  results_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON detections(timestamp);
