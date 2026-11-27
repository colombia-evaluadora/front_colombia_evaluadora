// Convocatorias de matrícula complementaria (Sección 2.16.2). Las filas van en
// snake_case, como las mandaría el back (tarea 12 de pendientes-back.md).
// - 2027: En selección, Manual con Sorteo y postulaciones: se ve Seleccionar.
// - 2025: Cerrada, Automática: se ve Ver resultado.
// Las nuevas toman el estado de sus fechas.

type Estado = "PROGRAMADA" | "EN_POSTULACION" | "EN_SELECCION" | "PUBLICADA" | "CERRADA"
type EstadoOpcion = "INSCRITO" | "REGISTRADO" | "ADSCRITO" | "EN_LISTA_ESPERA" | "DESCARTADA"

interface CupoRow {
  id: number
  sede_id: number
  sede: string
  periodo_id: number
  periodo: string
  jornada: string
  grado_id: number
  grado: string
  especialidad_id: number
  especialidad: string
  cupo: number
  seleccionados: number
  en_lista_espera: number
  /** Adscritos del año anterior que continúan en la especialidad. */
  continuan: number
}

interface ConvocatoriaRow {
  id: number
  anio: number
  establecimiento: string
  establecimiento_id: number
  origenes: { id: number; nombre: string }[]
  modo: "MANUAL" | "AUTOMATICA"
  desempate: "SORTEO" | "ORDEN"
  inicio_postulacion: string
  cierre_postulacion: string
  publicacion: string
  limite_matricula: string
  estado: Estado
  cupos: CupoRow[]
  tiene_postulaciones: boolean
  ejecutada_el: string | null
}

interface OpcionRow {
  id: number
  postulacion_id: number
  preferencia: number
  posicion: number
  postulacion: string
  estudiante: string
  origen: string
  sorteo: string | null
  registro: string
  continuidad: boolean
  estado: EstadoOpcion
}

const ESTABLECIMIENTO = "IE Central"
const ESTABLECIMIENTO_ID = 1
const ORIGENES = [
  { id: 2, nombre: "IE Norte" },
  { id: 3, nombre: "IE Sur" },
  { id: 4, nombre: "IE San José" },
]
/** Cupo máximo de adscritos de cada convenio. */
const MAXIMO_CONVENIO: Record<string, number> = { "IE Norte": 10, "IE Sur": 6, "IE San José": 8 }

const SEDES = [
  { id: 1, nombre: "IE Central" },
  { id: 2, nombre: "Sede Norte" },
]
const PERIODOS = [
  { id: 11, sede_id: 1, label: "Tarde · Anual · Ciclo 1", jornada: "Tarde", anual: true, limite_matricula: "-03-15" },
  { id: 12, sede_id: 1, label: "Mañana · Anual · Ciclo 1", jornada: "Mañana", anual: true, limite_matricula: "-03-20" },
  { id: 21, sede_id: 2, label: "Tarde · Semestral · Ciclo 1", jornada: "Tarde", anual: false, limite_matricula: "-02-28" },
]
const GRADOS = [
  { id: 10, nombre: "Décimo", inicial: true },
  { id: 11, nombre: "Undécimo", inicial: false },
]
const ESPECIALIDADES = [
  { id: 1, nombre: "Sistemas" },
  { id: 2, nombre: "Contabilidad" },
  { id: 3, nombre: "Electricidad" },
]
const NOMBRES = [
  "Valeria Duarte León",
  "Camilo Andrés Rueda Pinto",
  "Andrés Felipe Pinto Rey",
  "Daniel Felipe Ortiz Gil",
  "María Paula Suárez Rey",
  "Juan José Pinzón León",
  "Mateo Camacho Díaz",
  "Juliana Prada Rey",
  "Santiago Ortiz Gil",
  "Laura Sofía Medina Cruz",
  "Tomás Herrera Vega",
  "Isabella Rojas Mora",
  "Samuel Castro Niño",
]

const libresDe = (periodoId: number, gradoId: number, especialidadId: number) =>
  4 + ((periodoId + gradoId * 3 + especialidadId * 5) % 9)

function cupo(id: number, periodoId: number, gradoId: number, especialidadId: number, n: number, sel = 0, espera = 0): CupoRow {
  const p = PERIODOS.find((x) => x.id === periodoId)!
  return {
    id,
    sede_id: p.sede_id,
    sede: SEDES.find((s) => s.id === p.sede_id)!.nombre,
    periodo_id: p.id,
    periodo: p.label,
    jornada: p.jornada,
    grado_id: gradoId,
    grado: GRADOS.find((g) => g.id === gradoId)!.nombre,
    especialidad_id: especialidadId,
    especialidad: ESPECIALIDADES.find((e) => e.id === especialidadId)!.nombre,
    cupo: n,
    seleccionados: sel,
    en_lista_espera: espera,
    continuan: gradoId === 11 && especialidadId === 1 ? 3 : 0,
  }
}

