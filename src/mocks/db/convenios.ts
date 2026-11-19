// Convenios de adscripción (Sección 2.16.1), en snake_case como los mandaría
// el back (tarea 14 de pendientes-back.md). El usuario está en IE Central:
// - Recibe de IE Norte e IE Oriente («Envía a sus estudiantes»): renovar, finalizar.
// - Envía a ITI e IE Sur («Recibe a mis estudiantes»): aceptar o rechazar la propuesta.
// Aceptar el de IE Sur pregunta por «Agropecuaria», que la sede ya tiene.

const YO = "IE Central"

type Estado = "PROPUESTO" | "ACEPTADO" | "RECHAZADO" | "FINALIZADO"

interface ConvenioRow {
  id: number
  receptor: string
  origen: string
  anio: number
  periodos: { id: number; nombre: string }[]
  grados: string[]
  especialidades: string[]
  cupo_maximo: number | null
  adscritos: number
  estado: Estado
  documentos: string[]
  motivo: string | null
}

const ESTABLECIMIENTOS = [
  { id: 2, nombre: "IE Norte" },
  { id: 3, nombre: "IE Sur" },
  { id: 4, nombre: "IE Oriente" },
  { id: 5, nombre: "ITI" },
  { id: 6, nombre: "ITC" },
]
const GRADOS = [
  { id: 10, nombre: "Décimo" },
  { id: 11, nombre: "Undécimo" },
]
const ESPECIALIDADES = [
  { id: 1, nombre: "Sistemas", libres: 38 },
  { id: 2, nombre: "Contabilidad", libres: 24 },
  { id: 3, nombre: "Electricidad", libres: 12 },
]
// Plan de estudio: qué especialidades tiene cada grado (Contabilidad solo en Décimo).
const PLAN: Record<number, number[]> = { 10: [1, 2, 3], 11: [1] }
const periodo = (id: number, anio: number, jornada: string) => ({ id, nombre: `IE Central · ${anio} · ${jornada} · Anual · C1` })
const PERIODOS_2027 = [periodo(11, 2027, "Mañana"), periodo(12, 2027, "Tarde")]
const PERIODOS_2028 = [periodo(21, 2028, "Mañana"), periodo(22, 2028, "Tarde")]

const convenios: ConvenioRow[] = [
  { id: 1, receptor: YO, origen: "IE Norte", anio: 2027, periodos: PERIODOS_2027, grados: ["Décimo", "Undécimo"], especialidades: ["Sistemas", "Contabilidad"], cupo_maximo: 10, adscritos: 7, estado: "ACEPTADO", documentos: ["Formato de inscripción", "Documento de identidad"], motivo: null },
  { id: 2, receptor: "ITI", origen: YO, anio: 2027, periodos: [{ id: 51, nombre: "ITI · 2027 · Tarde · Anual · C1" }], grados: ["Décimo"], especialidades: ["Electricidad"], cupo_maximo: 15, adscritos: 4, estado: "ACEPTADO", documentos: [], motivo: null },
  { id: 3, receptor: "IE Sur", origen: YO, anio: 2027, periodos: [{ id: 61, nombre: "IE Sur · 2027 · Tarde · Anual · C1" }], grados: ["Décimo", "Undécimo"], especialidades: ["Agropecuaria"], cupo_maximo: null, adscritos: 0, estado: "PROPUESTO", documentos: [], motivo: null },
  { id: 4, receptor: YO, origen: "IE Oriente", anio: 2027, periodos: [PERIODOS_2027[1]], grados: ["Undécimo"], especialidades: ["Contabilidad"], cupo_maximo: 5, adscritos: 0, estado: "PROPUESTO", documentos: [], motivo: null },
  { id: 5, receptor: YO, origen: "IE Norte", anio: 2026, periodos: [periodo(1, 2026, "Tarde")], grados: ["Décimo"], especialidades: ["Sistemas"], cupo_maximo: 8, adscritos: 8, estado: "FINALIZADO", documentos: [], motivo: "Fin del año 2026." },
]

const toRow = (c: ConvenioRow) => {
  const soyReceptor = c.receptor === YO
  return { ...c, soy_receptor: soyReceptor, contraparte: soyReceptor ? c.origen : c.receptor }
}

export function listarConvenios(f: { search: string | null; anio: number | null; pageIndex: number; pageSize: number }) {
  const q = f.search?.toLowerCase().trim() ?? ""
  const filas = convenios
    .map(toRow)
    .filter((c) => !q || c.contraparte.toLowerCase().includes(q))
    .filter((c) => f.anio == null || c.anio === f.anio)
  return filas.slice(f.pageIndex * f.pageSize, (f.pageIndex + 1) * f.pageSize).map((c) => ({ ...c, total_count: filas.length }))
}

