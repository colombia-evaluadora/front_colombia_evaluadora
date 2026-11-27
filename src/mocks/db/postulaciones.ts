import { matriculaDb } from "@/mocks/db/matricula"
import { complementariaDe, tipoDe } from "@/mocks/db/complementaria"

// Postulaciones de matrícula complementaria (Sección 2.16.2), en snake_case
// como las manda el back: cada una con 1 a 3 opciones por preferencia.
// El usuario del mock trabaja en IE Central y en ITI, así se ven las dos caras:
// - Origen (IE Central postula a ITI e ITC): editar opciones, anular.
// - Que recibe (IE Central e ITI): agregar matrícula, cambiar especialidad.

const MIOS = ["IE Central", "ITI"]

type EstadoPost = "POSTULADA" | "EN_LISTA_ESPERA" | "SELECCIONADA" | "MATRICULADA" | "NO_SELECCIONADA" | "RETIRADA" | "ANULADA"
type EstadoOpcion = "INSCRITO" | "EN_LISTA_ESPERA" | "REGISTRADO" | "ADSCRITO" | "NO_SELECCIONADA" | "DESCARTADA"

interface Cupo {
  id: number
  convocatoria_id: number
  sede: string
  jornada: string
  grado: string
  especialidad_id: number
  especialidad: string
  cupo: number
  seleccionados: number
}

interface Conv {
  id: number
  anio: number
  receptor_id: number
  receptor: string
  estado: "EN_POSTULACION" | "EN_SELECCION" | "PUBLICADA"
  cierre_postulacion: string
  publicacion: string
  limite_matricula: string
  origenes: string[]
}

const FICHAS: Record<number, { descripcion: string; actividades: string }> = {
  1: {
    descripcion: "Diseño y desarrollo de software y soporte de sistemas. El estudiante cursa los módulos de la especialidad en la jornada tarde.",
    actividades: "Feria de proyectos el 14 de octubre y visitas al taller de cómputo cada mes.",
  },
  2: {
    descripcion: "Contabilidad básica, nómina y manejo de software contable para pequeñas empresas.",
    actividades: "Jornada de puertas abiertas el primer sábado de cada mes.",
  },
  3: {
    descripcion: "Instalaciones eléctricas residenciales y mantenimiento de equipos.",
    actividades: "Visita guiada al taller de electricidad los jueves.",
  },
}
const ESPECIALIDAD: Record<number, string> = { 1: "Sistemas", 2: "Contabilidad", 3: "Electricidad" }

const CONVOCATORIAS: Conv[] = [
  {
    id: 2,
    anio: 2027,
    receptor_id: 1,
    receptor: "IE Central",
    estado: "EN_SELECCION",
    cierre_postulacion: "2027-02-15",
    publicacion: "2027-02-20",
    limite_matricula: "2027-03-05",
    origenes: ["IE Norte", "IE Sur"],
  },
  {
    id: 10,
    anio: 2027,
    receptor_id: 5,
    receptor: "ITI",
    estado: "EN_POSTULACION",
    cierre_postulacion: "2027-02-12",
    publicacion: "2027-02-17",
    limite_matricula: "2027-03-05",
    origenes: ["IE Central", "IE Norte"],
  },
  {
    id: 11,
    anio: 2027,
    receptor_id: 6,
    receptor: "ITC",
    estado: "EN_POSTULACION",
    cierre_postulacion: "2027-02-14",
    publicacion: "2027-02-19",
    limite_matricula: "2027-03-10",
    origenes: ["IE Central", "IE Sur"],
  },
]

const CUPOS: Cupo[] = [
  { id: 21, convocatoria_id: 2, sede: "IE Central", jornada: "Tarde", grado: "Décimo", especialidad_id: 1, especialidad: "Sistemas", cupo: 8, seleccionados: 3 },
  { id: 22, convocatoria_id: 2, sede: "IE Central", jornada: "Tarde", grado: "Décimo", especialidad_id: 2, especialidad: "Contabilidad", cupo: 6, seleccionados: 1 },
  { id: 101, convocatoria_id: 10, sede: "Sede Principal", jornada: "Tarde", grado: "Décimo", especialidad_id: 3, especialidad: "Electricidad", cupo: 8, seleccionados: 5 },
  { id: 102, convocatoria_id: 10, sede: "Sede Principal", jornada: "Tarde", grado: "Décimo", especialidad_id: 1, especialidad: "Sistemas", cupo: 6, seleccionados: 6 },
  { id: 111, convocatoria_id: 11, sede: "Sede Principal", jornada: "Tarde", grado: "Décimo", especialidad_id: 2, especialidad: "Contabilidad", cupo: 10, seleccionados: 0 },
  { id: 112, convocatoria_id: 11, sede: "Sede Principal", jornada: "Tarde", grado: "Décimo", especialidad_id: 1, especialidad: "Sistemas", cupo: 6, seleccionados: 0 },
]

