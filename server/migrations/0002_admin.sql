-- The owner's admin screen: one admin password (only its hash), and daily usage counters (writes only).
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE usage (day TEXT NOT NULL, kind TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, kind));
-- Group settings the DM controls (e.g. { "expansions": true }).
ALTER TABLE rooms ADD COLUMN settings TEXT NOT NULL DEFAULT '{}';
