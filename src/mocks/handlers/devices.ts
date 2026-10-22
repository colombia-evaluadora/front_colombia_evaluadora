import { delay, http, HttpResponse } from "msw"

import { createMockAccessToken, findUserByEmail, findUserByToken } from "@/mocks/db/auth"

/**
 * Credencial del equipo (sso `academico_test.tdevice_token`, auth-center
 * `/auth/devices` y `/auth/device/*`). Mismo contrato que el real: el token se
 * guarda HASHEADO (SHA-256), rota en cada canje, tolera que se presente una vez
 * el anterior (respuesta perdida) y un equipo revocado con borrado responde
 * 401 `device_revoked` con `wipe: true`.
 *
 * A diferencia del resto de los mocks, la tabla sobrevive a la recarga
 * (`localStorage["msw:devices"]`): el flujo que se prueba es justamente
 * "registrar, recargar, sincronizar sin contraseña" y "revocar y que el equipo
 * se entere al volver". Solo guarda hashes, nunca el token.
 */
interface MockDeviceRow {
  id: number
  email: string
  deviceId: string
  tokenHash: string
  prevTokenHash: string | null
  label: string | null
  userAgent: string | null
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string
  revokedAt: string | null
  revokeReason: "USUARIO" | "ADMIN" | "REUSO" | "REEMPLAZO" | null
  wipeRequested: boolean
  wipedAt: string | null
}

const STORAGE_KEY = "msw:devices"
const TTL_MS = 180 * 24 * 60 * 60 * 1000
const MAX_ACTIVE = 10

function load(): MockDeviceRow[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as MockDeviceRow[]
  } catch {
    return []
  }
}