interface OpcionMock {
  id: number
  cupo_id: number
  estado: EstadoOpcion
  continuidad: boolean
  sorteo: string | null
  motivo_descarte: string | null
  matricula_complementaria_id: number | null
}

interface Post {
  id: number
  numero: string
  estudiante: string
  documento: string
  matricula_principal_id: number
  origen: string
  jornada_principal: string
  grado_principal: string
  grupo_principal: string
  estado: EstadoPost
  opciones: OpcionMock[]
  motivo_anulacion: string | null
  autorizacion: boolean
  registro: string
}

let nextOpcion = 1000
const op = (cupo_id: number, estado: EstadoOpcion, extra: Partial<OpcionMock> = {}): OpcionMock => ({
  id: nextOpcion++,
  cupo_id,
  estado,
  continuidad: false,
  sorteo: null,
  motivo_descarte: null,
  matricula_complementaria_id: null,
  ...extra,
})

const post = (p: Omit<Post, "registro" | "motivo_anulacion" | "autorizacion"> & Partial<Post>): Post => ({
  registro: "2027-02-03T09:15",
  motivo_anulacion: null,
  autorizacion: true,
  ...p,
})

const postulaciones: Post[] = [
  post({ id: 1, numero: "0031", estudiante: "Valeria Duarte León", documento: "TI 1101234567", matricula_principal_id: 9001, origen: "IE Sur", jornada_principal: "Mañana", grado_principal: "Décimo", grupo_principal: "10°A", estado: "MATRICULADA", opciones: [op(21, "ADSCRITO", { sorteo: "004", matricula_complementaria_id: 9101 }), op(22, "DESCARTADA", { motivo_descarte: "Seleccionada en otra opción" })] }),
  post({ id: 2, numero: "0012", estudiante: "Camilo Andrés Rueda Pinto", documento: "TI 1098123456", matricula_principal_id: 9002, origen: "IE Norte", jornada_principal: "Mañana", grado_principal: "Décimo", grupo_principal: "10°B", estado: "SELECCIONADA", opciones: [op(21, "REGISTRADO", { sorteo: "011", continuidad: true })] }),
  post({ id: 3, numero: "0047", estudiante: "Sara Lucía Prada Gómez", documento: "TI 1101239876", matricula_principal_id: 9003, origen: "IE Central", jornada_principal: "Mañana", grado_principal: "Décimo", grupo_principal: "10°B", estado: "POSTULADA", opciones: [op(111, "INSCRITO"), op(101, "INSCRITO"), op(112, "INSCRITO")] }),
  post({ id: 4, numero: "0062", estudiante: "Mateo Camacho Díaz", documento: "TI 1101240011", matricula_principal_id: 9004, origen: "IE Central", jornada_principal: "Mañana", grado_principal: "Décimo", grupo_principal: "10°C", estado: "EN_LISTA_ESPERA", registro: "2027-02-04T08:14", opciones: [op(102, "EN_LISTA_ESPERA"), op(101, "INSCRITO", { continuidad: true })] }),
  post({ id: 5, numero: "0019", estudiante: "Laura Sofía Niño Ardila", documento: "TI 1101231122", matricula_principal_id: 9005, origen: "IE Sur", jornada_principal: "Mañana", grado_principal: "Décimo", grupo_principal: "10°A", estado: "ANULADA", motivo_anulacion: "Solicitud del acudiente", opciones: [op(22, "DESCARTADA", { motivo_descarte: "Postulación anulada" })] }),
  post({ id: 6, numero: "0055", estudiante: "Andrés Felipe Pinto Rey", documento: "TI 1101244455", matricula_principal_id: 9006, origen: "IE Central", jornada_principal: "Mañana", grado_principal: "Décimo", grupo_principal: "10°A", estado: "POSTULADA", autorizacion: true, opciones: [op(101, "INSCRITO")] }),
  post({ id: 7, numero: "0071", estudiante: "María Paula Suárez Rey", documento: "TI 1101247788", matricula_principal_id: 9007, origen: "IE Norte", jornada_principal: "Mañana", grado_principal: "Décimo", grupo_principal: "10°B", estado: "EN_LISTA_ESPERA", opciones: [op(21, "EN_LISTA_ESPERA", { sorteo: "030" }), op(22, "NO_SELECCIONADA")] }),
]

