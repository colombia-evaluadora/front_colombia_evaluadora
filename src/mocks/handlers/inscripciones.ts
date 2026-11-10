import { http, HttpResponse, delay } from "msw"

import type {
  InscripcionDetalleRow,
  OpcionInscripcionRow,
} from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import type { EstadoOpcion, SituacionEdad } from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"
import { formatGrade } from "@/features/coverage/shared/api/ui-mappings"
import { gruposDb, nombreGrupoMock } from "@/mocks/handlers/inscripciones-configuracion"

// Inscripciones con la forma de sso V426: rutas `/eval-col/cobertura-academica/inscripciones`,
// cuerpos en MAYÚSCULAS, listado en snake_case con `total_count` y el resto en `{ rows: [{ datos }] }`.
const BASE = "*/api/eval-col/cobertura-academica/inscripciones"

const NOMBRES = ["Mariana López Gil", "Tomás Rincón", "Laura Vélez Ortiz", "Samuel Ruiz Toro", "Isabela Mora Díaz", "Juan Diego Cano", "Valeria Pardo Ríos", "Emilio Suárez Vega", "Antonia Quintero", "Martín Arango Cruz", "Salomé Ospina", "Jerónimo Henao Luna"]
const PRIORIDADES = ["Hermano verificado", "Víctima del conflicto armado", "Discapacidad", null, null, null]
const EDADES: SituacionEdad[] = ["EN_EDAD", "EN_EDAD", "EXTRAEDAD", "EN_EDAD", "PREEXTRAEDAD", "EN_EDAD", "BAJA_EDAD", "SIN_CALCULAR"]
const ESTADOS: EstadoOpcion[] = ["PENDIENTE", "PENDIENTE", "PENDIENTE", "EN_LISTA_ESPERA", "PENDIENTE", "PENDIENTE", "ADMITIDA", "NO_ADMITIDA", "PENDIENTE", "DESCARTADA"]

