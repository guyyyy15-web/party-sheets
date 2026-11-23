-- Rooms: one per playing group. Only hashes of the two keys are stored (the links carry the keys).
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  player_hash TEXT NOT NULL,   -- SHA-256 of the player invite key
  dm_hash TEXT NOT NULL,       -- SHA-256 of the DM key
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
-- Characters: one room each. data = the character JSON (not encrypted, by the owner's choice). rev grows on each write.
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  owner_hash TEXT NOT NULL,    -- SHA-256 of the owner's device key: only the owner (or the DM, for quick actions) writes
  data TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS characters_room ON characters(room_id);
-- Per-client rate limits (the client is a hash of its IP and the day, never the IP itself).
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window)
);
