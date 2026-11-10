import { http, HttpResponse, delay } from "msw"

import type {
  CatalogosInscripcion,
  GrupoAdmisionRow,
} from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import type { PeriodoInscripcionRow } from "@/features/coverage/inscripcion-reservas/api/query/use-configuracion-query"

// Configuración con la forma de sso V426: ids numéricos, cuerpos en MAYÚSCULAS y `{ rows: [{ datos }] }`.
const BASE = "*/api/eval-col/cobertura-academica/inscripciones/configuracion"

export const catalogosInscripcionDb: CatalogosInscripcion = {
  criterios: [
    { id: 1, nombre: "Hermano verificado" },
    { id: 2, nombre: "Víctima del conflicto armado" },
    { id: 3, nombre: "Discapacidad" },
    { id: 4, nombre: "Cercanía a la vivienda" },
    { id: 5, nombre: "Hijo de docente" },
  ],
  documentos: [
    { id: 11, nombre: "Documento de identidad del estudiante" },
    { id: 12, nombre: "Certificado de estudios del año anterior" },
    { id: 13, nombre: "Certificado médico del estudiante" },
  ],
  // Mismos textos que las Listas de Valores sembradas en el back.
  motivosNoAdmision: [
    { id: 21, nombre: "Documentación incompleta" },
    { id: 22, nombre: "No cumple la edad para el grado" },
    { id: 23, nombre: "No se presentó" },
    { id: 24, nombre: "Otro" },
  ],
  motivosAnulacion: [
    { id: 31, nombre: "La familia desiste" },
    { id: 32, nombre: "Inscripción duplicada" },
    { id: 33, nombre: "Error en el registro" },
  ],
}

export const gruposDb: GrupoAdmisionRow[] = [
  {
    id: 1,
    anio: "2027",
    modalidad: "Anual",
    ciclo: 1,
    fechaCierre: "2026-10-30",
    menorFechaLimiteMatricula: "2027-01-31",
    modoAdmision: "MANUAL",
    desempate: "SORTEO",
    sorteoEjecutado: true,
    bloqueado: true,
    configurado: true,
    criterios: [1, 2],
    documentosRequeridos: [11],
    periodos: [
      { id: 101, nombre: "Principal · Mañana" },
      { id: 102, nombre: "Principal · Tarde" },
      { id: 103, nombre: "Sede Norte · Mañana" },
    ],
  },
  {
    id: 2,
    anio: "2027",
    modalidad: "Semestral",
    ciclo: 1,
    fechaCierre: null,
    menorFechaLimiteMatricula: "2027-07-31",
    modoAdmision: "MANUAL",
    desempate: "SORTEO",
    sorteoEjecutado: false,
    bloqueado: false,
    configurado: false,
    criterios: [],
    documentosRequeridos: [],
    periodos: [{ id: 104, nombre: "Principal · Nocturna" }],
  },
]

export const nombreGrupoMock = (g: GrupoAdmisionRow) => `${g.anio} · ${g.modalidad} · Ciclo ${g.ciclo}`

function periodo(id: number, sede: string, jornada: string, g: GrupoAdmisionRow, extra: Partial<PeriodoInscripcionRow>) {
  return {
    id,
    establecimiento: "IE Central",
    sede,
    anio: g.anio,
    jornada,
    modalidad: g.modalidad,
    ciclo: g.ciclo,
    grupoAdmisionId: g.id,
    grupoAdmision: nombreGrupoMock(g),
    fechaLiberacionReservas: null,
    modoTraslado: "MANUAL",
    plazoRespuestaTraslado: 15,
    requiereConfirmacionAcudiente: true,
    fechaCierreInscripcion: g.fechaCierre,
    fechaLimiteMatricula: g.menorFechaLimiteMatricula,
    ...extra,
  } satisfies PeriodoInscripcionRow
}

const periodosDb: PeriodoInscripcionRow[] = [
  periodo(101, "Principal", "Mañana", gruposDb[0], { fechaLiberacionReservas: "2027-01-15" }),
  periodo(102, "Principal", "Tarde", gruposDb[0], {
    fechaLiberacionReservas: "2027-01-15",
    modoTraslado: "AUTOMATICA",
    plazoRespuestaTraslado: 10,
  }),
  periodo(103, "Sede Norte", "Mañana", gruposDb[0], { requiereConfirmacionAcudiente: false }),
  periodo(104, "Principal", "Nocturna", gruposDb[1], {}),
]

const conDatos = (datos: unknown) => HttpResponse.json({ rows: [{ datos }] })
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })
const noEncontrado = (que: string) => error(404, `No se encontró ${que}.`)
const nombrePeriodo = (p: PeriodoInscripcionRow) => `${p.establecimiento} · ${p.anio} · ${p.jornada} · ${p.modalidad}`