let nextCupo = 100
const convocatorias: ConvocatoriaRow[] = [
  {
    id: 2,
    anio: 2027,
    establecimiento: ESTABLECIMIENTO,
    establecimiento_id: ESTABLECIMIENTO_ID,
    origenes: [ORIGENES[0], ORIGENES[1]],
    modo: "MANUAL",
    desempate: "SORTEO",
    inicio_postulacion: "2027-02-01",
    cierre_postulacion: "2027-02-15",
    publicacion: "2027-02-22",
    limite_matricula: "2027-03-05",
    estado: "EN_SELECCION",
    cupos: [cupo(21, 11, 10, 1, 8), cupo(22, 11, 10, 2, 6), cupo(23, 12, 10, 1, 4)],
    tiene_postulaciones: true,
    ejecutada_el: "2027-02-15",
  },
  {
    id: 1,
    anio: 2025,
    establecimiento: ESTABLECIMIENTO,
    establecimiento_id: ESTABLECIMIENTO_ID,
    origenes: [ORIGENES[0]],
    modo: "AUTOMATICA",
    desempate: "SORTEO",
    inicio_postulacion: "2025-02-02",
    cierre_postulacion: "2025-02-13",
    publicacion: "2025-02-20",
    limite_matricula: "2025-03-06",
    estado: "CERRADA",
    cupos: [cupo(11, 11, 10, 1, 8, 8, 3), cupo(12, 11, 11, 1, 5, 5, 4), cupo(13, 11, 11, 2, 5, 4, 0)],
    tiene_postulaciones: true,
    ejecutada_el: "2025-02-13",
  },
]

/* Opciones postuladas por cupo, en el orden de selección (Continuidad primero, luego el desempate). */
const opcionesPorCupo = new Map<number, OpcionRow[]>()

function opcionesDe(c: CupoRow, conv: ConvocatoriaRow): OpcionRow[] {
  const guardadas = opcionesPorCupo.get(c.id)
  if (guardadas) return guardadas
  const total = c.cupo + 3
  const filas = Array.from({ length: total }, (_, i): OpcionRow => {
    const n = (c.id * 7 + i * 5) % 90
    return {
      id: c.id * 100 + i,
      postulacion_id: c.id * 100 + i,
      preferencia: 1 + (i % 3),
      posicion: i + 1,
      postulacion: String(10 + n).padStart(4, "0"),
      estudiante: NOMBRES[(c.id + i) % NOMBRES.length],
      origen: conv.origenes[i % conv.origenes.length].nombre,
      sorteo: conv.desempate === "SORTEO" ? String(4 + i * 7).padStart(3, "0") : null,
      registro: `2027-02-${String(2 + (i % 12)).padStart(2, "0")}T${String(8 + (i % 9)).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}`,
      continuidad: c.grado_id === 11 && i === 0,
      estado: i < c.seleccionados ? "REGISTRADO" : i < c.seleccionados + c.en_lista_espera ? "EN_LISTA_ESPERA" : "INSCRITO",
    }
  })
  opcionesPorCupo.set(c.id, filas)
  return filas
}

const porId = (id: number) => convocatorias.find((c) => c.id === id)

/* Lecturas */

export function listarConvocatorias(pageIndex: number, pageSize: number, desc = true) {
  const orden = [...convocatorias].sort((a, b) => (desc ? b.anio - a.anio : a.anio - b.anio))
  return orden
    .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
    .map((c) => ({ ...c, total_count: convocatorias.length }))
}

export const obtenerConvocatoria = (id: number) => porId(id) ?? null

export function opcionesConvocatoria(anio: number) {
  return {
    establecimiento: ESTABLECIMIENTO,
    establecimiento_id: ESTABLECIMIENTO_ID,
    origenes: ORIGENES,
    sedes: SEDES.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      periodos: PERIODOS.filter((p) => p.sede_id === s.id).map((p) => ({
        id: p.id,
        label: p.label,
        jornada: p.jornada,
        anual: p.anual,
        limite_matricula: `${anio}${p.limite_matricula}`,
        grados: GRADOS.map((g) => ({
          ...g,
          especialidades: ESPECIALIDADES.slice(0, g.id === 10 ? 3 : 2).map((e) => ({ ...e, libres: libresDe(p.id, g.id, e.id) })),
        })),
      })),
    })),
    continuan: [{ especialidad: "Sistemas", grado: "Undécimo", grado_codigo: "11", cantidad: 3 }],
  }
}