type OpcionMock = Omit<OpcionInscripcionRow, "posicion" | "cupos_disponibles" | "total_count"> & {
  grado: string
  jornada: string
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

// Los grados salen de los mocks de períodos: las opciones se generan al pedir cada grado y jornada.
const opcionesDb = new Map<string, OpcionMock[]>()
function opcionesDe(grado: string, jornada: string): OpcionMock[] {
  const clave = `${grado}|${jornada}`
  let filas = opcionesDb.get(clave)
  if (!filas) {
    const base = hash(clave) % 500
    filas = NOMBRES.map((aspirante, i) => {
      const numero = 380 + base + i * 3
      return {
        id: Number(`${base}${i}`) + 10_000,
        inscripcion_id: numero,
        numero_inscripcion: String(numero).padStart(5, "0"),
        aspirante,
        documento: String(1_090_000_000 + (base + i) * 337),
        documentos_faltantes: i === 1 ? ["Documento de identidad del estudiante"] : [],
        prioridad: PRIORIDADES[i % PRIORIDADES.length] ?? null,
        numero_sorteo: ((base + i * 7) % 40) + 1,
        preferencia: (i % 3) + 1,
        estado_opcion: ESTADOS[i % ESTADOS.length],
        // La 7.ª quedó admitida también en otro establecimiento: Por elegir (Regla 38).
        estado_inscripcion: i === 6 ? "POR_ELEGIR" : "INSCRITA",
        total_opciones: i === 6 ? 2 : (i % 3) + 1,
        situacion_edad: EDADES[i % EDADES.length],
        grado,
        jornada,
      }
    })
    opcionesDb.set(clave, filas)
  }
  return filas
}
const todas = () => [...opcionesDb.values()].flat()

type OpcionDetalle = InscripcionDetalleRow["opciones"][number]
const ESTABLECIMIENTOS_OTROS = ["IE San José", "Colegio Nuevo Horizonte"]
const SEDES_OTRAS = ["Sede Norte", "Sede B"]

// Opciones de la inscripción en otros establecimientos: la lista solo muestra la de este.
const extrasDb = new Map<number, OpcionDetalle[]>()
function extrasDe(base: OpcionMock): OpcionDetalle[] {
  let extras = extrasDb.get(base.inscripcion_id)
  if (!extras) {
    extras = Array.from({ length: base.total_opciones - 1 }, (_, i) => ({
      id: base.inscripcion_id * 10 + i + 1,
      preferencia: i + 2,
      grado: base.grado,
      establecimiento: ESTABLECIMIENTOS_OTROS[i % 2],
      sede: SEDES_OTRAS[i % 2],
      jornada: JORNADAS[(i + 1) % JORNADAS.length],
      numeroSorteo: 10 + i * 11,
      estado: base.estado_inscripcion === "POR_ELEGIR" ? "ADMITIDA" : i === 0 ? "EN_LISTA_ESPERA" : "PENDIENTE",
      hermanoVerificado: false,
    }))
    extrasDb.set(base.inscripcion_id, extras)
  }
  return extras
}

/** Todas las opciones de la inscripción: la de esta lista (preferencia 1) y las de otros establecimientos. */
function opcionesDeInscripcion(base: OpcionMock): OpcionDetalle[] {
  return [
    {
      id: base.id,
      preferencia: 1,
      grado: base.grado,
      establecimiento: "IE Central",
      sede: "Principal",
      jornada: base.jornada,
      numeroSorteo: base.numero_sorteo,
      estado: base.estado_opcion,
      hermanoVerificado: base.prioridad === "Hermano verificado",
    },
    ...extrasDe(base),
  ]
}

const filasDe = (inscripcionId: number) => todas().filter((o) => o.inscripcion_id === inscripcionId)

// Orden de admisión (Regla 28): primero con prioridad, luego por número de sorteo.
const ordenar = (rows: OpcionMock[]) =>
  [...rows].sort((a, b) => Number(!a.prioridad) - Number(!b.prioridad) || (a.numero_sorteo ?? 0) - (b.numero_sorteo ?? 0))

const JORNADAS = ["Mañana", "Tarde"]
const cuposDb = new Map<string, number>()
const cuposDe = (grado: string, jornada: string) => cuposDb.get(`${grado}|${jornada}`) ?? 12

const conDatos = (datos: unknown) => HttpResponse.json({ rows: [{ datos }] })
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })

function delGrado(grado: string, jornada: string | null) {
  return (jornada ? [jornada] : JORNADAS).flatMap((j) => opcionesDe(grado, j))
}

// Cascada (opciones-cupo): períodos en Inscripciones de varios establecimientos, con los grados 0° a 11°.
const GRADOS_CASCADA = Array.from({ length: 12 }, (_, g) => ({ id: 70_000 + g, nombre: formatGrade(g) }))
const OPCIONES_CUPO = [
  ["IE Central", "Principal", "Mañana"],
  ["IE Central", "Principal", "Tarde"],
  ["IE Central", "Sede Norte", "Mañana"],
  ["IE San José", "Principal", "Mañana"],
  ["IE San José", "Sede B", "Tarde"],
  ["Colegio Nuevo Horizonte", "Principal", "Mañana"],
].map(([establecimiento, sede, jornada], i) => ({
  periodoId: 101 + i,
  establecimientoId: 1 + Math.floor(i / 3),
  establecimiento,
  sede,
  jornada,
  grupoAdmisionId: 1,
  grupoAdmision: "2027 · Anual · Ciclo 1",
  grados: GRADOS_CASCADA,
}))

