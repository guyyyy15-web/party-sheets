// Accounts, the Chatzer way ("save your duckling"): the player's keys and groups are encrypted on the phone and
// kept on the server as a "vault". Two ways to open it, each giving 32 secret bytes only the player has:
// - a passkey (Face ID / fingerprint) through the WebAuthn PRF extension;
// - a username + password (PBKDF2 on the phone, 600k rounds). The server never sees the password.
// From those bytes: HKDF → the vault's id (finding a vault needs the secret) and its AES-GCM key.
// Signing in on a new phone = open the vault → this phone becomes that player → its characters come back.
import { getSetting, setSetting } from './store.js'
import { apiBase, ownerKey, listRooms, restoreRooms } from './sync.js'

const LOCAL = 'account' // { username?, methods: [{ kind: 'passkey' | 'password', id, key (b64) }] }
const enc = new TextEncoder()
const dec = new TextDecoder()
const b64 = (bytes) => btoa(String.fromCharCode(...bytes))
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const rand = (n) => crypto.getRandomValues(new Uint8Array(n))
const fail = (code, msg) => { throw Object.assign(new Error(msg), { code }) }

export const account = () => getSetting(LOCAL, null)
const setAccount = (a) => setSetting(LOCAL, a)
export const signedIn = () => !!account()?.methods?.length

let saltP = null
const prfSalt = () => (saltP ??= crypto.subtle.digest('SHA-256', enc.encode('party-sheets-vault-v1')).then((b) => new Uint8Array(b)))

async function derive(secret) {
  const base = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits'])
  const bits = async (info) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: enc.encode(info) }, base, 256))
  return { id: hex(await crypto.subtle.digest('SHA-256', await bits('ps-vault-id'))), key: await bits('ps-vault-key') }
}
const normName = (u) => String(u || '').trim().toLowerCase()
export const validUsername = (u) => /^[a-z0-9][a-z0-9._-]{2,23}$/.test(normName(u))
const nameHash = async (u) => hex(await crypto.subtle.digest('SHA-256', enc.encode(`ps-username:${normName(u)}`)))
async function passwordSecret(username, password) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(`party-sheets:${normName(username)}`), iterations: 600000 }, base, 256))
}

// ── the vault's contents: who this player is (owner key) and their groups (with their links)
async function seal(key, methods) {
  const a = account()
  const plain = enc.encode(JSON.stringify({ v: 1, owner: ownerKey(), username: a?.username || null, rooms: listRooms(), methods }))
  const k = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt'])
  const iv = rand(12)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, plain))
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12)
  return b64(out)
}
async function unseal(key, data) {
  const bytes = unb64(data)
  const k = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt'])
  return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, k, bytes.subarray(12))))
}
async function call(path, { method = 'GET', body, owner } = {}) {
  let r
  try { r = await fetch(apiBase() + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(owner ? { 'X-Owner': ownerKey() } : {}) }, body: body ? JSON.stringify(body) : undefined }) } catch { fail('net', 'No connection. Try again when online.') }
  if (r.status === 429) fail('rate', 'Too many tries. Try again in an hour.')
  const j = await r.json().catch(() => ({}))
  if (!r.ok) fail(r.status === 404 ? 'not-found' : r.status === 409 ? 'taken' : 'server', j.error || `error ${r.status}`)
  return j
}
async function upload(m, methods, extra = {}) {
  await call(`/vault/${m.id}`, { method: 'PUT', owner: true, body: { data: await seal(m.key, methods), ...extra } })
}
const asEntry = (kind, v) => ({ kind, id: v.id, key: b64(v.key) })

/** After the player's groups change: re-save every sign-in method this phone knows (no Face ID needed). */
let pending = null
export function refreshAccount() {
  if (!signedIn()) return
  clearTimeout(pending)
  pending = setTimeout(async () => {
    const methods = account().methods
    for (const m of methods) await upload({ id: m.id, key: unb64(m.key) }, methods).catch(() => {})
  }, 1500)
}

async function addMethod(kind, v, extra = {}) {
  const a = account() || { methods: [] }
  const methods = [...a.methods.filter((m) => m.kind !== kind), asEntry(kind, v)]
  await upload(v, methods, extra)
  setAccount({ ...a, ...(extra.usernameText ? { username: extra.usernameText } : {}), methods })
  // the other methods learn about this one, so signing in with any of them knows them all
  for (const m of methods) if (m.kind !== kind) await upload({ id: m.id, key: unb64(m.key) }, methods).catch(() => {})
}