function save(rows: MockDeviceRow[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  } catch {
    // Sin localStorage el mock queda solo en memoria de esta request.
  }
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function bearerUser(request: Request) {
  const auth = request.headers.get("Authorization") ?? ""
  return auth.startsWith("Bearer ") ? findUserByToken(auth.slice(7)) : undefined
}

function toDto(row: MockDeviceRow, currentDeviceId: string | null) {
  const { tokenHash: _hash, prevTokenHash: _prev, email: _email, ...rest } = row
  return { ...rest, current: currentDeviceId != null && row.deviceId === currentDeviceId && !row.revokedAt }
}

const isSuperAdmin = (roles: string[]) => roles.includes("CEVAL-SUPER_ADMINISTRADOR") || roles.includes("ADMIN")
const unauthorized = () => HttpResponse.json({ error: "unauthorized" }, { status: 401 })

function revoke(row: MockDeviceRow, reason: MockDeviceRow["revokeReason"], wipe: boolean) {
  row.revokedAt = row.revokedAt ?? new Date().toISOString()
  row.revokeReason = row.revokeReason ?? reason
  row.wipeRequested = row.wipeRequested || wipe
}

export const devicesHandlers = [
  http.post("/api/auth/devices", async ({ request }) => {
    await delay(150)
    const user = bearerUser(request)
    if (!user) return unauthorized()
    const body = (await request.json()) as { deviceId?: string; label?: string }
    if (!body.deviceId) return HttpResponse.json({ error: "device_id_required" }, { status: 400 })
    const rows = load()
    for (const row of rows) {
      if (row.email === user.email && row.deviceId === body.deviceId && !row.revokedAt) revoke(row, "REEMPLAZO", false)
    }
    if (rows.filter((r) => r.email === user.email && !r.revokedAt).length >= MAX_ACTIVE) {
      return HttpResponse.json({ error: "device_limit" }, { status: 409 })
    }
    const token = newToken()
    const now = new Date()
    const row: MockDeviceRow = {
      id: rows.reduce((max, r) => Math.max(max, r.id), 0) + 1,
      email: user.email,
      deviceId: body.deviceId,
      tokenHash: await sha256(token),
      prevTokenHash: null,
      label: body.label?.slice(0, 80) ?? null,
      userAgent: request.headers.get("User-Agent"),
      createdAt: now.toISOString(),
      lastUsedAt: null,
      expiresAt: new Date(now.getTime() + TTL_MS).toISOString(),
      revokedAt: null,
      revokeReason: null,
      wipeRequested: false,
      wipedAt: null,
    }
    rows.push(row)
    save(rows)
    return HttpResponse.json(
      { id: row.id, deviceId: row.deviceId, deviceToken: token, expiresAt: row.expiresAt, createdAt: row.createdAt },
      { status: 201 },
    )
  }),

  http.post("/api/auth/device/refresh", async ({ request }) => {
    await delay(120)
    const body = (await request.json()) as { deviceId?: string; deviceToken?: string }
    if (!body.deviceId || !body.deviceToken) return HttpResponse.json({ error: "invalid_device_token" }, { status: 401 })
    const hash = await sha256(body.deviceToken)
    const rows = load()
    const row = rows.find(
      (r) => r.deviceId === body.deviceId && (r.tokenHash === hash || r.prevTokenHash === hash),
    )
    if (!row) return HttpResponse.json({ error: "invalid_device_token" }, { status: 401 })
    if (row.revokedAt) {
      return HttpResponse.json({ error: "device_revoked", wipe: row.wipeRequested && !row.wipedAt }, { status: 401 })
    }
    if (Date.parse(row.expiresAt) <= Date.now()) return HttpResponse.json({ error: "device_expired" }, { status: 401 })
    const user = findUserByEmail(row.email)
    if (!user) return HttpResponse.json({ error: "account_disabled" }, { status: 401 })
    const next = newToken()
    // Presentar el actual rota (el actual pasa a "anterior"); presentar el
    // anterior (respuesta perdida) solo re-emite el actual.
    if (row.tokenHash === hash) row.prevTokenHash = hash
    row.tokenHash = await sha256(next)
    row.lastUsedAt = new Date().toISOString()
    row.expiresAt = new Date(Date.now() + TTL_MS).toISOString()
    save(rows)
    return HttpResponse.json({
      accessToken: createMockAccessToken(user, { did: row.deviceId }),
      deviceToken: next,
      expiresAt: row.expiresAt,
      expiresIn: 3600,
    })
  }),

  http.post("/api/auth/device/wipe-ack", async ({ request }) => {
    const body = (await request.json()) as { deviceId?: string; deviceToken?: string }
    if (!body.deviceId || !body.deviceToken) return new HttpResponse(null, { status: 204 })
    const hash = await sha256(body.deviceToken)
    const rows = load()
    const row = rows.find((r) => r.deviceId === body.deviceId && (r.tokenHash === hash || r.prevTokenHash === hash))
    if (row?.revokedAt && row.wipeRequested && !row.wipedAt) {
      row.wipedAt = new Date().toISOString()
      save(rows)
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get("/api/auth/devices/me", ({ request }) => {
    const user = bearerUser(request)
    if (!user) return unauthorized()
    const deviceId = request.headers.get("X-Device-Id")
    const mine = load().filter((r) => r.email === user.email && r.deviceId === deviceId)
    const row = mine.find((r) => !r.revokedAt) ?? mine.sort((a, b) => b.id - a.id)[0]
    if (!row) return HttpResponse.json({ status: "UNKNOWN", wipe: false, revokedAt: null, revokeReason: null, expiresAt: null })
    const status = row.revokedAt ? "REVOKED" : Date.parse(row.expiresAt) <= Date.now() ? "EXPIRED" : "ACTIVE"
    return HttpResponse.json({
      status,
      wipe: status === "REVOKED" && row.wipeRequested && !row.wipedAt,
      revokedAt: row.revokedAt,
      revokeReason: row.revokeReason,
      expiresAt: row.expiresAt,
    })
  }),

  http.get("/api/auth/devices/admin", ({ request }) => {
    const user = bearerUser(request)
    if (!user) return unauthorized()
    if (!isSuperAdmin(user.roles)) return HttpResponse.json({ error: "forbidden" }, { status: 403 })
    const email = new URL(request.url).searchParams.get("email")?.toLowerCase() ?? ""
    return HttpResponse.json(load().filter((r) => r.email.toLowerCase() === email).map((r) => toDto(r, null)))
  }),

  http.post("/api/auth/devices/admin/:id/revoke", async ({ request, params }) => {
    const user = bearerUser(request)
    if (!user) return unauthorized()
    if (!isSuperAdmin(user.roles)) return HttpResponse.json({ error: "forbidden" }, { status: 403 })
    const { wipe } = (await request.json()) as { wipe?: boolean }
    const rows = load()
    const row = rows.find((r) => r.id === Number(params.id))
    if (!row) return HttpResponse.json({ message: "Equipo no encontrado." }, { status: 404 })
    revoke(row, "ADMIN", wipe === true)
    save(rows)
    return HttpResponse.json(toDto(row, null))
  }),

  http.get("/api/auth/devices", ({ request }) => {
    const user = bearerUser(request)
    if (!user) return unauthorized()
    const current = request.headers.get("X-Device-Id")
    return HttpResponse.json(
      load()
        .filter((r) => r.email === user.email)
        .sort((a, b) => b.id - a.id)
        .map((r) => toDto(r, current)),
    )
  }),

  http.post("/api/auth/devices/:id/revoke", async ({ request, params }) => {
    await delay(150)
    const user = bearerUser(request)
    if (!user) return unauthorized()
    const { wipe } = (await request.json()) as { wipe?: boolean }
    const rows = load()
    const row = rows.find((r) => r.id === Number(params.id) && r.email === user.email)
    if (!row) return HttpResponse.json({ message: "Equipo no encontrado." }, { status: 404 })
    revoke(row, "USUARIO", wipe === true)
    save(rows)
    return HttpResponse.json(toDto(row, request.headers.get("X-Device-Id")))
  }),
]
