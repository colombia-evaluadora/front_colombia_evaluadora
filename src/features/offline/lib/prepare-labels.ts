/**
 * Nombre legible de una tarea de "Preparar" a partir de su query key, para
 * decir QUÉ no se pudo guardar ("Planeador › Planilla (grupo 12, periodo 3)")
 * en lugar de solo "No se pudo descargar 1 elemento". Función pura.
 */
import type { QueryKey } from "@tanstack/react-query"

const PALABRAS: Record<string, string> = {
  planeador: "Planeador",
  planilla: "Planilla",
  columnas: "columnas",
  calificaciones: "calificaciones",
  actividades: "Actividades",
  actividad: "Actividad",
  "actividades-mias": "Mis actividades",
  "actividades-calendario": "Calendario de actividades",
  "actividades-stats": "Resumen de actividades",
  unidades: "Unidades",
  unidad: "Unidad",
  asistencia: "Asistencia",
  calendario: "calendario",
  informes: "Informes",
  "informe-grupo": "Informe del grupo",
  "curricular-references": "Referentes curriculares",
  referente: "Referente",
  "referente-curricular": "Referente curricular",
  catalogo: "catálogo",
  catalogos: "Catálogos",
  archivo: "Archivo",
  chat: "Chat",
  "matriculas-grupo": "Estudiantes del grupo",
  "docente-grupos": "Mis grupos",
  "sedes-opciones": "Sedes",
  jornadas: "Jornadas",
  "periodos-evaluacion": "Periodos de evaluación",
}

const PARAMS: Record<string, string> = {
  grupoId: "grupo",
  grupo: "grupo",
  asignaturaId: "asignatura",
  periodoId: "periodo",
  sedeId: "sede",
  gradoId: "grado",
  mes: "mes",
  anio: "año",
  fecha: "fecha",
  id: "id",
}

function palabra(segmento: string): string {
  const conocida = PALABRAS[segmento]
  if (conocida) return conocida
  const limpio = segmento.replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

function resumenParams(value: Record<string, unknown>): string[] {
  const partes: string[] = []
  for (const [key, label] of Object.entries(PARAMS)) {
    const v = value[key]
    if (typeof v === "number" || (typeof v === "string" && v)) partes.push(`${label} ${v}`)
  }
  return partes
}

export function describePrepareKey(queryKey: QueryKey): string {
  const nombres: string[] = []
  const detalles: string[] = []
  for (const parte of queryKey) {
    if (typeof parte === "string") nombres.push(palabra(parte))
    else if (typeof parte === "number") detalles.push(String(parte))
    else if (parte && typeof parte === "object" && !Array.isArray(parte))
      detalles.push(...resumenParams(parte as Record<string, unknown>))
  }
  const nombre = nombres.length ? nombres.join(" › ") : "Dato"
  return detalles.length ? `${nombre} (${detalles.join(", ")})` : nombre
}

/** "No se pudo descargar 1 elemento" / "No se pudieron descargar N elementos". */
export function failedCountText(n: number): string {
  return n === 1 ? "No se pudo descargar 1 elemento." : `No se pudieron descargar ${n} elementos.`
}
