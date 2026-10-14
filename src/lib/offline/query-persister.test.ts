import "fake-indexeddb/auto"

import { QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { __closeDbForTests, DB_NAME, getDb, setMeta } from "@/lib/offline/db"
import {
  __resetPersisterForTests,
  activatePersistUser,
  clearUserData,
  flushPersistQueue,
  getLastUserSub,
  initOfflinePersistence,
  makeBuster,
  MAX_ENTRY_BYTES,
  OFFLINE_TTL,
  restoreUserQueries,
  setDeviceMode,
  startQueryPersister,
} from "@/lib/offline/query-persister"
import {
  getUsableOfflineSession,
  OFFLINE_SESSION_MAX_AGE_MS,
  saveOnlineSession,
} from "@/lib/offline/session"

// `auth.ts` arrastra el cliente HTTP real; para `enterOfflineSession` alcanza
// con un doble sin red.
vi.mock("@/lib/api-client", () => ({
  api: { post: vi.fn() },
  isNetworkError: () => false,
  NetworkSessionError: class extends Error {},
  setAuthToken: vi.fn(),
}))

const { enterOfflineSession } = await import("@/lib/auth")

const A = "a@example.com"
const B = "b@example.com"

async function resetDb() {
  __resetPersisterForTests()
  await __closeDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}

async function rows(sub?: string) {
  const db = await getDb()
  return sub ? db.getAllFromIndex("queries", "byUser", sub) : db.getAll("queries")
}

function newClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  startQueryPersister(client)
  return client
}

async function fetchAndFlush(client: QueryClient, key: unknown[], data: unknown, meta?: object) {
  await client.fetchQuery({ queryKey: key, queryFn: () => data, meta: meta as never })
  await flushPersistQueue()
}

const offlineMeta = { offline: { ttl: OFFLINE_TTL.roster } }

