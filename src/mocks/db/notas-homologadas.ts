import type {
  RawNotaHomologada,
  RawOrigenNota,
  RawSnapshot,
} from "@/features/coverage/matricula/api/query/use-notas-homologadas"
import type { RawSnapshotPendiente } from "@/features/coverage/matricula/api/query/use-snapshot-pendiente"

// Snapshots por matrícula con la forma de fn_matricula_notas_homologadas_listar.
// Dos cambios en el año, encadenados: el más reciente primero. En memoria: recargar resetea.

const ESCALA: RawSnapshot["escala"] = {
  min: 1,
  max: 5,
  desempenos: [
    { nombre: "Bajo", desde: 1, hasta: 2.9 },
    { nombre: "Básico", desde: 3, hasta: 3.9 },
    { nombre: "Alto", desde: 4, hasta: 4.5 },
    { nombre: "Superior", desde: 4.6, hasta: 5 },
  ],
}

export const valoracionDe = (nota: number, escala = ESCALA) =>
  escala.desempenos.find((d) => nota >= d.desde && nota <= d.hasta + 0.049)?.nombre ?? ""

let siguienteId = 100

function nota(asignatura: string, periodo: string, valor: number | null, extra: Partial<RawNotaHomologada> = {}): RawNotaHomologada {
  return {
    pk_tmatricula_nota_homologada: siguienteId++,
    asignatura,
    periodo,
    tipo: valor == null ? "PENDIENTE" : "DEFINITIVA",
    nota: valor,
    nota_original: null,
    valoracion: valor == null ? null : valoracionDe(valor),
    porcentaje_cursado: null,
    corregida: false,
    ...extra,
  }
}

function semilla(): RawSnapshot[] {
  return [
    {
      pk_tmatricula_snapshot: 2,
      motivo: "Cambio de sede y jornada",
      fecha: "2027-05-14",
      grupo_origen: "6°A",
      institucion_origen: "IE Central",
      jornada_origen: "Mañana",
      responsable_ensenanza: "Jorge Ardila",
      grupo_actual: "6°C · Sede 2 · Tarde",
      confirmado_por: "Martha Pardo (Rectora)",
      fallas: 3,
      escala: ESCALA,
      notas: [
        nota("Matemáticas", "P1", 3.8),
        nota("Matemáticas", "P2", 4.2),
        nota("Matemáticas", "P3", 4.0, { tipo: "PARCIAL", porcentaje_cursado: 30 }),
        nota("Inglés", "P1", 4.6),
        nota("Inglés", "P2", 3.5, { nota_original: 2.5, corregida: true }),
        nota("Emprendimiento", "P1 y P2", null),
      ],
    },
    {
      pk_tmatricula_snapshot: 1,
      motivo: "Cambio de grupo",
      fecha: "2027-03-02",
      grupo_origen: "6°B",
      institucion_origen: "IE Central",
      jornada_origen: "Mañana",
      responsable_ensenanza: "Lucía Rangel",
      grupo_actual: "6°A · Sede principal · Mañana",
      confirmado_por: "Martha Pardo (Rectora)",
      fallas: 1,
      escala: ESCALA,
      notas: [nota("Matemáticas", "P1", 3.6, { tipo: "PARCIAL", porcentaje_cursado: 60 })],
    },
  ]
}

const porMatricula = new Map<string, RawSnapshot[]>()

export function snapshotsDe(matriculaId: string) {
  let s = porMatricula.get(matriculaId)
  if (!s) {
    s = semilla()
    porMatricula.set(matriculaId, s)
  }
  return s
}

function buscarNota(matriculaId: string, notaId: number) {
  for (const s of snapshotsDe(matriculaId)) {
    const n = s.notas.find((x) => x.pk_tmatricula_nota_homologada === notaId)
    if (n) return { snapshot: s, nota: n }
  }
  return null
}

const ACTIVIDADES: Record<string, RawOrigenNota["actividades"]> = {
  Matemáticas: [
    { nombre: "Taller de fracciones y decimales", fecha: "2027-04-08", nota: 4 },
    { nombre: "Evaluación escrita — unidad 2", fecha: "2027-04-22", nota: 4.5 },
    { nombre: "Proyecto de aula: presupuesto familiar", fecha: "2027-05-05", nota: 4.1 },
    { nombre: "Autoevaluación", fecha: "2027-05-12", nota: 4.3 },
  ],
  Inglés: [
    { nombre: "Listening quiz", fecha: "2027-04-10", nota: 3.4 },
    { nombre: "Oral presentation", fecha: "2027-04-29", nota: 2 },
    { nombre: "Autoevaluación", fecha: "2027-05-12", nota: 2.1 },
  ],
}

export function origenDe(matriculaId: string, notaId: number): RawOrigenNota | null {
  const hallada = buscarNota(matriculaId, notaId)
  if (!hallada || hallada.nota.nota == null) return null
  const { snapshot: s, nota: n } = hallada
  const homologada = n.nota_original ?? n.nota ?? 0
  return {
    grupo_origen: `${s.grupo_origen} · ${s.institucion_origen} · ${s.jornada_origen}`,
    responsable_ensenanza: s.responsable_ensenanza,
    snapshot: `${s.motivo} · ${s.fecha.split("-").reverse().join("/")}`,
    nota: homologada,
    valoracion: valoracionDe(homologada, s.escala),
    porcentaje_cursado: n.porcentaje_cursado,
    actividades: ACTIVIDADES[n.asignatura] ?? [],
  }
}

