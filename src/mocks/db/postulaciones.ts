import { matriculaDb } from "@/mocks/db/matricula"
import { complementariaDe, tipoDe } from "@/mocks/db/complementaria"

// Postulaciones de matrícula complementaria (Sección 2.16.2), en snake_case
// como las mandaría el back (tarea 13 de pendientes-back.md).
// El usuario del mock trabaja en IE Central y en ITI, así se ven las dos caras:
// - Origen (IE Central postula a ITI e ITC): cambiar cupo, anular.
// - Que recibe (IE Central e ITI): agregar matrícula, liberar cupo, cambiar especialidad.
// ITI usa la forma Por el establecimiento de origen con lista de espera; ITC, Abierta.

const MIOS = ["IE Central", "ITI"]

type EstadoPost = "INSCRITO" | "EN_LISTA_ESPERA" | "REGISTRADO" | "ADSCRITO" | "NO_SELECCIONADA" | "DESCARTADA" | "RETIRADA" | "ANULADA"

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
  forma: "ABIERTA" | "ORIGEN"
  lista_espera: boolean
  estado: "EN_POSTULACION" | "EN_SELECCION" | "PUBLICADA"
  cierre_postulacion: string
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
    forma: "ABIERTA",
    lista_espera: false,
    estado: "EN_SELECCION",
    cierre_postulacion: "2027-02-15",
    limite_matricula: "2027-03-05",
    origenes: ["IE Norte", "IE Sur"],
  },
  {
    id: 10,
    anio: 2027,
    receptor_id: 5,
    receptor: "ITI",
    forma: "ORIGEN",
    lista_espera: true,
    estado: "EN_POSTULACION",
    cierre_postulacion: "2027-02-12",
    limite_matricula: "2027-03-05",
    origenes: ["IE Central", "IE Norte"],
  },
  {
    id: 11,
    anio: 2027,
    receptor_id: 6,
    receptor: "ITC",
    forma: "ABIERTA",
    lista_espera: false,
    estado: "EN_POSTULACION",
    cierre_postulacion: "2027-02-14",
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
  cupo_id: number
  estado: EstadoPost
  /** El de la opción cuando difiere (Anulada → Descartada). */
  estado_opcion?: EstadoPost
  sorteo: string | null
  motivo_descarte: string | null
  motivo_anulacion: string | null
  autorizacion: boolean
  registro: string
  matricula_complementaria_id: number | null
}

const post = (p: Omit<Post, "registro" | "sorteo" | "motivo_descarte" | "motivo_anulacion" | "matricula_complementaria_id" | "autorizacion"> & Partial<Post>): Post => ({
  registro: "2027-02-03T09:15",
  sorteo: null,
  motivo_descarte: null,
  motivo_anulacion: null,
  autorizacion: true,
  matricula_complementaria_id: null,
  ...p,
})

const postulaciones: Post[] = [
  post({ id: 1, numero: "0031", estudiante: "Valeria Duarte León", documento: "TI 1101234567", matricula_principal_id: 9001, origen: "IE Sur", jornada_principal: "Mañana", grado_principal: "Décimo", grupo_principal: "10°A", cupo_id: 21, estado: "ADSCRITO", sorteo: "004", matricula_complementaria_id: 9101 }),
  post({ id: 2, numero: "0012", estudiante: "Camilo Andrés Rueda Pinto", documento: "TI 1098123456", matricula_principal_id: 9002, origen: "IE Norte", jornada_principal: "Mañana", grado_principal: "Décimo", grupo_principal: "10°B", cupo_id: 21, estado: "REGISTRADO", sorteo: "011" }),
  post({ id: 3, numero: "0047", estudiante: "Sara Lucía Prada Gómez", documento: "TI 1101239876", matricula_principal_id: 9003, origen: "IE Central", jornada_principal: "Mañana", grado_principal: "Décimo", grupo_principal: "10°B", cupo_id: 111, estado: "INSCRITO", sorteo: null }),
  post({ id: 4, numero: "0062", estudiante: "Mateo Camacho Díaz", documento: "TI 1101240011", matricula_principal_id: 9004, origen: "IE Central", jornada_principal: "Mañana", grado_principal: "Décimo", grupo_principal: "10°C", cupo_id: 102, estado: "EN_LISTA_ESPERA", registro: "2027-02-04T08:14" }),
  post({ id: 5, numero: "0019", estudiante: "Laura Sofía Niño Ardila", documento: "TI 1101231122", matricula_principal_id: 9005, origen: "IE Sur", jornada_principal: "Mañana", grado_principal: "Décimo", grupo_principal: "10°A", cupo_id: 22, estado: "ANULADA", estado_opcion: "DESCARTADA", motivo_anulacion: "Solicitud del acudiente", motivo_descarte: "Postulación anulada" }),
  post({ id: 6, numero: "0055", estudiante: "Andrés Felipe Pinto Rey", documento: "TI 1101244455", matricula_principal_id: 9006, origen: "IE Central", jornada_principal: "Mañana", grado_principal: "Décimo", grupo_principal: "10°A", cupo_id: 101, estado: "REGISTRADO" }),
  post({ id: 7, numero: "0071", estudiante: "María Paula Suárez Rey", documento: "TI 1101247788", matricula_principal_id: 9007, origen: "IE Norte", jornada_principal: "Mañana", grado_principal: "Décimo", grupo_principal: "10°B", cupo_id: 21, estado: "EN_LISTA_ESPERA", sorteo: "030" }),
]