beforeEach(async () => {
  await resetDb()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("persister selectivo", () => {
  it("solo persiste queries exitosas con meta.offline", async () => {
    await setDeviceMode("personal")
    const client = newClient()
    await activatePersistUser(client, A)
    await fetchAndFlush(client, ["planeador", "x"], { ok: 1 }, offlineMeta)
    await fetchAndFlush(client, ["funcionarios"], [{ documento: "123" }])
    await client
      .fetchQuery({
        queryKey: ["falla"],
        queryFn: () => Promise.reject(new Error("x")),
        meta: offlineMeta as never,
      })
      .catch(() => undefined)
    await flushPersistQueue()
    const stored = await rows(A)
    expect(stored.map((r) => r.queryKey)).toEqual([["planeador", "x"]])
    expect(stored[0].buster).toBe(makeBuster(A))
  })

  it("aplica persistSelect antes de guardar", async () => {
    await setDeviceMode("personal")
    const client = newClient()
    await activatePersistUser(client, A)
    const roster = [{ pk: 1, nombre: "Ana", documento: "999", acudiente: "X" }]
    await fetchAndFlush(client, ["roster", 1], roster, {
      ...offlineMeta,
      persistSelect: (data: typeof roster) => data.map(({ pk, nombre }) => ({ pk, nombre })),
    })
    const [row] = await rows(A)
    expect(JSON.parse(row.data)).toEqual([{ pk: 1, nombre: "Ana" }])
  })

  it("no persiste entradas de más de 2 MB", async () => {
    await setDeviceMode("personal")
    const client = newClient()
    await activatePersistUser(client, A)
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    await fetchAndFlush(client, ["grande"], "x".repeat(MAX_ENTRY_BYTES + 10), offlineMeta)
    expect(await rows(A)).toHaveLength(0)
  })

  it("agrupa escrituras con throttle de 1 s", async () => {
    await setDeviceMode("personal")
    const client = newClient()
    await activatePersistUser(client, A)
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    try {
      await client.fetchQuery({ queryKey: ["t"], queryFn: () => 1, meta: offlineMeta as never })
      vi.advanceTimersByTime(999)
      expect(await rows(A)).toHaveLength(0)
      vi.advanceTimersByTime(1)
    } finally {
      vi.useRealTimers()
    }
    await vi.waitFor(async () => expect(await rows(A)).toHaveLength(1))
  })

  it("en modo equipo compartido no persiste nada", async () => {
    await setDeviceMode("compartido")
    const client = newClient()
    await activatePersistUser(client, A)
    await fetchAndFlush(client, ["planeador", "x"], { ok: 1 }, offlineMeta)
    await saveOnlineSession({ sub: A, name: "Ana", roles: [], isSuperAdmin: false })
    expect(await rows()).toHaveLength(0)
    expect(await (await getDb()).getAll("session")).toHaveLength(0)
    expect(await getLastUserSub()).toBeUndefined()
  })

  it("pasar a compartido borra lo que hubiera", async () => {
    await setDeviceMode("personal")
    const client = newClient()
    await activatePersistUser(client, A)
    await fetchAndFlush(client, ["planeador", "x"], { ok: 1 }, offlineMeta)
    expect(await rows()).toHaveLength(1)
    await setDeviceMode("compartido")
    expect(await rows()).toHaveLength(0)
  })

  it("el modo por defecto del equipo es compartido", async () => {
    await initOfflinePersistence()
    const client = newClient()
    await activatePersistUser(client, A)
    await fetchAndFlush(client, ["planeador", "x"], { ok: 1 }, offlineMeta)
    expect(await rows()).toHaveLength(0)
  })
})

describe("restauración y buster", () => {
  it("restaura las filas vigentes del usuario", async () => {
    await setDeviceMode("personal")
    const client = newClient()
    await activatePersistUser(client, A)
    await fetchAndFlush(client, ["planeador", "x"], { ok: 1 }, offlineMeta)

    const fresh = new QueryClient()
    expect(await restoreUserQueries(fresh, A)).toBe(1)
    expect(fresh.getQueryData(["planeador", "x"])).toEqual({ ok: 1 })
  })

  it("descarta filas con otro SCHEMA_VERSION (buster)", async () => {
    await setDeviceMode("personal")
    const client = newClient()
    await activatePersistUser(client, A)
    await fetchAndFlush(client, ["planeador", "x"], { ok: 1 }, offlineMeta)
    const db = await getDb()
    const [row] = await rows(A)
    await db.put("queries", { ...row, buster: `${A}:0` })

    const fresh = new QueryClient()
    expect(await restoreUserQueries(fresh, A)).toBe(0)
    expect(fresh.getQueryData(["planeador", "x"])).toBeUndefined()
    expect(await rows(A)).toHaveLength(0)
  })

  it("descarta filas vencidas por TTL", async () => {
    await setDeviceMode("personal")
    const client = newClient()
    await activatePersistUser(client, A)
    await fetchAndFlush(client, ["planeador", "x"], { ok: 1 }, offlineMeta)
    const fresh = new QueryClient()
    expect(await restoreUserQueries(fresh, A, Date.now() + OFFLINE_TTL.roster + 1)).toBe(0)
  })
})

describe("aislamiento y limpieza por usuario", () => {
  it("otro usuario nunca lee filas ajenas y el cambio vacía la memoria", async () => {
    await setDeviceMode("personal")
    const client = newClient()
    await activatePersistUser(client, A)
    await fetchAndFlush(client, ["planeador", "x"], { de: "A" }, offlineMeta)

    client.setQueryData(["auth-user"], { id: B })
    await activatePersistUser(client, B, { keep: [["auth-user"]] })
    expect(client.getQueryData(["planeador", "x"])).toBeUndefined()
    expect(client.getQueryData(["auth-user"])).toEqual({ id: B })

    await fetchAndFlush(client, ["planeador", "x"], { de: "B" }, offlineMeta)
    const fresh = new QueryClient()
    await restoreUserQueries(fresh, B)
    expect(fresh.getQueryData(["planeador", "x"])).toEqual({ de: "B" })
    expect(await rows(A)).toHaveLength(1)
    expect(await rows(B)).toHaveLength(1)
  })

  it("clearUserData borra queries y session solo de ese sub", async () => {
    await setDeviceMode("personal")
    const client = newClient()
    await activatePersistUser(client, B)
    await fetchAndFlush(client, ["k"], 1, offlineMeta)
    await saveOnlineSession({ sub: B, name: "Beto", roles: [], isSuperAdmin: false })
    await activatePersistUser(client, A)
    await fetchAndFlush(client, ["k"], 2, offlineMeta)
    await saveOnlineSession({ sub: A, name: "Ana", roles: [], isSuperAdmin: false })

    await clearUserData(A)
    expect(await rows(A)).toHaveLength(0)
    expect(await rows(B)).toHaveLength(1)
    const db = await getDb()
    expect(await db.get("session", A)).toBeUndefined()
    expect(await db.get("session", B)).toBeDefined()
    expect(await getLastUserSub()).toBeUndefined()
  })
})

describe("sesión offline", () => {
  it("nunca guarda el token", async () => {
    await setDeviceMode("personal")
    await activatePersistUser(new QueryClient(), A)
    await saveOnlineSession({
      sub: A,
      name: "Ana",
      roles: ["CEVAL-DOCENTE"],
      isSuperAdmin: false,
      token: "secreto",
    } as never)
    const stored = await (await getDb()).get("session", A)
    expect(JSON.stringify(stored)).not.toContain("secreto")
  })

  it("se acepta hasta 14 días desde la última autenticación online", async () => {
    await setDeviceMode("personal")
    await activatePersistUser(new QueryClient(), A)
    const t0 = Date.now()
    await saveOnlineSession({ sub: A, name: "Ana", roles: [], isSuperAdmin: false }, t0)
    expect((await getUsableOfflineSession(t0 + OFFLINE_SESSION_MAX_AGE_MS))?.name).toBe("Ana")
    expect(await getUsableOfflineSession(t0 + OFFLINE_SESSION_MAX_AGE_MS + 1)).toBeNull()
  })

  it("siembra usuario y menú (≤ 30 días) al entrar sin conexión", async () => {
    await setDeviceMode("personal")
    await activatePersistUser(new QueryClient(), A)
    await saveOnlineSession({ sub: A, name: "Ana Pérez", roles: [], isSuperAdmin: false })
    const db = await getDb()
    const session = await db.get("session", A)
    await db.put("session", {
      ...session!,
      menuSnapshot: [{ title: "Planeador", url: "/app/planeador", icon: null }],
      permisos: [],
      menuSavedAt: Date.now(),
    })
    // Recarga: el módulo arranca de cero y lee el modo desde IndexedDB.
    __resetPersisterForTests()
    await setMeta("deviceMode", "personal")

    const client = new QueryClient()
    const user = await enterOfflineSession(client)
    expect(user).toMatchObject({ id: A, name: "Ana Pérez", offline: true })
    expect(client.getQueryData(["navigation", "menu"])).toHaveLength(1)
  })

  it("en equipo compartido no hay sesión offline", async () => {
    await setDeviceMode("personal")
    await activatePersistUser(new QueryClient(), A)
    await saveOnlineSession({ sub: A, name: "Ana", roles: [], isSuperAdmin: false })
    await setDeviceMode("compartido")
    expect(await getUsableOfflineSession()).toBeNull()
  })
})
