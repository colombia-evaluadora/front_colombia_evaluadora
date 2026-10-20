import { delay, http, HttpResponse } from "msw"

import type { NotificacionesPageRow, PreferenciasPayload } from "@/features/notificaciones/api/types"
import { horarioSilenciosoDb, notificacionesDb, preferenciasTiposDb } from "@/mocks/db/notificaciones"
import { usuarioDe } from "@/mocks/handlers/comunicaciones-elecciones"

/**
 * Mock del centro de notificaciones (`notification-service`, sin backend
 * todavía). Rutas sin `/eval-col`: ver `NOTIFICACIONES_API_PREFIX`. Las
 * estáticas (`contador`, `leer-todas`, `preferencias`) van antes que `:id`.
 */
const RUTA = (path = "") => `*/api/notificaciones${path}`

// Las filas con `usuario` (avisos del chat multiusuario, `comunicaciones-grupos`) solo las ve esa
// persona; las demás son del fixture y las ve cualquiera.
const visibles = (request?: Request) => {
  const email = request ? usuarioDe(request)?.email : undefined
  return notificacionesDb.filter((n) => !n.archivada && (!n.usuario || n.usuario === email))
}

function buscar(id: unknown) {
  return notificacionesDb.find((n) => n.id === id && !n.archivada)
}

const noEncontrada = () => HttpResponse.json({ message: "La notificación no existe." }, { status: 404 })

export const notificacionesHandlers = [
  http.get(RUTA("/contador"), async ({ request }) => {
    await delay(150)
    return HttpResponse.json({ no_leidas: visibles(request).filter((n) => !n.leida_en).length })
  }),

  http.post(RUTA("/leer-todas"), async ({ request }) => {
    await delay(250)
    const body = (await request.json().catch(() => ({}))) as { categoria?: string }
    const ahora = new Date().toISOString()
    for (const n of visibles()) {
      if (!n.leida_en && (!body?.categoria || n.categoria === body.categoria)) n.leida_en = ahora
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(RUTA("/preferencias"), async () => {
    await delay(250)
    return HttpResponse.json({ tipos: preferenciasTiposDb, horario_silencioso: horarioSilenciosoDb })
  }),

  http.put(RUTA("/preferencias"), async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as PreferenciasPayload
    for (const cambio of body?.tipos ?? []) {
      const tipo = preferenciasTiposDb.find((t) => t.tipo === cambio.tipo)
      if (!tipo) return HttpResponse.json({ message: `Tipo de notificación desconocido: ${cambio.tipo}` }, { status: 400 })
      // Piso institucional: el servidor rechaza cambiar una celda bloqueada.
      if ((tipo.push_bloqueado && cambio.push !== tipo.push) || (tipo.email_bloqueado && cambio.email !== tipo.email)) {
        return HttpResponse.json({ message: "Ese canal lo define tu institución." }, { status: 409 })
      }
      tipo.push = cambio.push
      tipo.email = cambio.email
    }
    const h = body?.horario_silencioso
    if (h) {
      if (horarioSilenciosoDb.bloqueado) {
        return HttpResponse.json({ message: "El horario silencioso lo define tu institución." }, { status: 409 })
      }
      Object.assign(horarioSilenciosoDb, { activo: h.activo, desde: h.desde, hasta: h.hasta, dias: h.dias })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // Paginación por cursor `<creada_en>,<id>` (D-2.3).
  http.get(RUTA(), async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const categoria = url.searchParams.get("categoria")
    const estado = url.searchParams.get("estado")
    const texto = url.searchParams.get("texto")?.toLowerCase().trim()
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 30, 1), 100)
    const cursor = url.searchParams.get("cursor")

    let rows = visibles(request)
    if (categoria) rows = rows.filter((n) => n.categoria === categoria)
    if (estado === "no-leidas") rows = rows.filter((n) => !n.leida_en)
    if (estado === "leidas") rows = rows.filter((n) => n.leida_en)
    if (texto) {
      rows = rows.filter((n) => `${n.titulo} ${n.cuerpo_corto ?? ""}`.toLowerCase().includes(texto))
    }
    if (cursor) {
      const [creada, id] = cursor.split(",")
      const idx = rows.findIndex((n) => n.creada_en === creada && n.id === id)
      rows = idx >= 0 ? rows.slice(idx + 1) : rows.filter((n) => n.creada_en < creada)
    }
    const page = rows.slice(0, limit)
    const last = page.at(-1)
    const body: NotificacionesPageRow = {
      items: page.map(({ archivada: _archivada, ...row }) => row),
      next_cursor: rows.length > limit && last ? `${last.creada_en},${last.id}` : null,
    }
    return HttpResponse.json(body)
  }),

  http.patch(RUTA("/:id/leida"), async ({ params, request }) => {
    await delay(150)
    const n = buscar(params.id)
    if (!n) return noEncontrada()
    const body = (await request.json().catch(() => ({}))) as { leida?: boolean }
    const leida = body?.leida !== false
    n.leida_en = leida ? (n.leida_en ?? new Date().toISOString()) : null
    return new HttpResponse(null, { status: 204 })
  }),

  http.patch(RUTA("/:id/archivar"), async ({ params }) => {
    await delay(200)
    const n = buscar(params.id)
    if (!n) return noEncontrada()
    n.archivada = true
    return new HttpResponse(null, { status: 204 })
  }),
]
