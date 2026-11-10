import { http, HttpResponse, delay } from "msw"

import { JORNADAS, SEDES, reservasCupoDb } from "@/mocks/db/reservas-cupo"
import type {
  AsignarGrupoInput,
  AsignarGrupoLoteInput,
  CambiarJornadaSedeInput,
  CambioReserva,
  CatalogosAcciones,
  GrupoConCupo,
  LiberarReservaInput,
  OpcionCupo,
  RegistrarRetiroInput,
  ReservaCupo,
  ReservaCupoDetalle,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

// Detalle y acciones sobre una reserva. Se registra después de
// `reservasCupoHandlers`: MSW usa el primer match y `/:id` se tragaría
// `catalogos` o `periodos-inscripciones`.

const MOTIVOS_LIBERACION_MANUAL = ["La familia desiste", "Matriculado en otro establecimiento", "Error de registro"]

const ESTADO_LABEL: Record<ReservaCupo["estado"], string> = {
  RESERVADA: "Reservada",
  SIN_CONTINUIDAD: "Sin continuidad",
  LIBERADA: "Liberada",
  MATRICULADA: "Matriculada",
}

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

function registrar(r: ReservaCupo, cambio: string, valorAnterior: string | null, valorNuevo: string | null) {
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

const noEncontrada = () => HttpResponse.json({ message: "No se encontró la reserva." }, { status: 404 })

function liberar(r: ReservaCupo, motivo: string) {
  r.estado = "LIBERADA"
  r.motivoLiberacion = motivo
  // Regla: liberar el origen cancela el traslado pendiente (Sección 3.2.1).
  if (r.estadoTraslado === "PENDIENTE") r.estadoTraslado = "CANCELADO"
  r.destinoTraslado = null
}

export const reservaCupoAccionesHandlers = [
  http.get("*/coverage/reservas-cupo/catalogos-acciones", async () => {
    await delay(100)
    const res: CatalogosAcciones = {
      establecimientosDestino: [
        "IE San José",
        "IE La Esperanza",
        "Colegio Santa María",
        "Otro (fuera de la plataforma)",
      ],
      motivosTraslado: ["Cambio de residencia", "Cercanía a la vivienda", "Reunificación con hermanos", "Otro"],
      motivosLiberacion: MOTIVOS_LIBERACION_MANUAL,
      motivosRetiro: ["Cambio de ciudad", "Situación económica", "Decisión familiar", "Otro"],
      especialidades: ["Académica", "Técnica en sistemas", "Técnica agropecuaria"],
      jornadasSedesDestino: ["Mañana · Sede Principal", "Tarde · Sede Principal", "Mañana · Sede Rural"],
    }
    return HttpResponse.json(res)
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
      return HttpResponse.json({ message: "Solo se asigna grupo a reservas Reservadas." }, { status: 409 })
    }
    for (const r of reservas) {
      registrar(r, `Asignar grupo por lote (Grupo ${grupoId})`, "Reservada", "Matriculada")
      r.estado = "MATRICULADA"
    }
    return HttpResponse.json({ matriculadas: reservas.length })
  }),

  http.get("*/coverage/reservas-cupo/:id/opciones-cupo", async ({ params }) => {
    await delay(150)
    const r = buscar(params.id)
    if (!r) return noEncontrada()
    const opciones: OpcionCupo[] = SEDES.flatMap((sede) =>
      JORNADAS.slice(0, 2).map((jornada) => ({ sede, jornada })),
    ).filter((o) => o.sede !== r.sede || o.jornada !== r.jornada)
    return HttpResponse.json(opciones)
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
      return HttpResponse.json({ message: "Solo se asigna grupo a una reserva Reservada." }, { status: 409 })
    }
    const body = (await request.json()) as AsignarGrupoInput
    registrar(r, `Asignar grupo (Grupo ${body.grupoId})`, "Reservada", "Matriculada")
    r.estado = "MATRICULADA"
    return HttpResponse.json(null)
  }),

  http.post("*/coverage/reservas-cupo/:id/cambiar-jornada-sede", async ({ params, request }) => {
    await delay(400)
    const r = buscar(params.id)
    if (!r) return noEncontrada()
    const body = (await request.json()) as CambiarJornadaSedeInput
    registrar(r, "Cambiar jornada o sede", `${r.jornada} · ${r.sede}`, `${body.jornada} · ${body.sede}`)
    r.jornada = body.jornada
    r.sede = body.sede
    return HttpResponse.json(null)
  }),

  http.post("*/coverage/reservas-cupo/:id/solicitar-traslado", async ({ params, request }) => {
    await delay(500)
    const r = buscar(params.id)
    if (!r) return noEncontrada()
    if (r.estadoTraslado === "PENDIENTE") {
      return HttpResponse.json({ message: "La reserva ya tiene un traslado Pendiente." }, { status: 409 })
    }
    const body = await request.formData()
    const destino = String(body.get("establecimientoDestino") ?? "")
    registrar(r, "Solicitar traslado", null, `Pendiente hacia ${destino}`)
    r.estadoTraslado = "PENDIENTE"
    r.destinoTraslado = destino
    return HttpResponse.json(null)
  }),

  http.post("*/coverage/reservas-cupo/:id/liberar", async ({ params, request }) => {
    await delay(400)
    const r = buscar(params.id)
    if (!r) return noEncontrada()
    const { motivo } = (await request.json()) as LiberarReservaInput
    if (!MOTIVOS_LIBERACION_MANUAL.includes(motivo)) {
      return HttpResponse.json({ message: "El motivo de liberación no es válido." }, { status: 400 })
    }
    registrar(r, `Liberar manualmente (${motivo})`, ESTADO_LABEL[r.estado], "Liberada")
    liberar(r, motivo)
    return HttpResponse.json(null)
  }),

  http.post("*/coverage/reservas-cupo/:id/registrar-retiro", async ({ params, request }) => {
    await delay(400)
    const r = buscar(params.id)
    if (!r) return noEncontrada()
    const { motivo } = (await request.json()) as RegistrarRetiroInput
    registrar(r, `Registrar retiro (${motivo})`, ESTADO_LABEL[r.estado], "Liberada")
    liberar(r, "Retiro del estudiante")
    return HttpResponse.json(null)
  }),
]