/* Escrituras */

interface Body {
  ANIO: number
  ORIGENES: number[]
  MODO_SELECCION: "MANUAL" | "AUTOMATICA"
  DESEMPATE: "SORTEO" | "ORDEN"
  FECHA_INICIO_POSTULACION: string
  FECHA_CIERRE_POSTULACION: string
  FECHA_PUBLICACION: string
  FECHA_LIMITE_MATRICULA: string
  CUPOS: { ID: number | null; FK_TPERIODO_ACADEMICO: number; FK_TGRADO: number; FK_ESPECIALIDAD: number; CUPO: number }[]
}

function estadoPorFechas(b: Body): Estado {
  const hoy = new Date().toISOString().slice(0, 10)
  if (hoy < b.FECHA_INICIO_POSTULACION) return "PROGRAMADA"
  if (hoy <= b.FECHA_CIERRE_POSTULACION) return "EN_POSTULACION"
  if (b.FECHA_PUBLICACION && hoy < b.FECHA_PUBLICACION) return "EN_SELECCION"
  if (hoy <= b.FECHA_LIMITE_MATRICULA) return "PUBLICADA"
  return "CERRADA"
}

export function guardarConvocatoria(id: number | null, b: Body): { error: string; status: number } | { data: { pk_convocatoria: number } } {
  const otra = convocatorias.find((c) => c.anio === b.ANIO && c.id !== id)
  if (otra) return { error: `Ya existe la convocatoria ${b.ANIO} de este establecimiento.`, status: 409 }
  const claves = b.CUPOS.map((c) => `${c.FK_TPERIODO_ACADEMICO}-${c.FK_TGRADO}-${c.FK_ESPECIALIDAD}`)
  if (new Set(claves).size !== claves.length)
    return { error: "Hay cupos repetidos: no se repite la misma Sede, Período, Grado y Especialidad.", status: 400 }
  const previa = id == null ? null : porId(id)
  if (id != null && !previa) return { error: "No se encontró la convocatoria.", status: 404 }

  const cupos: CupoRow[] = []
  for (const c of b.CUPOS) {
    const antes = previa?.cupos.find((x) => x.id === c.ID)
    const tope = libresDe(c.FK_TPERIODO_ACADEMICO, c.FK_TGRADO, c.FK_ESPECIALIDAD)
    const fila = cupo(c.ID ?? nextCupo++, c.FK_TPERIODO_ACADEMICO, c.FK_TGRADO, c.FK_ESPECIALIDAD, c.CUPO, antes?.seleccionados ?? 0, antes?.en_lista_espera ?? 0)
    if (c.CUPO > tope && c.CUPO > (antes?.cupo ?? 0))
      return { error: `El cupo de ${fila.especialidad} · ${fila.grado} supera los ${tope} puestos libres de sus grupos.`, status: 400 }
    if (c.CUPO < fila.seleccionados)
      return { error: `El cupo de ${fila.especialidad} · ${fila.grado} no puede quedar por debajo de sus ${fila.seleccionados} seleccionados.`, status: 400 }
    cupos.push(fila)
  }

  const row: ConvocatoriaRow = {
    id: id ?? Math.max(0, ...convocatorias.map((c) => c.id)) + 1,
    anio: b.ANIO,
    establecimiento: ESTABLECIMIENTO,
    establecimiento_id: ESTABLECIMIENTO_ID,
    origenes: ORIGENES.filter((o) => b.ORIGENES.includes(o.id)),
    modo: b.MODO_SELECCION,
    desempate: b.DESEMPATE,
    inicio_postulacion: b.FECHA_INICIO_POSTULACION,
    cierre_postulacion: b.FECHA_CIERRE_POSTULACION,
    publicacion: b.FECHA_PUBLICACION,
    limite_matricula: b.FECHA_LIMITE_MATRICULA,
    // Las sembradas conservan su estado para poder recorrer cada caso.
    estado: previa?.estado ?? estadoPorFechas(b),
    cupos,
    tiene_postulaciones: previa?.tiene_postulaciones ?? false,
    ejecutada_el: previa?.ejecutada_el ?? null,
  }
  if (previa) convocatorias.splice(convocatorias.indexOf(previa), 1, row)
  else convocatorias.unshift(row)
  return { data: { pk_convocatoria: row.id } }
}