let nextId = 100
let nextNumero = 90

const convDe = (cupoId: number) => {
  const cupo = CUPOS.find((c) => c.id === cupoId)!
  return { cupo, conv: CONVOCATORIAS.find((c) => c.id === cupo.convocatoria_id)! }
}

const enEsperaDe = (cupoId: number) => postulaciones.filter((p) => p.cupo_id === cupoId && p.estado === "EN_LISTA_ESPERA")

function toRow(p: Post) {
  const { cupo, conv } = convDe(p.cupo_id)
  const espera = enEsperaDe(p.cupo_id)
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
    es_receptor: MIOS.includes(conv.receptor),
    convocatoria_id: conv.id,
    convocatoria_anio: conv.anio,
    forma: conv.forma,
    lista_espera: conv.lista_espera,
    estado_convocatoria: conv.estado,
    cierre_postulacion: conv.cierre_postulacion,
    limite_matricula: conv.limite_matricula,
    receptor_id: conv.receptor_id,
    receptor: conv.receptor,
    cupo_id: cupo.id,
    sede: cupo.sede,
    jornada: cupo.jornada,
    grado: cupo.grado,
    especialidad_id: cupo.especialidad_id,
    especialidad: cupo.especialidad,
    estado_opcion: p.estado_opcion ?? p.estado,
    estado: p.estado,
    posicion: p.estado === "EN_LISTA_ESPERA" ? espera.indexOf(p) + 1 : null,
    sorteo: p.sorteo,
    motivo_descarte: p.motivo_descarte,
    autorizacion: p.autorizacion,
    motivo_anulacion: p.motivo_anulacion,
    registro: p.registro,
    matricula_complementaria_id: p.matricula_complementaria_id,
  }
}

/* Lecturas */

export function listarPostulaciones(f: { search: string | null; convocatoria: number | null; grado: string | null; pageIndex: number; pageSize: number }) {
  const q = f.search?.toLowerCase().trim() ?? ""
  const filas = postulaciones
    .map(toRow)
    .filter((r) => r.es_origen || r.es_receptor)
    .filter((r) => !q || [r.numero, r.estudiante, r.documento].some((v) => v.toLowerCase().includes(q)))
    .filter((r) => f.convocatoria == null || r.convocatoria_id === f.convocatoria)
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
        forma: c.forma,
        lista_espera: c.lista_espera,
        cierre_postulacion: c.cierre_postulacion,
        limite_matricula: c.limite_matricula,
        especialidades: [...new Set(cupos.map((x) => x.especialidad_id))].map((id) => ({ id, nombre: ESPECIALIDAD[id], ficha: FICHAS[id] })),
        cupos: cupos.map((x) => ({
          id: x.id,
          label: `${x.sede} · ${x.jornada} · ${m ? gradoNombre(m.grade) : x.grado} · ${x.especialidad}`,
          especialidad_id: x.especialidad_id,
          cupo: x.cupo,
          disponibles: Math.max(0, x.cupo - x.seleccionados),
          en_espera: enEsperaDe(x.id).length,
        })),
      }
    }),
    especialidad_principal_id: matriculaId % 3 === 0 ? 3 : 1,
  }
}

