/**
 * Huella de la versión del servidor de una actividad/unidad (Fase 3,
 * D-F3-4). `TACTIVIDAD`/`TUNIDAD` no tienen columna de versión (BE-3B sigue
 * pendiente de aprobación del cambio de esquema), así que la concurrencia
 * optimista de una edición encolada compara una huella de los campos que el
 * docente edita: la que vio al abrir el formulario contra la del detalle
 * actual al sincronizar. Solo campos estables — nada derivado de la fecha de
 * hoy (`status`) ni conteos que cambian al calificar (eso lo cubre la regla
 * 37 aparte).
 */
import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

/** FNV-1a de 32 bits en hex: corto, determinista y suficiente para detectar cambios. */
export function hashString(value: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, "0")
}

const ordenados = (ids: number[] | undefined) => [...(ids ?? [])].sort((a, b) => a - b)

export function fingerprintActividad(a: Actividad): string {
  return hashString(
    JSON.stringify({
      nombre: a.nombre ?? "",
      descripcion: a.descripcion ?? "",
      tipo: a.tipo ?? "",
      fechaInicio: a.fechaInicio ?? "",
      fechaCierre: a.fechaCierre ?? "",
      esEvaluativa: Boolean(a.esEvaluativa),
      instrumento: a.instrumento ?? "",
      unidad: a.unidad?.id ?? 0,
      ponderacion: a.ponderacion ?? null,
      recursos: (a.recursos ?? []).map((r) => [r.tipo, r.archivoId ?? null, r.tipo === "Archivo" ? "" : r.url, r.descripcion]),
      adaptaciones: (a.adaptaciones ?? []).map((x) => [x.tipo, x.descripcion, x.aplicaA, ordenados(x.estudiantesIds)]),
      matriculas: a.asignarTodoElGrupo ? "todos" : ordenados(a.matriculasIds),
      evidencias: ordenados(a.evidenciasIds),
      criterios: ordenados(a.criteriosUnidadIds),
    }),
  )
}

export function fingerprintUnidad(u: UnidadTematica): string {
  return hashString(
    JSON.stringify({
      nombre: u.nombre ?? "",
      descripcion: u.descripcion ?? "",
      metodoCalculo: u.metodoCalculo ?? "",
      objetivos: u.objetivos ?? [],
      contenidos: (u.contenidos ?? []).map((c) => [c.titulo ?? "", c.descripcion]),
      gradoId: u.gradoId ?? null,
      asignaturaId: u.asignaturaId ?? null,
    }),
  )
}
