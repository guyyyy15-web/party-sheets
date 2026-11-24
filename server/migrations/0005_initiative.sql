-- Initiative: a third link per group (only its hash), and the group's current fight (one JSON per room).
ALTER TABLE rooms ADD COLUMN init_hash TEXT;
CREATE TABLE IF NOT EXISTS encounters (
  room_id TEXT PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);