/* Escrituras */

type Res<T> = { error: string; status: number } | { data: T }

/** Opción en un cupo: con la forma por el origen nace Registrado o, sin cupo y con lista, En lista de espera. */
function ubicar(cupoId: number, listaEspera: boolean): Res<{ estado: EstadoPost }> {
  const { cupo, conv } = convDe(cupoId)
  if (conv.forma === "ABIERTA") return { data: { estado: "INSCRITO" } }
  // Mientras haya alguien en la lista, toda postulación nueva entra a la lista.
  const libre = cupo.cupo - cupo.seleccionados > 0 && enEsperaDe(cupoId).length === 0
  if (libre) {
    cupo.seleccionados++
    return { data: { estado: "REGISTRADO" } }
  }
  if (conv.lista_espera && listaEspera) return { data: { estado: "EN_LISTA_ESPERA" } }
  return { error: `No hay cupo libre en ${cupo.especialidad}.`, status: 409 }
}

export function postular(b: { FK_MATRICULA: number; FK_CUPO: number; AUTORIZACION: "S" | "N"; LISTA_ESPERA: "S" | "N" }): Res<{ pk_postulacion: number; numero: string; estado: string }> {
  const m = matriculaDb.find((x) => Number(x.id) === b.FK_MATRICULA)
  if (!m) return { error: "No se encontró la matrícula principal.", status: 404 }
  const existente = postulaciones.find((p) => p.matricula_principal_id === b.FK_MATRICULA && !["ANULADA", "NO_SELECCIONADA"].includes(p.estado))
  if (existente) return { error: `${m.firstName} ${m.lastName} ya tiene la postulación ${existente.numero} vigente este año.`, status: 409 }
  const r = ubicar(b.FK_CUPO, b.LISTA_ESPERA === "S")
  if ("error" in r) return r
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
    cupo_id: b.FK_CUPO,
    estado: r.data.estado,
    registro: new Date().toISOString().slice(0, 16),
    autorizacion: b.AUTORIZACION === "S",
  })
  postulaciones.unshift(p)
  return { data: { pk_postulacion: p.id, numero: p.numero, estado: p.estado } }
}

const buscar = (id: number) => postulaciones.find((p) => p.id === id)

export function cambiarCupo(id: number, cupoId: number, listaEspera: boolean): Res<{ estado: string; posicion: number | null }> {
  const p = buscar(id)
  if (!p) return { error: "No se encontró la postulación.", status: 404 }
  const { conv } = convDe(cupoId)
  if (conv.forma === "ORIGEN" && p.estado === "REGISTRADO") {
    // En un solo paso y solo si el nuevo tiene disponibles; si no, conserva el anterior.
    const nuevo = convDe(cupoId).cupo
    if (nuevo.cupo - nuevo.seleccionados <= 0) return { error: `No hay cupo libre en ${nuevo.especialidad}: la opción conserva su cupo.`, status: 409 }
    convDe(p.cupo_id).cupo.seleccionados--
    nuevo.seleccionados++
    p.cupo_id = cupoId
    return { data: { estado: p.estado, posicion: null } }
  }
  const r = ubicar(cupoId, listaEspera)
  if ("error" in r) return r
  p.cupo_id = cupoId
  p.estado = r.data.estado
  // En la lista entra al final, con la fecha y hora del cambio.
  p.registro = new Date().toISOString().slice(0, 16)
  if (p.estado === "EN_LISTA_ESPERA") {
    postulaciones.splice(postulaciones.indexOf(p), 1)
    postulaciones.push(p)
  }
  return { data: { estado: p.estado, posicion: p.estado === "EN_LISTA_ESPERA" ? enEsperaDe(cupoId).indexOf(p) + 1 : null } }
}