let nextId = 100
let nextNumero = 90

const convDe = (cupoId: number) => {
  const cupo = CUPOS.find((c) => c.id === cupoId)!
  return { cupo, conv: CONVOCATORIAS.find((c) => c.id === cupo.convocatoria_id)! }
}

const enEsperaDe = (cupoId: number) =>
  postulaciones.flatMap((p) => p.opciones).filter((o) => o.cupo_id === cupoId && o.estado === "EN_LISTA_ESPERA")

/** Seleccionada o Matriculada: la que define la especialidad. */
const seleccionadaDe = (p: Post) => p.opciones.find((o) => o.estado === "REGISTRADO" || o.estado === "ADSCRITO") ?? null

function opcionRow(o: OpcionMock, orden: number) {
  const { cupo, conv } = convDe(o.cupo_id)
  return {
    id: o.id,
    orden,
    convocatoria_id: conv.id,
    convocatoria_anio: conv.anio,
    estado_convocatoria: conv.estado,
    cierre_postulacion: conv.cierre_postulacion,
    publicacion: conv.publicacion,
    limite_matricula: conv.limite_matricula,
    receptor_id: conv.receptor_id,
    receptor: conv.receptor,
    es_receptor: MIOS.includes(conv.receptor),
    cupo_id: cupo.id,
    sede: cupo.sede,
    jornada: cupo.jornada,
    grado: cupo.grado,
    especialidad_id: cupo.especialidad_id,
    especialidad: cupo.especialidad,
    estado: o.estado,
    continuidad: o.continuidad,
    sorteo: o.sorteo,
    autorizacion_pendiente: false,
    posicion: o.estado === "EN_LISTA_ESPERA" ? enEsperaDe(o.cupo_id).indexOf(o) + 1 : null,
    motivo_descarte: o.motivo_descarte,
    matricula_complementaria_id: o.matricula_complementaria_id,
  }
}

function toRow(p: Post) {
  const opciones = p.opciones.map((o, i) => opcionRow(o, i + 1))
  const sel = seleccionadaDe(p)
  return {
    id: p.id,
    numero: p.numero,
    estudiante: p.estudiante,
    documento: p.documento,
    matricula_principal_id: p.matricula_principal_id,
    principal: `${p.origen} · ${p.jornada_principal} · ${p.grupo_principal}`,
    jornada_principal: p.jornada_principal,
    grado_principal: p.grado_principal,
    origen: p.origen,
    es_origen: MIOS.includes(p.origen),
    es_receptor: opciones.some((o) => o.es_receptor),
    estado: p.estado,
    autorizacion: p.autorizacion,
    motivo_anulacion: p.motivo_anulacion,
    registro: p.registro,
    en_postulacion: opciones.some((o) => o.estado_convocatoria === "EN_POSTULACION"),
    opcion_seleccionada_id: sel?.id ?? null,
    matricula_complementaria_id: sel?.matricula_complementaria_id ?? null,
    // El back la manda como JSON.
    opciones: JSON.stringify(opciones),
  }
}

/* Lecturas */

export function listarPostulaciones(f: { search: string | null; convocatoria: number | null; grado: string | null; pageIndex: number; pageSize: number }) {
  const q = f.search?.toLowerCase().trim() ?? ""
  const filas = postulaciones
    .filter((p) => f.convocatoria == null || p.opciones.some((o) => convDe(o.cupo_id).conv.id === f.convocatoria))
    .map(toRow)
    .filter((r) => r.es_origen || r.es_receptor)
    .filter((r) => !q || [r.numero, r.estudiante, r.documento].some((v) => v.toLowerCase().includes(q)))
    .filter((r) => !f.grado || r.grado_principal === f.grado)
  return filas.slice(f.pageIndex * f.pageSize, (f.pageIndex + 1) * f.pageSize).map((r) => ({ ...r, total_count: filas.length }))
}

export const obtenerPostulacion = (id: number) => {
  const p = postulaciones.find((x) => x.id === id)
  return p ? toRow(p) : null
}

const gradoNombre = (n: number) => ({ 10: "Décimo", 11: "Undécimo" })[n] ?? `Grado ${n}`