/** Devuelve el mensaje de error, o null si corrigió. */
export function corregirNota(matriculaId: string, notaId: number, valor: number): string | null {
  const hallada = buscarNota(matriculaId, notaId)
  if (!hallada) return "No se encontró la nota homologada."
  const { snapshot: s, nota: n } = hallada
  if (n.nota == null) return "Una nota pendiente por nivelación no se corrige."
  if (valor < s.escala.min || valor > s.escala.max) return `La nota debe estar entre ${s.escala.min} y ${s.escala.max}.`
  if (valor === n.nota) return "La nota corregida es igual a la actual."
  n.nota_original ??= n.nota
  n.nota = valor
  n.valoracion = valoracionDe(valor, s.escala)
  n.corregida = true
  return null
}

// Traslado guardado con «No homologar por ahora» (Sección 4.5): uno por matrícula hasta homologarlo.
const PERIODOS_DESTINO = [
  { id: 1, nombre: "P1" },
  { id: 2, nombre: "P2" },
  { id: 3, nombre: "P3" },
  { id: 4, nombre: "P4" },
]
const ASIGNATURAS_DESTINO = [
  { id: 10, nombre: "Matemáticas" },
  { id: 11, nombre: "Lengua castellana" },
  { id: 12, nombre: "Ciencias naturales" },
  { id: 13, nombre: "Tecnología e informática" },
]
const NOTAS_ORIGEN: Record<string, number> = { Matemáticas: 4.1, Lenguaje: 3.7, "Tecnología e informática": 4.4 }

const pendientes = new Map<string, RawSnapshotPendiente | null>()

// Llegaron por traslado sin homologar: una de cada ocho del listado y las que se
// crean en la sesión (el alta pregunta si homologar).
const llegoPorTraslado = (matriculaId: string) => Number(matriculaId) % 8 === 0 || Number(matriculaId) >= 10260

export function tieneSnapshotPendiente(matriculaId: string) {
  return snapshotPendienteDe(matriculaId) != null
}

export function snapshotPendienteDe(matriculaId: string): RawSnapshotPendiente | null {
  if (!llegoPorTraslado(matriculaId)) return null
  if (!pendientes.has(matriculaId)) {
    pendientes.set(matriculaId, {
      pk_tmatricula_snapshot: 50,
      motivo: "Traslado desde IE Santa Ana",
      fecha: "2027-05-03",
      grupo_origen: "5°A",
      institucion_origen: "IE Santa Ana",
      escala_distinta: true,
      periodos_pendientes: ["P1", "P2"],
      asignaturas_plan: ASIGNATURAS_DESTINO.length,
      periodos_destino: PERIODOS_DESTINO,
      asignaturas_destino: ASIGNATURAS_DESTINO,
      periodos: [
        { origen: "P1", destino: 1 },
        { origen: "P2", destino: 2 },
      ],
      asignaturas: [
        { origen: "Matemáticas", destino: 10 },
        { origen: "Lenguaje", destino: 11 },
        { origen: "Tecnología e informática", destino: null },
      ],
    })
  }
  return pendientes.get(matriculaId) ?? null
}

/** Pasa el traslado a la lista de snapshots homologados; devuelve el error o el resultado. */
export function homologarSnapshot(
  matriculaId: string,
  body: { AUTORIZACION?: string; PERIODOS?: { origen: string; destino: number }[]; ASIGNATURAS?: { origen: string; destino: number | null }[] },
): { error: string } | { notasHomologadas: number; pendientes: number } {
  const s = snapshotPendienteDe(matriculaId)
  if (!s) return { error: "Las notas de este snapshot ya se homologaron." }
  if (body.AUTORIZACION !== "S") return { error: "Confirme que el acudiente autorizó el tratamiento de los datos." }
  const periodos = body.PERIODOS ?? []
  const asignaturas = (body.ASIGNATURAS ?? []).filter((a) => a.destino != null)
  const nombreAsig = (id: number | null) => ASIGNATURAS_DESTINO.find((a) => a.id === id)?.nombre ?? ""
  const nombrePer = (id: number) => PERIODOS_DESTINO.find((p) => p.id === id)?.nombre ?? ""
  const notas: RawNotaHomologada[] = []
  for (const a of asignaturas) {
    for (const p of periodos) {
      const valor = Math.round((NOTAS_ORIGEN[a.origen] ?? 3.5) * 10) / 10
      notas.push(nota(nombreAsig(a.destino), nombrePer(p.destino), valor))
    }
  }
  const sinEquivalente = ASIGNATURAS_DESTINO.filter((d) => !asignaturas.some((a) => a.destino === d.id))
  for (const d of sinEquivalente) notas.push(nota(d.nombre, periodos.map((p) => nombrePer(p.destino)).join(" y "), null))
  snapshotsDe(matriculaId).unshift({
    pk_tmatricula_snapshot: s.pk_tmatricula_snapshot,
    motivo: s.motivo,
    fecha: s.fecha,
    grupo_origen: s.grupo_origen,
    institucion_origen: s.institucion_origen,
    jornada_origen: "Mañana",
    responsable_ensenanza: "",
    grupo_actual: "5°B · Sede principal · Mañana",
    confirmado_por: "Usuario de prueba",
    fallas: 0,
    escala: ESCALA,
    notas,
  })
  pendientes.set(matriculaId, null)
  return { notasHomologadas: notas.length - sinEquivalente.length, pendientes: sinEquivalente.length }
}
