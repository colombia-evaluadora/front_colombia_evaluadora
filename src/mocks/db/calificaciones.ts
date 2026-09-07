import { faker } from "@faker-js/faker"

import type { Actividad } from "@/features/planeador/api/types/actividad"
import type {
  Asistencia,
  CalificacionEstudiante,
  EstadoAsistencia,
  Estudiante,
  NotaCriterio,
} from "@/features/planeador/api/types/calificacion"

/**
 * Calificaciones de cada actividad del Planeador.
 *
 * El backend real no existe —la tabla de calificaciones es nueva—, así que
 * para que la UI tenga algo que mostrar generamos en memoria:
 * - Una lista de ~35 estudiantes por (grado, grupo).
 * - Una asistencia por estudiante (la mayoría "asistió", algunas
 *   justificadas, un par sin calificar).
 * - Notas por criterio cuando la rúbrica los tiene, con un patrón
 *   determinista: el primer estudiante siempre tiene todo cargado y los
 *   siguientes se van escalonando para que se vean las dos columnas con
 *   valores y con el placeholder "Agregar".
 *
 * La generación usa la misma semilla que el resto de los seeds
 * (`faker.seed(20260825)`) para que las pruebas sean reproducibles.
 */

faker.seed(20260825)

const NOMBRES = [
  "SEBASTIÁN DAVID",
  "VALENTINA SOFÍA",
  "JUAN ESTEBAN",
  "MARIANA ALEJANDRA",
  "SAMUEL NICOLÁS",
  "ISABELLA CAMILA",
  "SANTIAGO JOSÉ",
  "SOFÍA",
  "MATÍAS",
  "EMILIA",
  "DANIEL",
  "LUCÍA",
  "TOMÁS",
  "VALERIA",
  "ANDRÉS",
  "CAMILA",
  "DIEGO",
  "NATALIA",
  "GABRIEL",
  "RENATA",
  "MARTÍN",
  "ANTONELLA",
  "FELIPE",
  "PAULA",
  "JOAQUÍN",
  "AMALIA",
  "NICOLÁS",
  "ELIANA",
  "ALEJANDRO",
  "JULIETA",
  "PABLO",
  "FLORENCIA",
  "AGUSTÍN",
  "MARIÁNGEL",
  "RAFAEL",
]

const APELLIDOS = [
  "JARAMILLO",
  "TORRES",
  "PÉREZ",
  "CASTILLO",
  "PATIÑO",
  "HERRERA",
  "GÓMEZ",
  "RAMÍREZ",
  "ORTEGA",
  "MORALES",
  "VARGAS",
  "RIVERA",
  "SALAZAR",
  "CÁRDENAS",
  "MEJÍA",
  "OSPINA",
  "RODRÍGUEZ",
  "GUTIÉRREZ",
  "QUINTERO",
  "MORENO",
  "MOLINA",
  "DUQUE",
  "ZAPATA",
  "VELÁSQUEZ",
  "RESTREPO",
]

const ESTADOS: EstadoAsistencia[] = [
  "asistio",
  "asistio",
  "asistio",
  "asistio",
  "asistio",
  "asistio",
  "asistio",
  "asistio",
  "llego-tarde",
  "no-asistio",
]

const JUSTIFICACIONES_LLEGADA_TARDE = [
  "Tráfico pesado en la entrada.",
  "Cita médica早些.",
  "Diligencia familiar.",
  "Transporte público demorado.",
]

const JUSTIFICACIONES_NO_ASISTIO = [
  "Cita médica programada.",
  "Enfermedad gripal.",
  "Diligencia familiar.",
  "Compromiso deportivo.",
]

/**
 * Genera el set de estudiantes para una (grado, grupo). Mismas grado+grupo
 * ⇒ mismos nombres —la función es determinista—, así la tabla no cambia al
 * volver a abrir la actividad.
 */
function buildEstudiantes(grado: string, grupo: string): Estudiante[] {
  const seed = `${grado}-${grupo}`.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const rand = faker.seed(seed)
  void rand

  const total = 35
  return Array.from({ length: total }, (_, index) => ({
    id: index + 1,
    nombres: NOMBRES[index % NOMBRES.length],
    apellidos: `${APELLIDOS[index % APELLIDOS.length]} ${APELLIDOS[(index + 7) % APELLIDOS.length]}`,
  }))
}

function buildAsistencia(index: number): Asistencia {
  const estado = ESTADOS[index % ESTADOS.length]
  const base: Asistencia = {
    estado,
    adjuntos: 0,
  }

  if (estado === "llego-tarde") {
    return {
      ...base,
      justificacion: JUSTIFICACIONES_LLEGADA_TARDE[index % JUSTIFICACIONES_LLEGADA_TARDE.length],
      adjuntos: index % 4 === 0 ? 1 : 0,
    }
  }

  if (estado === "no-asistio") {
    return {
      ...base,
      justificacion: JUSTIFICACIONES_NO_ASISTIO[index % JUSTIFICACIONES_NO_ASISTIO.length],
      adjuntos: index % 3 === 0 ? 1 : 0,
    }
  }

  return base
}

/**
 * Notas por criterio: el primer estudiante siempre tiene todas las notas
 * cargadas, los siguientes se van escalonando —el segundo solo el primero,
 * el tercero los dos primeros, etc.— para que la tabla muestre tanto
 * porcentajes finales como celdas con placeholder "Agregar".
 */
function buildNotas(
  index: number,
  criterios: Actividad["rubrica"]["criterios"],
): NotaCriterio[] {
  if (criterios.length === 0) return []

  const cantidad = index === 0 ? criterios.length : Math.min(index, criterios.length)
  return criterios.slice(0, cantidad).map((criterio, criterioIndex) => {
    // Valor entre 60 y 100 —un rango realista de calificaciones— con un
    // pequeño sesgo según el estudiante para que no salga todo igual.
    const base = 70 + ((index * 3 + criterioIndex * 7) % 25)
    return {
      criterioId: criterio.id,
      valor: Math.min(100, base + criterioIndex * 2),
    }
  })
}

/**
 * Genera el seed de calificaciones para todas las actividades del mock.
 * La key del map es el id de la actividad. Solo las evaluativas tienen
 * notas cargadas; las que no lo son devuelven asistencia vacía con
 * `adjuntos: 0` para que la UI las muestre igual (la columna NOTA queda
 * en "Agregar" hasta que se les cargue).
 */
function buildCalificaciones(
  actividades: Actividad[],
): Record<string, CalificacionEstudiante[]> {
  const out: Record<string, CalificacionEstudiante[]> = {}

  for (const actividad of actividades) {
    const estudiantes = buildEstudiantes(actividad.grado, actividad.grupo)
    out[actividad.id] = estudiantes.map((estudiante, index) => ({
      ...estudiante,
      asistencia: buildAsistencia(index),
      notas: actividad.esEvaluativa ? buildNotas(index, actividad.rubrica.criterios) : [],
    }))
  }

  return out
}

/**
 * Cache lazy: se llena al primer acceso con todas las actividades del mock.
 * Como los mocks viven en memoria de la página, no hace falta invalidar.
 */
let cache: Record<string, CalificacionEstudiante[]> | null = null

function getCache(actividades: Actividad[]): Record<string, CalificacionEstudiante[]> {
  if (!cache) {
    cache = buildCalificaciones(actividades)
  }
  return cache
}

/** Calificaciones por id de actividad. */
export function getCalificacionesByActividad(
  id: number,
  actividades: Actividad[],
): CalificacionEstudiante[] {
  return getCache(actividades)[id] ?? []
}