export const inscripcionesConfiguracionHandlers = [
  http.get(`${BASE}/catalogos/:ee`, async () => {
    await delay(100)
    return conDatos(catalogosInscripcionDb)
  }),
  http.get(`${BASE}/establecimiento/:ee/grupos`, async () => {
    await delay(200)
    return conDatos(gruposDb)
  }),
  http.get(`${BASE}/grupos/:id`, async ({ params }) => {
    await delay(150)
    const g = gruposDb.find((x) => x.id === Number(params.id))
    return g ? conDatos(g) : noEncontrado("el grupo de admisión")
  }),
  http.put(`${BASE}/grupos/:id`, async ({ params, request }) => {
    await delay(400)
    const g = gruposDb.find((x) => x.id === Number(params.id))
    if (!g) return noEncontrado("el grupo de admisión")
    const b = (await request.json()) as {
      FECHA_CIERRE: string | null
      MODO_ADMISION: GrupoAdmisionRow["modoAdmision"]
      CRITERIOS: number[]
      DESEMPATE: GrupoAdmisionRow["desempate"]
      DOCUMENTOS: number[]
    }
    if (b.FECHA_CIERRE && b.FECHA_CIERRE > g.menorFechaLimiteMatricula) {
      return error(400, "La Fecha de cierre de inscripción no puede ser posterior a la Fecha límite de matrícula más temprana.")
    }
    if (g.bloqueado && (b.DESEMPATE !== g.desempate || b.CRITERIOS.join() !== g.criterios.join())) {
      return error(409, "Después del sorteo o de la primera admisión ya no se cambian los criterios ni el desempate.")
    }
    Object.assign(g, {
      fechaCierre: b.FECHA_CIERRE,
      modoAdmision: b.MODO_ADMISION,
      criterios: b.CRITERIOS,
      desempate: b.DESEMPATE,
      documentosRequeridos: b.DOCUMENTOS,
      configurado: Boolean(b.FECHA_CIERRE),
    })
    for (const p of periodosDb) if (p.grupoAdmisionId === g.id) p.fechaCierreInscripcion = g.fechaCierre
    return conDatos(g.id)
  }),
  http.post(`${BASE}/grupos/:id/sorteo`, async ({ params }) => {
    await delay(700)
    const g = gruposDb.find((x) => x.id === Number(params.id))
    if (!g) return noEncontrado("el grupo de admisión")
    if (g.sorteoEjecutado) return error(400, "El sorteo de este grupo de admisión ya se ejecutó.")
    Object.assign(g, { sorteoEjecutado: true, bloqueado: true })
    return conDatos(g.id)
  }),
  http.get(`${BASE}/establecimiento/:ee/periodos`, async () => {
    await delay(200)
    return conDatos(periodosDb)
  }),
  http.post(`${BASE}/periodos/:id/copiar`, async ({ params, request }) => {
    await delay(400)
    const origen = periodosDb.find((x) => x.id === Number(params.id))
    if (!origen) return noEncontrado("el período")
    const { DESTINOS } = (await request.json()) as { DESTINOS: number[] }
    if (!DESTINOS?.length) return error(400, "Elija al menos un período.")
    // En cada destino se revisan las fechas; si no se cumplen, ese destino no se copia (Sección 3.8).
    const copiados: { id: number; periodo: string }[] = []
    const noCopiados: { id: number; periodo: string; motivo: string }[] = []
    const f = origen.fechaLiberacionReservas
    for (const p of periodosDb) {
      if (!DESTINOS.includes(p.id) || p.id === origen.id) continue
      if (f && p.fechaCierreInscripcion && f < p.fechaCierreInscripcion) {
        noCopiados.push({ id: p.id, periodo: nombrePeriodo(p), motivo: "la Fecha de liberación de reservas es anterior a su Fecha de cierre de inscripción" })
        continue
      }
      if (f && f > p.fechaLimiteMatricula) {
        noCopiados.push({ id: p.id, periodo: nombrePeriodo(p), motivo: "la Fecha de liberación de reservas es posterior a su Fecha límite de matrícula" })
        continue
      }
      Object.assign(p, {
        fechaLiberacionReservas: f,
        modoTraslado: origen.modoTraslado,
        plazoRespuestaTraslado: origen.plazoRespuestaTraslado,
        requiereConfirmacionAcudiente: origen.requiereConfirmacionAcudiente,
      })
      copiados.push({ id: p.id, periodo: nombrePeriodo(p) })
    }
    return conDatos({ copiados, noCopiados })
  }),
  http.get(`${BASE}/periodos/:id`, async ({ params }) => {
    await delay(150)
    const p = periodosDb.find((x) => x.id === Number(params.id))
    return p ? conDatos(p) : noEncontrado("el período")
  }),
  http.put(`${BASE}/periodos/:id`, async ({ params, request }) => {
    await delay(400)
    const p = periodosDb.find((x) => x.id === Number(params.id))
    if (!p) return noEncontrado("el período")
    const b = (await request.json()) as {
      FECHA_LIBERACION_RESERVAS: string | null
      MODO_TRASLADO: PeriodoInscripcionRow["modoTraslado"]
      PLAZO_RESPUESTA_TRASLADO: number
      REQUIERE_CONFIRMACION_ACUDIENTE: boolean
    }
    const f = b.FECHA_LIBERACION_RESERVAS
    if (f && ((p.fechaCierreInscripcion && f < p.fechaCierreInscripcion) || f > p.fechaLimiteMatricula)) {
      return error(400, "La Fecha de liberación debe estar entre el cierre de inscripción y la Fecha límite de matrícula.")
    }
    Object.assign(p, {
      fechaLiberacionReservas: f,
      modoTraslado: b.MODO_TRASLADO,
      plazoRespuestaTraslado: b.PLAZO_RESPUESTA_TRASLADO,
      requiereConfirmacionAcudiente: b.REQUIERE_CONFIRMACION_ACUDIENTE,
    })
    return conDatos(p.id)
  }),
]
