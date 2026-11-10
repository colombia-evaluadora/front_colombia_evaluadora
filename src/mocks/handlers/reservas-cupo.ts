import { http, HttpResponse, delay } from "msw"

import {
  GRADOS,
  JORNADAS,
  PERIODOS_INSCRIPCIONES,
  SEDES,
  pendientesReservarDb,
  reservasCupoDb,
} from "@/mocks/db/reservas-cupo"
import type {
  ReservaCupo,
  ReservarCuposInput,
  ReservarCuposResumen,
  ReservasCupoFilters,
  ReservasCupoQueryRequest,
  ReservasCupoQueryResponse,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

const esReservada = (r: ReservaCupo) => r.estado === "RESERVADA" && !r.trasladoEntrante
const porConfirmar = (r: ReservaCupo) => esReservada(r) && !r.confirmadaPorAcudiente
const porResponder = (r: ReservaCupo) => r.trasladoEntrante && r.estadoTraslado === "PENDIENTE"

function filtrar(rows: ReservaCupo[], f: ReservasCupoFilters) {
  const q = f.q?.trim().toLowerCase()
  return rows.filter((r) => {
    if (q && !r.estudiante.toLowerCase().includes(q) && !r.documento.includes(q)) return false
    if (f.sede && r.sede !== f.sede) return false
    if (f.jornada && r.jornada !== f.jornada) return false
    if (f.grado && r.grado !== f.grado) return false
    if (f.estado && r.estado !== f.estado) return false
    if (f.estadoTraslado && r.estadoTraslado !== f.estadoTraslado) return false
    return true
  })
}

function filtroRapido(rows: ReservaCupo[], rapido: ReservasCupoFilters["rapido"]) {
  switch (rapido) {
    case "RESERVADAS":
      return rows.filter(esReservada)
    case "SIN_CONTINUIDAD":
      return rows.filter((r) => r.estado === "SIN_CONTINUIDAD")
    case "POR_CONFIRMAR":
      return rows.filter(porConfirmar)
    case "TRASLADOS_POR_RESPONDER":
      return rows.filter(porResponder)
    default:
      return rows
  }
}

export const reservasCupoHandlers = [
  http.post("*/coverage/reservas-cupo/query", async ({ request }) => {
    await delay(250)
    const body = (await request.json()) as ReservasCupoQueryRequest
    const base = filtrar(reservasCupoDb, body.filters ?? {})
    let rows = filtroRapido(base, body.filters?.rapido)
    const sort = body.sorting?.[0]
    if (sort) {
      const key = sort.id as keyof ReservaCupo
      rows = [...rows].sort((a, b) => String(a[key]).localeCompare(String(b[key]), "es", { numeric: true }) * (sort.desc ? -1 : 1))
    }
    const start = body.pageIndex * body.pageSize
    const res: ReservasCupoQueryResponse = {
      rows: rows.slice(start, start + body.pageSize),
      totalCount: rows.length,
      pageCount: Math.max(1, Math.ceil(rows.length / body.pageSize)),
      contadores: {
        todas: base.length,
        reservadas: base.filter(esReservada).length,
        sinContinuidad: base.filter((r) => r.estado === "SIN_CONTINUIDAD").length,
        porConfirmar: base.filter(porConfirmar).length,
        trasladosPorResponder: base.filter(porResponder).length,
      },
    }
    return HttpResponse.json(res)
  }),

  http.get("*/coverage/reservas-cupo/periodos-inscripciones", async () => {
    await delay(150)
    return HttpResponse.json(PERIODOS_INSCRIPCIONES)
  }),

  http.get("*/coverage/reservas-cupo/catalogos", async () => {
    await delay(100)
    return HttpResponse.json({ sedes: SEDES, jornadas: JORNADAS, grados: GRADOS })
  }),

  // Regla 35: crea las que faltan y se puede ejecutar varias veces.
  http.post("*/coverage/reservas-cupo/reservar-cupos", async ({ request }) => {
    await delay(700)
    const { periodoIds } = (await request.json()) as ReservarCuposInput
    let creadas = 0
    let sinContinuidad = 0
    for (const id of periodoIds) {
      const periodo = PERIODOS_INSCRIPCIONES.find((p) => p.id === id)
      if (!periodo) continue
      const n = pendientesReservarDb.porPeriodo[id] ?? 0
      for (let i = 0; i < n; i++) {
        const sin = i % 29 === 0
        if (sin) sinContinuidad++
        else creadas++
        reservasCupoDb.push({
          id: String(reservasCupoDb.length + 1),
          estudiante: `Estudiante ${id}-${i + 1}`,
          documento: String(1_100_000_000 + Number(id) * 1000 + i),
          establecimientoOrigen: null,
          grado: GRADOS[1 + (i % 11)],
          sede: periodo.sede,
          jornada: periodo.jornada,
          periodo: `${periodo.anio} · ${periodo.modalidad} · Ciclo ${periodo.ciclo}`,
          estado: sin ? "SIN_CONTINUIDAD" : "RESERVADA",
          origen: "RESERVAR_CUPOS",
          confirmadaPorAcudiente: false,
          estadoTraslado: null,
          destinoTraslado: null,
          trasladoEntrante: false,
          motivoLiberacion: null,
        })
      }
      pendientesReservarDb.porPeriodo[id] = 0
    }
    const conReserva = reservasCupoDb.filter((r) => r.estado === "RESERVADA").length > 0 ? 8 : 0
    const resumen: ReservarCuposResumen = {
      creadas,
      sinContinuidad,
      omitidos: {
        conReserva,
        sinGradoSiguiente: 3,
        sinPeriodoContinuidad: 1,
        noRenovacion: 0,
        total: conReserva + 4,
      },
    }
    return HttpResponse.json(resumen)
  }),
]