export function eliminarConvocatoria(id: number): { error: string; status: number } | { data: null } {
  const c = porId(id)
  if (!c) return { error: "No se encontró la convocatoria.", status: 404 }
  if (c.tiene_postulaciones)
    return { error: "La convocatoria ya tiene postulaciones: no se puede eliminar. Ajústela con Editar.", status: 409 }
  convocatorias.splice(convocatorias.indexOf(c), 1)
  return { data: null }
}

/* Selección */

/** Inscrito en selección; En lista de espera desde la publicación. */
function pendientes(conv: ConvocatoriaRow, c: CupoRow) {
  const objetivo: EstadoOpcion = conv.estado === "EN_SELECCION" ? "INSCRITO" : "EN_LISTA_ESPERA"
  return opcionesDe(c, conv).filter((o) => o.estado === objetivo)
}

function adscritosPorOrigen(conv: ConvocatoriaRow) {
  const cuenta = new Map<string, number>()
  for (const c of conv.cupos)
    for (const o of opcionesDe(c, conv))
      if (o.estado === "REGISTRADO" || o.estado === "ADSCRITO") cuenta.set(o.origen, (cuenta.get(o.origen) ?? 0) + 1)
  return cuenta
}

export function seleccionCupo(id: number, cupoId: number) {
  const conv = porId(id)
  const c = conv?.cupos.find((x) => x.id === cupoId)
  if (!conv || !c) return { error: "No se encontró el cupo.", status: 404 as const }
  const cuenta = adscritosPorOrigen(conv)
  return {
    data: {
      cupo: c,
      postuladas: opcionesDe(c, conv).length,
      convenios: conv.origenes.map((o) => ({ origen: o.nombre, adscritos: cuenta.get(o.nombre) ?? 0, maximo: MAXIMO_CONVENIO[o.nombre] ?? 0 })),
      opciones: pendientes(conv, c).map((o, i) => ({ ...o, posicion: i + 1 })),
    },
  }
}

/** Sigue el orden sin saltar una opción con lugar; respeta el cupo del convenio. */
export function seleccionar(id: number, cupoId: number) {
  const conv = porId(id)
  const c = conv?.cupos.find((x) => x.id === cupoId)
  if (!conv || !c) return { error: "No se encontró el cupo.", status: 404 as const }
  const cuenta = adscritosPorOrigen(conv)
  let libres = c.cupo - c.seleccionados
  let registrados = 0
  let espera = 0
  for (const o of pendientes(conv, c)) {
    const usados = cuenta.get(o.origen) ?? 0
    if (libres > 0 && usados < (MAXIMO_CONVENIO[o.origen] ?? 0)) {
      o.estado = "REGISTRADO"
      cuenta.set(o.origen, usados + 1)
      libres--
      registrados++
    } else {
      o.estado = "EN_LISTA_ESPERA"
      espera++
    }
  }
  c.seleccionados += registrados
  c.en_lista_espera = opcionesDe(c, conv).filter((o) => o.estado === "EN_LISTA_ESPERA").length
  return { data: { registrados, en_lista_espera: espera } }
}

export function resultadoSeleccion(id: number) {
  const conv = porId(id)
  if (!conv) return { error: "No se encontró la convocatoria.", status: 404 as const }
  const cupos = conv.cupos.map((c) => {
    const ops = opcionesDe(c, conv)
    const descartadas = c.id % 3 === 1 ? 2 : 0
    return {
      cupo: `${c.sede} · ${c.jornada} · ${c.grado} · ${c.especialidad}`,
      postulaciones: ops.length + descartadas,
      registrados: c.seleccionados,
      continuidad: ops.filter((o) => o.continuidad && o.estado === "REGISTRADO").length + (c.grado_id === 11 ? 2 : 0),
      en_lista_espera: c.en_lista_espera,
      descartadas,
      libres: Math.max(0, c.cupo - c.seleccionados),
    }
  })
  return {
    data: {
      ejecutada_el: conv.ejecutada_el ?? conv.cierre_postulacion,
      postulaciones: cupos.reduce((s, c) => s + c.postulaciones, 0),
      cupos,
    },
  }
}

export function listaSorteo(id: number, cupoId: number) {
  const conv = porId(id)
  const c = conv?.cupos.find((x) => x.id === cupoId)
  if (!conv || !c) return { error: "No se encontró el cupo.", status: 404 as const }
  return {
    data: {
      ejecutada_el: conv.cierre_postulacion,
      filas: opcionesDe(c, conv).map((o) => ({ posicion: o.posicion, postulacion: o.postulacion, sorteo: o.sorteo ?? "", estado: o.estado })),
    },
  }
}