export function opcionesConvenio() {
  return {
    establecimiento: YO,
    establecimientos: ESTABLECIMIENTOS,
    periodos: [...PERIODOS_2027, ...PERIODOS_2028].map((p) => ({
      ...p,
      anio: p.id > 20 ? 2028 : 2027,
      grados: GRADOS.map((g) => ({ ...g, especialidades: PLAN[g.id] })),
    })),
    especialidades: ESPECIALIDADES,
    continuidad_automatica: true,
  }
}

type Res<T> = { error: string; status: number } | { data: T }

export function crearConvenios(b: { ORIGENES: number[]; PERIODOS: number[]; GRADOS: number[]; ESPECIALIDADES: number[]; CUPO_MAXIMO: number | null; DOCUMENTOS: string[] }): Res<{ pk_convenio: number }[]> {
  const periodos = opcionesConvenio().periodos.filter((p) => b.PERIODOS.includes(p.id))
  const anios = new Set(periodos.map((p) => p.anio))
  if (anios.size !== 1) return { error: "Los períodos académicos deben ser de un mismo año.", status: 400 }
  const anio = [...anios][0]
  const creados = b.ORIGENES.map((id) => {
    const row: ConvenioRow = {
      id: Math.max(...convenios.map((c) => c.id)) + 1,
      receptor: YO,
      origen: ESTABLECIMIENTOS.find((e) => e.id === id)?.nombre ?? "—",
      anio,
      periodos: periodos.map((p) => ({ id: p.id, nombre: p.nombre })),
      grados: GRADOS.filter((g) => b.GRADOS.includes(g.id)).map((g) => g.nombre),
      especialidades: ESPECIALIDADES.filter((e) => b.ESPECIALIDADES.includes(e.id)).map((e) => e.nombre),
      cupo_maximo: b.CUPO_MAXIMO,
      adscritos: 0,
      estado: "PROPUESTO",
      documentos: b.DOCUMENTOS,
      motivo: null,
    }
    convenios.unshift(row)
    return { pk_convenio: row.id }
  })
  return { data: creados }
}

const buscar = (id: number) => convenios.find((c) => c.id === id)

export function previaAceptar(id: number) {
  const c = buscar(id)
  const conflictos = (c?.especialidades ?? [])
    .filter((e) => e === "Agropecuaria" || e === "Sistemas")
    .map((e, i) => ({ especialidad_id: 100 + i, especialidad: e, sede: `${YO} — Sede principal` }))
  return { conflictos, nuevas: (c?.especialidades ?? []).filter((e) => !conflictos.some((x) => x.especialidad === e)) }
}

export function cambiarEstado(id: number, estado: Estado, motivo: string | null, permitidos: Estado[]): Res<null> {
  const c = buscar(id)
  if (!c) return { error: "No se encontró el convenio.", status: 404 }
  if (!permitidos.includes(c.estado)) return { error: "El convenio ya no está en un estado que lo permita.", status: 409 }
  if (motivo != null && (motivo.trim().length < 10 || motivo.length > 500)) return { error: "El motivo debe tener entre 10 y 500 caracteres.", status: 400 }
  c.estado = estado
  c.motivo = motivo
  return { data: null }
}

export function previaRenovar(id: number) {
  const c = buscar(id)
  const siguientes = c?.anio === 2026 ? PERIODOS_2027 : PERIODOS_2028
  // Equivalentes: misma Sede y Jornada.
  const jornadas = (c?.periodos ?? []).map((p) => p.nombre.split(" · ")[2])
  return { periodos: siguientes, equivalentes: siguientes.filter((p) => jornadas.includes(p.nombre.split(" · ")[2])).map((p) => p.id) }
}

export function renovar(id: number, periodoIds: number[]): Res<{ pk_convenio: number }> {
  const c = buscar(id)
  if (!c) return { error: "No se encontró el convenio.", status: 404 }
  const siguientes = previaRenovar(id).periodos.filter((p) => periodoIds.includes(p.id))
  if (!siguientes.length) return { error: "Elija al menos un período académico del año siguiente.", status: 400 }
  const row: ConvenioRow = { ...c, id: Math.max(...convenios.map((x) => x.id)) + 1, anio: c.anio + 1, periodos: siguientes, adscritos: 0, estado: "PROPUESTO", motivo: null }
  convenios.unshift(row)
  return { data: { pk_convenio: row.id } }
}
