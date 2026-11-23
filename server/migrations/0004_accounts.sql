-- Accounts, the Chatzer way: a "vault" = this player's keys and groups, encrypted on the phone. Its id and key come
-- from a passkey (Face ID, WebAuthn PRF) or from username + password (PBKDF2 on the phone). The server sees neither
-- the password nor the contents; owner_hash ties a vault to the player who wrote it.
CREATE TABLE vaults (
  id TEXT PRIMARY KEY,          -- 64 hex, derived from the secret: finding a vault needs the secret
  owner_hash TEXT NOT NULL,
  data TEXT NOT NULL,           -- AES-GCM ciphertext (base64)
  updated_at INTEGER NOT NULL
);
CREATE INDEX vaults_owner ON vaults(owner_hash);
-- Usernames are unique: only a hash of the normalized name, and which vault it belongs to.
CREATE TABLE usernames (
  hash TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL,
  owner_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