function liberarCupoDe(p: Post) {
  const { cupo, conv } = convDe(p.cupo_id)
  if (p.estado !== "REGISTRADO") return
  cupo.seleccionados--
  // Con lista de espera antes del cierre, el primero de la lista pasa solo a Registrado.
  const primero = enEsperaDe(p.cupo_id)[0]
  if (conv.forma === "ORIGEN" && conv.estado === "EN_POSTULACION" && primero) {
    primero.estado = "REGISTRADO"
    cupo.seleccionados++
  }
}

export function anular(id: number, motivo: string): Res<null> {
  const p = buscar(id)
  if (!p) return { error: "No se encontró la postulación.", status: 404 }
  if (!["INSCRITO", "EN_LISTA_ESPERA", "REGISTRADO"].includes(p.estado)) return { error: "Esta postulación ya no se puede anular.", status: 409 }
  liberarCupoDe(p)
  p.estado = "ANULADA"
  p.estado_opcion = "DESCARTADA"
  p.motivo_anulacion = motivo
  p.motivo_descarte = "Postulación anulada"
  return { data: null }
}

export function liberar(id: number): Res<null> {
  const p = buscar(id)
  if (!p || p.estado !== "REGISTRADO") return { error: "Solo se libera el cupo de una opción Registrado.", status: 409 }
  liberarCupoDe(p)
  p.estado = "DESCARTADA"
  p.motivo_descarte = "No se presentó"
  return { data: null }
}

export function previaMatricula(id: number) {
  const p = buscar(id)
  if (!p) return { error: "No se encontró la postulación.", status: 404 as const }
  const { cupo, conv } = convDe(p.cupo_id)
  const letra = cupo.jornada.charAt(0)
  return {
    data: {
      sede: cupo.sede,
      periodo: `${conv.anio} · ${cupo.jornada} · Anual · Ciclo 1`,
      grado: cupo.grado,
      especialidad: cupo.especialidad,
      grupos: [1, 2].map((n) => ({ id: p.cupo_id * 10 + n, codigo: `10°${letra}${n}`, cupo: 35, libres: n === 1 ? 7 : 2 })),
    },
  }
}

export function matricular(id: number): Res<{ pk_matricula: number }> {
  const p = buscar(id)
  if (!p || p.estado !== "REGISTRADO") return { error: "Solo se matricula una opción Registrado.", status: 409 }
  p.estado = "ADSCRITO"
  p.matricula_complementaria_id = 9100 + p.id
  return { data: { pk_matricula: p.matricula_complementaria_id } }
}

/* Cambiar de especialidad una complementaria (Regla 80). */

export function previaEspecialidad(matriculaId: number) {
  const p = postulaciones.find((x) => x.matricula_complementaria_id === matriculaId)
  const actual = p ? convDe(p.cupo_id).cupo : null
  const nombre = actual?.especialidad ?? "Sistemas"
  const grupos = (base: number) => [
    { id: base + 1, codigo: "10°T1", cupo: 35, libres: 4 },
    { id: base + 2, codigo: "10°T2", cupo: 35, libres: 7 },
  ]
  return {
    actual: actual ? `${nombre} · ${actual.sede} · ${actual.jornada} · ${actual.grado} · 10°T1` : "Sistemas · IE Central · Mañana · Décimo · 10°A",
    especialidad_actual: nombre,
    origen: p?.origen ?? null,
    especialidades: Object.entries(ESPECIALIDAD)
      .filter(([, n]) => n !== nombre)
      .map(([id, n]) => ({ id: Number(id), nombre: n, grupos: grupos(Number(id) * 100) })),
  }
}

export function cambiarEspecialidad(matriculaId: number, especialidadId: number): Res<null> {
  // Pk múltiplo de 5: ya tiene resultados en la especialidad anterior.
  if (matriculaId % 5 === 0) return { error: "No se puede cambiar: ya tiene resultados registrados en Sistemas.", status: 409 }
  const p = postulaciones.find((x) => x.matricula_complementaria_id === matriculaId)
  if (p) {
    const nuevo = CUPOS.find((c) => c.convocatoria_id === convDe(p.cupo_id).conv.id && c.especialidad_id === especialidadId)
    if (nuevo) p.cupo_id = nuevo.id
  }
  return { data: null }
}
