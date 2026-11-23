-- Every character is stored on the server, in a group or not: room_id becomes optional. Leaving a group (or a group
-- being deleted) keeps the character, it just has no group. Rebuilt because SQLite can't relax NOT NULL in place.
PRAGMA defer_foreign_keys = true;
CREATE TABLE characters_new (
  id TEXT PRIMARY KEY,
  room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
  owner_hash TEXT NOT NULL,
  data TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);
INSERT INTO characters_new (id, room_id, owner_hash, data, rev, updated_at) SELECT id, room_id, owner_hash, data, rev, updated_at FROM characters;
DROP TABLE characters;
ALTER TABLE characters_new RENAME TO characters;
CREATE INDEX characters_room ON characters(room_id);
CREATE INDEX characters_owner ON characters(owner_hash);