/** Principales Cursando del origen, sin complementaria ni postulación vigente. */
export function principalesPostulables(q: string) {
  const vigentes = new Set(postulaciones.filter((p) => !["ANULADA", "NO_SELECCIONADA"].includes(p.estado)).map((p) => p.matricula_principal_id))
  const t = q.toLowerCase().trim()
  return matriculaDb
    .filter((m) => m.status === "Cursando" && tipoDe(Number(m.id)) === "PRINCIPAL" && !complementariaDe(Number(m.id)))
    .filter((m) => !vigentes.has(Number(m.id)))
    .filter((m) => !t || `${m.firstName} ${m.lastName} ${m.documentNumber}`.toLowerCase().includes(t))
    .slice(0, 20)
    .map((m) => ({
      id: Number(m.id),
      label: `${m.firstName} ${m.lastName} · TI ${m.documentNumber} · ${m.group} · ${m.shift}`,
    }))
}

export function opcionesPostulacion(matriculaId: number) {
  const m = matriculaDb.find((x) => Number(x.id) === matriculaId)
  const jornada = m?.shift ?? "Mañana"
  return {
    convocatorias: CONVOCATORIAS.filter((c) => c.estado === "EN_POSTULACION" && c.origenes.includes("IE Central")).map((c) => {
      const cupos = CUPOS.filter((x) => x.convocatoria_id === c.id && x.jornada !== jornada)
      return {
        id: c.id,
        receptor_id: c.receptor_id,
        receptor: c.receptor,
        cierre_postulacion: c.cierre_postulacion,
        publicacion: c.publicacion,
        limite_matricula: c.limite_matricula,
        especialidades: [...new Set(cupos.map((x) => x.especialidad_id))].map((id) => ({ id, nombre: ESPECIALIDAD[id], ficha: FICHAS[id] })),
        cupos: cupos.map((x) => ({
          id: x.id,
          label: `${x.sede} · ${x.jornada} · ${m ? gradoNombre(m.grade) : x.grado} · ${x.especialidad}`,
          especialidad_id: x.especialidad_id,
          cupo: x.cupo,
          disponibles: Math.max(0, x.cupo - x.seleccionados),
          en_espera: enEsperaDe(x.id).length,
          // Ya cursaba esa especialidad por adscripción el año anterior.
          continuidad: x.especialidad_id === (matriculaId % 3 === 0 ? 3 : 1) && x.grado === "Undécimo",
        })),
      }
    }),
    especialidad_principal_id: matriculaId % 3 === 0 ? 3 : 1,
  }
}

/* Escrituras */

type Res<T> = { error: string; status: number } | { data: T }

function validarCupos(cupos: number[]): string | null {
  if (!Array.isArray(cupos) || cupos.length < 1 || cupos.length > 3) return "Elija de 1 a 3 opciones de especialidad."
  if (new Set(cupos).size !== cupos.length) return "No repita un cupo en dos opciones."
  if (cupos.some((id) => !CUPOS.some((c) => c.id === id))) return "Uno de los cupos no existe."
  return null
}

export function postular(b: { FK_MATRICULA: number; FK_CUPOS: number[]; AUTORIZACION: "S" | "N" }): Res<{ pk_postulacion: number; numero: string; estado: string }> {
  if (b.AUTORIZACION !== "S") return { error: "Marque la autorización de tratamiento de datos.", status: 400 }
  const invalido = validarCupos(b.FK_CUPOS)
  if (invalido) return { error: invalido, status: 400 }
  const m = matriculaDb.find((x) => Number(x.id) === b.FK_MATRICULA)
  if (!m) return { error: "No se encontró la matrícula principal.", status: 404 }
  const existente = postulaciones.find((p) => p.matricula_principal_id === b.FK_MATRICULA && !["ANULADA", "NO_SELECCIONADA"].includes(p.estado))
  if (existente) return { error: `${m.firstName} ${m.lastName} ya tiene la postulación ${existente.numero} vigente este año.`, status: 409 }
  const p = post({
    id: nextId++,
    numero: String(nextNumero++).padStart(4, "0"),
    estudiante: `${m.firstName} ${m.lastName}`,
    documento: `TI ${m.documentNumber}`,
    matricula_principal_id: Number(m.id),
    origen: "IE Central",
    jornada_principal: m.shift,
    grado_principal: gradoNombre(m.grade),
    grupo_principal: m.group,
    estado: "POSTULADA",
    opciones: b.FK_CUPOS.map((id) => op(id, "INSCRITO")),
    registro: new Date().toISOString().slice(0, 16),
  })
  postulaciones.unshift(p)
  return { data: { pk_postulacion: p.id, numero: p.numero, estado: p.estado } }
}

const buscar = (id: number) => postulaciones.find((p) => p.id === id)