/** Opens a vault: this phone becomes that player. Returns { owner, username, rooms }. */
async function open(v, kind) {
  let body
  try { body = await unseal(v.key, (await call(`/vault/${v.id}`)).data) } catch (e) {
    if (e.code === 'not-found') fail('not-found', kind === 'password' ? 'Wrong username or password.' : 'No account saved with this Face ID. Sign in with your username and password, or create an account.')
    if (e.code) throw e
    fail('bad', 'Couldn\'t open this account.')
  }
  if (!body?.owner) fail('bad', 'Couldn\'t open this account.')
  setSetting('owner', body.owner)
  restoreRooms(body.rooms || [])
  const methods = Array.isArray(body.methods) && body.methods.length ? body.methods : [asEntry(kind, v)]
  if (!methods.some((m) => m.id === v.id)) methods.push(asEntry(kind, v))
  setAccount({ username: body.username || null, methods })
  return body
}

// ── Face ID (passkey)
export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const passkeyName = () => (isIOS() ? 'Face ID' : /Android/.test(navigator.userAgent) ? 'fingerprint' : 'passkey')
export const passkeysAvailable = () => !!(window.PublicKeyCredential && navigator.credentials?.create && window.isSecureContext)
const cancelled = (e) => e?.name === 'NotAllowedError' || e?.name === 'AbortError'

async function prfGet(allowId = null) {
  let a
  try {
    a = await navigator.credentials.get({ publicKey: {
      challenge: rand(32), rpId: location.hostname, userVerification: 'required', timeout: 120000,
      ...(allowId ? { allowCredentials: [{ type: 'public-key', id: allowId }] } : {}),
      extensions: { prf: { eval: { first: await prfSalt() } } },
    } })
  } catch (e) { if (cancelled(e)) fail('cancelled', 'Cancelled.'); throw e }
  const out = a?.getClientExtensionResults?.().prf?.results?.first
  if (!out) fail('no-prf', `This device can't sign in with ${passkeyName()}. Use a username and password.`)
  return new Uint8Array(out)
}

/** Adds Face ID to this player's account (creates the account if it's the first method). */
export async function addPasskey(label) {
  let cred
  try {
    cred = await navigator.credentials.create({ publicKey: {
      rp: { name: 'Tavern Table', id: location.hostname },
      user: { id: rand(16), name: label || 'Tavern Table player', displayName: `${label || 'Player'} · Tavern Table` },
      challenge: rand(32),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'required' },
      timeout: 120000,
      extensions: { prf: { eval: { first: await prfSalt() } } },
    } })
  } catch (e) { if (cancelled(e)) fail('cancelled', 'Cancelled.'); fail('failed', `Couldn't create a ${passkeyName()} sign-in on this device.`) }
  const ext = cred.getClientExtensionResults?.() || {}
  if (ext.prf && ext.prf.enabled === false) fail('no-prf', `This device can't sign in with ${passkeyName()}. Use a username and password.`)
  const secret = ext.prf?.results?.first ? new Uint8Array(ext.prf.results.first) : await prfGet(cred.rawId)
  await addMethod('passkey', await derive(secret))
}
export async function signInPasskey() { return open(await derive(await prfGet()), 'passkey') }

// ── username + password
export async function usernameFree(username) { return !(await call(`/usernames/${await nameHash(username)}`, { owner: true })).taken }
/** Creates (or changes) the username + password sign-in for this player. */
export async function setPassword(username, password) {
  if (!validUsername(username)) fail('format', 'Username: 3-24 letters, numbers, dots, dashes or underscores.')
  if (String(password).length < 8) fail('format', 'Password: at least 8 characters.')
  const v = await derive(await passwordSecret(username, password))
  try { await addMethod('password', v, { username: await nameHash(username), usernameText: username.trim() }) } catch (e) {
    if (e.code === 'taken') fail('taken', 'That username is taken. Try another.')
    throw e
  }
}
export async function signInPassword(username, password) {
  if (!username || !password) fail('format', 'Enter your username and password.')
  return open(await derive(await passwordSecret(username, password)), 'password')
}

/** Sign out on this phone: forget the account, the groups and this phone's copy of the characters (they stay on
 *  the server). The caller clears the characters. */
export function signOutLocal() {
  setAccount(null)
  setSetting('rooms', [])
  setSetting('owner', null)
}
