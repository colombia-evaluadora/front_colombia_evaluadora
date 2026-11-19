import { http, HttpResponse, delay } from "msw"

import { reservasCupoDb } from "@/mocks/db/reservas-cupo"
import type {
  AsignarGrupoInput,
  AsignarGrupoLoteInput,
  CambioReserva,
  GrupoConCupo,
  ReservaCupo,
  ReservaCupoDetalle,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

// Ver detalle y Asignar grupo de una reserva: siguen con MSW hasta conectarlos
// al back real (el listado y las demás acciones ya van contra V510). Las rutas
// estáticas van antes que `/:id` (MSW usa el primer match).

const ORIGEN_LABEL: Record<ReservaCupo["origen"], string> = {
  PREMATRICULA: "Prematrícula",
  RESERVAR_CUPOS: "Reservar cupos",
  TRASLADO: "Traslado",
  REDISTRIBUCION: "Redistribución",
  INSCRIPCION: "Inscripción",
}

const historialDb = new Map<string, CambioReserva[]>()

function historialDe(r: ReservaCupo): CambioReserva[] {
  let lista = historialDb.get(r.id)
  if (!lista) {
    lista = [
      {
        id: `${r.id}-1`,
        fecha: "2026-09-15T08:12:00",
        usuario: "Sistema",
        cambio: "Creación de la reserva (Reservar cupos de oficio)",
        valorAnterior: null,
        valorNuevo: "Reservada",
      },
    ]
    historialDb.set(r.id, lista)
  }
  return lista
}

function registrar(
  r: ReservaCupo,
  cambio: string,
  valorAnterior: string | null,
  valorNuevo: string | null,
) {
  const lista = historialDe(r)
  lista.unshift({
    id: `${r.id}-${lista.length + 1}`,
    fecha: new Date().toISOString(),
    usuario: "admin@example.com",
    cambio,
    valorAnterior,
    valorNuevo,
  })
}

function toDetalle(r: ReservaCupo): ReservaCupoDetalle {
  const gradoActual = Math.max(0, (Number.parseInt(r.grado) || 1) - 1)
  return {
    ...r,
    tipoDocumento: "TI",
    matriculaOrigen: `2026 · ${gradoActual}° · Grupo ${gradoActual}01`,
    decisionPrematricula: r.estadoTraslado ? "Solicita traslado" : "Continúa",
    periodoAcademico: `2027 · ${r.jornada} · Anual`,
    tipoCupo: "OFICIAL",
    fechaReserva: "2026-09-15",
    asignadaPor: r.origen === "RESERVAR_CUPOS" ? "Sistema" : ORIGEN_LABEL[r.origen],
    traslado: r.estadoTraslado
      ? {
          establecimientoDestino: r.destinoTraslado ?? r.establecimientoOrigen ?? "IE La Esperanza",
          motivo: "Cambio de residencia",
          jornadaSedePreferida: "Mañana · Sede Principal",
          hermanoVerificado: false,
          compartirSoportes: true,
          observacion: null,
          estado: r.estadoTraslado,
          respondidoPor: null,
          fechaRespuesta: null,
          motivoRechazo: null,
        }
      : null,
    historial: historialDe(r),
  }
}

const buscar = (id: unknown) => reservasCupoDb.find((r) => r.id === id)

const noEncontrada = () =>
  HttpResponse.json({ message: "No se encontró la reserva." }, { status: 404 })

export const reservaCupoAccionesHandlers = [
  // Lo demás de los catálogos de acciones ya sale de /reservas-cupo/establecimiento/:ID/catalogos.
  http.get("*/coverage/reservas-cupo/catalogos-acciones", async () => {
    await delay(100)
    return HttpResponse.json({
      especialidades: ["Académica", "Técnica en sistemas", "Técnica agropecuaria"],
    })
  }),

  // Lote: grupos con cupo para todas las reservas marcadas (mismo grado).
  http.post("*/coverage/reservas-cupo/grupos-lote", async ({ request }) => {
    await delay(150)
    const { ids } = (await request.json()) as { ids: string[] }
    const reservas = ids.map(buscar).filter((r) => r != null)
    if (!reservas.length) return HttpResponse.json([])
    const n = Number.parseInt(reservas[0].grado) || 0
    const grupos: GrupoConCupo[] = [1, 2, 3]
      .map((i) => ({ id: `${n}0${i}`, codigo: `${n}0${i}`, cuposDisponibles: 12 - i * 3 }))
      .filter((g) => g.cuposDisponibles >= reservas.length)
    return HttpResponse.json(grupos)
  }),

  http.post("*/coverage/reservas-cupo/asignar-grupo-lote", async ({ request }) => {
    await delay(600)
    const { ids, grupoId } = (await request.json()) as AsignarGrupoLoteInput
    const reservas = ids.map(buscar).filter((r) => r != null)
    if (reservas.some((r) => r.estado !== "RESERVADA")) {
      return HttpResponse.json(
        { message: "Solo se asigna grupo a reservas Reservadas." },
        { status: 409 },
      )
    }
    for (const r of reservas) {
      registrar(r, `Asignar grupo por lote (Grupo ${grupoId})`, "Reservada", "Matriculada")
      r.estado = "MATRICULADA"
    }
    return HttpResponse.json({ matriculadas: reservas.length })
  }),

  http.get("*/coverage/reservas-cupo/:id/grupos", async ({ params }) => {
    await delay(150)
    const r = buscar(params.id)
    if (!r) return noEncontrada()
    const n = Number.parseInt(r.grado) || 0
    const grupos: GrupoConCupo[] = [1, 2, 3].map((i) => ({
      id: `${n}0${i}`,
      codigo: `${n}0${i}`,
      cuposDisponibles: 8 - i * 2,
    }))
    return HttpResponse.json(grupos)
  }),

  http.get("*/coverage/reservas-cupo/:id", async ({ params }) => {
    await delay(200)
    const r = buscar(params.id)
    return r ? HttpResponse.json(toDetalle(r)) : noEncontrada()
  }),

  http.post("*/coverage/reservas-cupo/:id/asignar-grupo", async ({ params, request }) => {
    await delay(500)
    const r = buscar(params.id)
    if (!r) return noEncontrada()
    if (r.estado !== "RESERVADA") {
      return HttpResponse.json(
        { message: "Solo se asigna grupo a una reserva Reservada." },
        { status: 409 },
      )
    }
    const body = (await request.json()) as AsignarGrupoInput
    registrar(r, `Asignar grupo (Grupo ${body.grupoId})`, "Reservada", "Matriculada")
    r.estado = "MATRICULADA"
    return HttpResponse.json(null)
  }),
]