export const inscripcionesHandlers = [
  // Antes que `/:id`: si no, "opciones-cupo" se toma como un id.
  http.get(`${BASE}/opciones-cupo`, async () => {
    await delay(150)
    return conDatos(OPCIONES_CUPO)
  }),

  http.post(`${BASE}/query`, async ({ request }) => {
    await delay(250)
    const b = (await request.json()) as {
      FILTERS: { GRADO: string; JORNADA: string | null; SEARCH: string | null; ESTADOS: EstadoOpcion[] }
      PAGEINDEX: number
      PAGESIZE: number
    }
    const { GRADO, JORNADA, SEARCH, ESTADOS: estadosFiltro } = b.FILTERS
    const q = SEARCH?.trim().toLowerCase()
    const estados = estadosFiltro?.length ? estadosFiltro : ["PENDIENTE", "EN_LISTA_ESPERA"]
    const cupos = JORNADA ? cuposDe(GRADO, JORNADA) : JORNADAS.reduce((n, j) => n + cuposDe(GRADO, j), 0)
    // La posición sale del orden completo del grado, antes de buscar o filtrar.
    const filtradas = ordenar(delGrado(GRADO, JORNADA))
      .map((o, i) => ({ ...o, posicion: i + 1 }))
      .filter(
        (o) =>
          estados.includes(o.estado_opcion) &&
          (!q || o.aspirante.toLowerCase().includes(q) || o.numero_inscripcion.includes(q) || o.documento.includes(q)),
      )
    const start = b.PAGEINDEX * b.PAGESIZE
    const rows = filtradas.slice(start, start + b.PAGESIZE).map(({ grado: _g, jornada: _j, ...o }) => ({
      ...o,
      cupos_disponibles: cupos,
      total_count: filtradas.length,
    }))
    return HttpResponse.json({ rows })
  }),

  http.post(`${BASE}/lista-sorteo/datos`, async ({ request }) => {
    await delay(300)
    const { FK_TGRUPO_ADMISION, GRADO, JORNADA } = (await request.json()) as {
      FK_TGRUPO_ADMISION: number
      GRADO: string
      JORNADA: string | null
    }
    const grupo = gruposDb.find((g) => g.id === FK_TGRUPO_ADMISION) ?? gruposDb[0]
    // Mismo orden que la lista; sin aspirante ni documento (Regla 53).
    return conDatos({
      establecimiento: { nombre: "Institución Educativa IE Central", dane: "168001000123", nit: "890.200.123-4", municipio: "Bucaramanga, Santander" },
      grupoAdmision: nombreGrupoMock(grupo),
      grado: GRADO,
      jornada: JORNADA,
      fechaSorteo: grupo.fechaCierre,
      generadoEl: new Date().toISOString().slice(0, 16),
      rows: ordenar(delGrado(GRADO, JORNADA)).map((o, i) => ({
        posicion: i + 1,
        numeroInscripcion: o.numero_inscripcion,
        prioridad: o.prioridad,
        numeroSorteo: o.numero_sorteo == null ? null : String(o.numero_sorteo).padStart(4, "0"),
        estadoOpcion: o.estado_opcion,
      })),
    })
  }),

  // Admitir en el orden recibido (el de admisión) mientras haya cupo; el resto, a lista de espera.
  http.post(`${BASE}/admitir`, async ({ request }) => {
    await delay(500)
    const { IDS } = (await request.json()) as { IDS: number[] }
    let admitidas = 0
    let enListaEspera = 0
    let omitidas = 0
    for (const id of IDS) {
      const o = todas().find((x) => x.id === id)
      if (!o || (o.estado_opcion !== "PENDIENTE" && o.estado_opcion !== "EN_LISTA_ESPERA")) continue
      // Ya admitida en otra opción del establecimiento: se salta.
      if (todas().some((x) => x.inscripcion_id === o.inscripcion_id && x.estado_opcion === "ADMITIDA")) {
        omitidas++
        continue
      }
      const cupos = cuposDe(o.grado, o.jornada)
      if (cupos > 0) {
        cuposDb.set(`${o.grado}|${o.jornada}`, cupos - 1)
        o.estado_opcion = "ADMITIDA"
        for (const x of todas()) if (x.inscripcion_id === o.inscripcion_id) x.estado_inscripcion = "ADMITIDA"
        admitidas++
      } else {
        o.estado_opcion = "EN_LISTA_ESPERA"
        enListaEspera++
      }
    }
    return conDatos({ admitidas, enListaEspera, omitidas })
  }),

  http.post(`${BASE}/no-admitir`, async ({ request }) => {
    await delay(400)
    const { IDS, FK_TLV_MOTIVO } = (await request.json()) as { IDS: number[]; FK_TLV_MOTIVO: number | null }
    if (!FK_TLV_MOTIVO) return error(400, "El motivo de no admisión es obligatorio.")
    for (const o of todas()) if (IDS.includes(o.id)) o.estado_opcion = "NO_ADMITIDA"
    return conDatos(IDS.length)
  }),

  http.post(`${BASE}/:id/anular`, async ({ params, request }) => {
    await delay(400)
    const filas = todas().filter((o) => o.inscripcion_id === Number(params.id))
    if (!filas.length) return error(404, "No se encontró la inscripción.")
    const { FK_TLV_MOTIVO } = (await request.json()) as { FK_TLV_MOTIVO: number | null }
    if (!FK_TLV_MOTIVO) return error(400, "El motivo de anulación es obligatorio.")
    if (filas[0].estado_inscripcion === "ANULADA") return error(400, "La inscripción ya está anulada.")
    for (const o of filas) {
      // Una opción admitida libera su cupo.
      if (o.estado_opcion === "ADMITIDA") cuposDb.set(`${o.grado}|${o.jornada}`, cuposDe(o.grado, o.jornada) + 1)
      o.estado_opcion = "DESCARTADA"
      o.estado_inscripcion = "ANULADA"
    }
    return conDatos(Number(params.id))
  }),

  // Detalle: la inscripción con sus opciones de todos los establecimientos.
  http.get(`${BASE}/:id`, async ({ params }) => {
    await delay(200)
    const base = todas().find((o) => o.inscripcion_id === Number(params.id))
    if (!base) return error(404, "No se encontró la inscripción.")
    const [primerNombre, primerApellido, segundoApellido] = base.aspirante.split(" ")
    const detalle: InscripcionDetalleRow = {
      id: base.inscripcion_id,
      numeroInscripcion: base.numero_inscripcion,
      estado: base.estado_inscripcion,
      documentoHermano: base.prioridad === "Hermano verificado" ? "1098765432" : null,
      paisOrigen: "Colombia",
      lenguaMaterna: "Español",
      condicionMigratoria: "No aplica",
      opciones: opcionesDeInscripcion(base),
      estudiante: {
        usuarioId: base.inscripcion_id + 5000,
        tipoDocumento: "Registro Civil de Nacimiento",
        documento: base.documento,
        primerNombre,
        segundoNombre: null,
        primerApellido: primerApellido ?? "",
        segundoApellido: segundoApellido ?? null,
        fechaNacimiento: "2021-03-12",
        genero: "Femenino",
        telefono: null,
        email: null,
      },
      acudiente: {
        usuarioId: base.inscripcion_id + 6000,
        tipoDocumento: "Cédula de ciudadanía",
        documento: "63456789",
        primerNombre: "Paola",
        segundoNombre: null,
        primerApellido: segundoApellido ?? "Gil",
        segundoApellido: "Herrera",
        fechaNacimiento: null,
        genero: "Femenino",
        telefono: "315 278 9012",
        email: "paola.gil@correo.com",
        parentesco: "Madre",
      },
      soportes: [
        { tipoId: 11, nombre: "Documento de identidad del estudiante", archivo: `RC_${primerNombre}.pdf`, revision: "SOPORTADO" },
        { tipoId: 12, nombre: "Certificado de estudios del año anterior", archivo: "Certificado_2025.pdf", revision: "SIN_REVISAR" },
        { tipoId: 13, nombre: "Certificado médico del estudiante", archivo: null, revision: "SIN_ARCHIVO" },
      ],
    }
    return conDatos(detalle)
  }),

  // Ampliar (Regla 27): una opción Pendiente más, al final. El mock no conoce el período: la nombra por su id.
  http.post(`${BASE}/:id/ampliar`, async ({ params, request }) => {
    await delay(400)
    const filas = filasDe(Number(params.id))
    if (!filas.length) return error(404, "No se encontró la inscripción.")
    const base = filas[0]
    const vivas = opcionesDeInscripcion(base).filter((o) => o.estado !== "DESCARTADA")
    if (base.estado_inscripcion !== "INSCRITA" && base.estado_inscripcion !== "EN_LISTA_ESPERA") {
      return error(400, "Solo se amplía una inscripción Inscrita o En lista de espera")
    }
    if (vivas.length >= 3) return error(400, "La inscripción ya tiene tres opciones")
    const { PERIODO } = (await request.json()) as { PERIODO: number; GRADO: number }
    const extras = extrasDe(base)
    const id = base.inscripcion_id * 10 + extras.length + 1
    extras.push({
      id,
      preferencia: Math.max(...opcionesDeInscripcion(base).map((o) => o.preferencia)) + 1,
      grado: base.grado,
      establecimiento: "IE Central",
      sede: `Período ${PERIODO}`,
      jornada: base.jornada,
      numeroSorteo: null,
      estado: "PENDIENTE",
      hermanoVerificado: false,
    })
    for (const f of filas) f.total_opciones = vivas.length + 1
    return conDatos(id)
  }),

  // Elegir opción (Regla 38): la elegida sigue Admitida y las demás vivas pasan a Descartada.
  http.post(`${BASE}/opciones/:id/elegir`, async ({ params }) => {
    await delay(400)
    const id = Number(params.id)
    const base = todas().find((o) => o.id === id || extrasDe(o).some((x) => x.id === id))
    if (!base) return error(404, "No se encontró la opción.")
    const elegida = opcionesDeInscripcion(base).find((o) => o.id === id)
    if (elegida?.estado !== "ADMITIDA") return error(400, "Solo se elige una opción Admitida")
    const descartar = (estado: EstadoOpcion) =>
      estado === "ADMITIDA" || estado === "PENDIENTE" || estado === "EN_LISTA_ESPERA" ? "DESCARTADA" : estado
    for (const x of extrasDe(base)) if (x.id !== id) x.estado = descartar(x.estado)
    for (const f of filasDe(base.inscripcion_id)) {
      if (f.id !== id) f.estado_opcion = descartar(f.estado_opcion)
      f.estado_inscripcion = "ADMITIDA"
    }
    return conDatos(base.inscripcion_id)
  }),

  // Nueva y editar llegan por file-service (`/files/eval-col/...`) como multipart.
  http.post(`*/api/files/eval-col/cobertura-academica/inscripciones/:id/editar`, async ({ params }) => {
    await delay(500)
    const filas = todas().filter((o) => o.inscripcion_id === Number(params.id))
    if (!filas.length) return error(404, "No se encontró la inscripción.")
    if (filas[0].estado_inscripcion === "ANULADA" || filas[0].estado_inscripcion === "ADMITIDA") {
      return error(400, "Una inscripción anulada o admitida no se edita.")
    }
    return conDatos(Number(params.id))
  }),

  http.post(`*/api/files/eval-col/cobertura-academica/inscripciones`, async ({ request }) => {
    await delay(500)
    const body = await request.formData()
    // Mismas reglas que el back: autorización obligatoria (Ley 1581) y documento del hermano de 5 a 20.
    if (body.get("AUTORIZA_DATOS") !== "true") {
      return error(400, "Para guardar la inscripción hay que autorizar el tratamiento de datos (Ley 1581 de 2012).")
    }
    const hermano = body.get("DOCUMENTO_HERMANO")
    if (typeof hermano === "string" && !/^[A-Za-z0-9]{5,20}$/.test(hermano)) {
      return error(400, "El Documento del hermano debe tener entre 5 y 20 letras o dígitos, sin puntos ni espacios.")
    }
    const numero = String(500 + Math.floor(Math.random() * 400)).padStart(5, "0")
    return conDatos({ id: Number(numero), numeroInscripcion: numero })
  }),
]
