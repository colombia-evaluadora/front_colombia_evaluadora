/**
 * Sesión "autenticada sin conexión" (D7, §0.2 de `docs/offline/PLAN-offline.md`).
 *
 * Se guarda por `sub` una fila con claims NO sensibles y el snapshot del menú
 * y los permisos. NUNCA el access token ni la cookie: sin red se entra en modo
 * lectura sin token y, al volver la red, se reautentica con el refresh normal.
 *
 * Límites:
 * - 14 días desde `lastOnlineAuthAt` (decisión §0.2) para aceptar la sesión
 *   offline.
 * - 30 días para usar el snapshot de menú y permisos.
 * - En modo "equipo compartido" no se guarda ni se lee nada.
 */
import type { QueryClient } from "@tanstack/react-query"

import { getDb, isIndexedDbAvailable, type PersistedSession } from "@/lib/offline/db"
import { getDeviceMode, getLastUserSub } from "@/lib/offline/query-persister"

const DAY_MS = 864e5
export const OFFLINE_SESSION_MAX_AGE_MS = 14 * DAY_MS
export const MENU_SNAPSHOT_TTL_MS = 30 * DAY_MS

// Claves de las queries de navegación (features/navigation). Se repiten acá
// para que `lib/offline` no dependa de features (task 7.1).
export const MENU_QUERY_KEY = ["navigation", "menu"] as const
export const PERMISOS_QUERY_KEY = ["navigation", "permisos-menu"] as const

export interface SessionClaims {
  sub: string
  name: string
  roles: string[]
  isSuperAdmin: boolean
}

function enabled() {
  return isIndexedDbAvailable() && getDeviceMode() === "personal"
}

export async function getPersistedSession(sub: string): Promise<PersistedSession | undefined> {
  if (!enabled()) return undefined
  return (await getDb()).get("session", sub)
}

/** Refresh/login correcto: actualiza claims y `lastOnlineAuthAt`. */
export async function saveOnlineSession(claims: SessionClaims, now = Date.now()): Promise<void> {
  if (!enabled()) return
  const db = await getDb()
  const previous = await db.get("session", claims.sub)
  // Campo por campo, nunca `...claims`: si alguien pasa el usuario o la
  // respuesta de login completa, el token no debe colarse.
  await db.put("session", {
    menuSnapshot: previous?.menuSnapshot ?? null,
    permisos: previous?.permisos ?? null,
    menuSavedAt: previous?.menuSavedAt ?? null,
    sub: claims.sub,
    name: claims.name,
    roles: [...claims.roles],
    isSuperAdmin: claims.isSuperAdmin,
    savedAt: now,
    lastOnlineAuthAt: now,
  })
}

async function patchSession(sub: string, patch: Partial<PersistedSession>) {
  if (!enabled()) return
  const db = await getDb()
  const previous = await db.get("session", sub)
  if (!previous) return
  await db.put("session", { ...previous, ...patch, sub })
}

/**
 * Sesión del último usuario del equipo si todavía se puede usar sin red
 * (equipo personal y ≤ 14 días desde la última autenticación online).
 */
export async function getUsableOfflineSession(now = Date.now()): Promise<PersistedSession | null> {
  if (!enabled()) return null
  try {
    const sub = await getLastUserSub()
    if (!sub) return null
    const session = await getPersistedSession(sub)
    if (!session) return null
    if (now - session.lastOnlineAuthAt > OFFLINE_SESSION_MAX_AGE_MS) return null
    return session
  } catch {
    return null
  }
}

/** Siembra menú y permisos desde el snapshot si tiene ≤ 30 días. */
export function seedNavigationFromSession(
  queryClient: QueryClient,
  session: PersistedSession,
  now = Date.now(),
): boolean {
  const savedAt = session.menuSavedAt
  if (savedAt == null || now - savedAt > MENU_SNAPSHOT_TTL_MS) return false
  if (session.menuSnapshot != null && !queryClient.getQueryData(MENU_QUERY_KEY)) {
    queryClient.setQueryData(MENU_QUERY_KEY, session.menuSnapshot, { updatedAt: savedAt })
  }
  if (session.permisos != null && !queryClient.getQueryData(PERMISOS_QUERY_KEY)) {
    queryClient.setQueryData(PERMISOS_QUERY_KEY, session.permisos, { updatedAt: savedAt })
  }
  return true
}

const sameKey = (a: readonly unknown[], b: readonly unknown[]) =>
  JSON.stringify(a) === JSON.stringify(b)

/**
 * Mantiene el snapshot de menú y permisos de `getSub()` al día cada vez que
 * esas queries cargan bien desde el servidor.
 */
export function startSessionSnapshotSync(
  queryClient: QueryClient,
  getSub: () => string | null,
): () => void {
  return queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success") return
    // `setQueryData` también dispara `success` con `manual: true`: el seed
    // desde la sesión no debe reescribir `menuSavedAt`.
    if ((event.action as { manual?: boolean }).manual) return
    const sub = getSub()
    if (!sub) return
    const { queryKey, state } = event.query
    if (sameKey(queryKey, MENU_QUERY_KEY)) {
      void patchSession(sub, { menuSnapshot: state.data, menuSavedAt: state.dataUpdatedAt })
    } else if (sameKey(queryKey, PERMISOS_QUERY_KEY)) {
      void patchSession(sub, { permisos: state.data, menuSavedAt: state.dataUpdatedAt })
    }
  })
}