export function editarOpciones(id: number, cupos: number[]): Res<{ estado: string }> {
  const p = buscar(id)
  if (!p) return { error: "No se encontró la postulación.", status: 404 }
  if (p.estado !== "POSTULADA" && p.estado !== "EN_LISTA_ESPERA") return { error: "Las opciones de esta postulación ya no se pueden editar.", status: 409 }
  const invalido = validarCupos(cupos)
  if (invalido) return { error: invalido, status: 400 }
  // Conserva el estado de las opciones que siguen; las nuevas entran Pendientes.
  p.opciones = cupos.map((cupoId) => p.opciones.find((o) => o.cupo_id === cupoId) ?? op(cupoId, "INSCRITO"))
  p.estado = p.opciones.some((o) => o.estado === "EN_LISTA_ESPERA") ? "EN_LISTA_ESPERA" : "POSTULADA"
  return { data: { estado: p.estado } }
}

export function anular(id: number, motivo: string): Res<null> {
  const p = buscar(id)
  if (!p) return { error: "No se encontró la postulación.", status: 404 }
  if (!["POSTULADA", "EN_LISTA_ESPERA", "SELECCIONADA"].includes(p.estado)) return { error: "Esta postulación ya no se puede anular.", status: 409 }
  for (const o of p.opciones) {
    if (o.estado === "REGISTRADO") convDe(o.cupo_id).cupo.seleccionados--
    o.estado = "DESCARTADA"
    o.motivo_descarte = "Postulación anulada"
  }
  p.estado = "ANULADA"
  p.motivo_anulacion = motivo
  return { data: null }
}

export function previaMatricula(id: number) {
  const p = buscar(id)
  const sel = p ? seleccionadaDe(p) : null
  if (!p || !sel) return { error: "La postulación no tiene una opción seleccionada.", status: 409 as const }
  const { cupo, conv } = convDe(sel.cupo_id)
  const letra = cupo.jornada.charAt(0)
  return {
    data: {
      sede: cupo.sede,
      periodo: `${conv.anio} · ${cupo.jornada} · Anual · Ciclo 1`,
      grado: cupo.grado,
      especialidad: cupo.especialidad,
      grupos: [1, 2].map((n) => ({ id: sel.cupo_id * 10 + n, codigo: `10°${letra}${n}`, cupo: 35, libres: n === 1 ? 7 : 2 })),
    },
  }
}

export function matricular(id: number): Res<{ pk_matricula: number }> {
  const p = buscar(id)
  const sel = p ? seleccionadaDe(p) : null
  if (!p || p.estado !== "SELECCIONADA" || !sel) return { error: "Solo se matricula una postulación Seleccionada.", status: 409 }
  sel.estado = "ADSCRITO"
  sel.matricula_complementaria_id = 9100 + p.id
  p.estado = "MATRICULADA"
  return { data: { pk_matricula: sel.matricula_complementaria_id } }
}

/* Cambiar de especialidad una complementaria (Regla 80). */

const porComplementaria = (matriculaId: number) =>
  postulaciones.flatMap((p) => p.opciones.map((o) => ({ p, o }))).find((x) => x.o.matricula_complementaria_id === matriculaId)

export function previaEspecialidad(matriculaId: number) {
  const x = porComplementaria(matriculaId)
  const actual = x ? convDe(x.o.cupo_id).cupo : null
  const nombre = actual?.especialidad ?? "Sistemas"
  const grupos = (base: number) => [
    { id: base + 1, codigo: "10°T1", cupo: 35, libres: 4 },
    { id: base + 2, codigo: "10°T2", cupo: 35, libres: 7 },
  ]
  return {
    actual: actual ? `${nombre} · ${actual.sede} · ${actual.jornada} · ${actual.grado} · 10°T1` : "Sistemas · IE Central · Mañana · Décimo · 10°A",
    especialidad_actual: nombre,
    origen: x?.p.origen ?? null,
    especialidades: Object.entries(ESPECIALIDAD)
      .filter(([, n]) => n !== nombre)
      .map(([id, n]) => ({ id: Number(id), nombre: n, grupos: grupos(Number(id) * 100) })),
  }
}

export function cambiarEspecialidad(matriculaId: number, especialidadId: number): Res<null> {
  // Pk múltiplo de 5: ya tiene resultados en la especialidad anterior.
  if (matriculaId % 5 === 0) return { error: "No se puede cambiar: ya tiene resultados registrados en Sistemas.", status: 409 }
  const x = porComplementaria(matriculaId)
  if (x) {
    const nuevo = CUPOS.find((c) => c.convocatoria_id === convDe(x.o.cupo_id).conv.id && c.especialidad_id === especialidadId)
    if (nuevo) x.o.cupo_id = nuevo.id
  }
  return { data: null }
}
