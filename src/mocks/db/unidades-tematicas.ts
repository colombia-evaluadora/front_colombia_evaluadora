import type {
  CriterioUnidad,
  UnidadActividad,
  UnidadTematica,
} from "@/features/planeador/api/types/unidad-tematica"

/**
 * Seed determinista de unidades temáticas. Cuatro unidades con los cuatro
 * `status` repartidos, para que la barra de color de la card se vea completa
 * igual que en el listado de actividades.
 *
 * Misma convención que `src/mocks/db/planeador.ts`: al refrescar la página la
 * DB en memoria se reinicia, así que sin seed la pestaña aparecería vacía.
 */
export const unidadesTematicasDb: UnidadTematica[] = [
  {
    id: "u1",
    nombre: "Análisis de un texto argumentativo",
    area: "Comunicativa",
    enfoquePedagogico: "Evaluativo",
    status: "in-progress",
    fechaInicio: "2025-02-10",
    fechaFin: "2025-02-28",
    descripcion:
      "Esta unidad sienta las bases metodológicas del diseño empático. Los estudiantes aprenderán a poner al usuario al centro del proceso de concepción, identificando necesidades reales mediante metodologías cualitativas y estructurando hallazgos iniciales.",
    objetivos: [
      "Comprender la importancia del DCU en proyectos interactivos.",
      "Identificar los principios clave del diseño de interfaces modernas.",
      "Aplicar técnicas básicas de relevamiento empático con usuarios.",
      "Analizar flujos lógicos para simplificar procesos complejos.",
    ],
    contenidos: [
      "¿Qué es el Diseño Centrado en el Usuario?",
      "Principios fundamentales del DCU",
      "Historia y evolución de la usabilidad",
      "El rol del operador educativo en el proceso",
    ],
    metodoCalculo: "Ponderado",
    grado: "Sexto",
    asignatura: "Metodología de la investigación",
    enunciadosDba: [
      "Fortalecer la comunicación oral y la escucha activa en diferentes contextos.",
    ],
    criterios: [
      {
        id: "cu1",
        nombre: "Comprensión de los conceptos",
        bajo: "Muestra poca o ninguna comprensión de conceptos.",
        basico: "Comprende algunos conceptos, pero con dificultades.",
        alto: "Comprende la mayoría de los conceptos clave.",
        superior: "Comprende en profundidad todos los conceptos.",
      },
      {
        id: "cu2",
        nombre: "Aplicación en situaciones reales",
        bajo: "No logra aplicar los conceptos en situaciones prácticas.",
        basico: "Aplica los conceptos con apoyo constante.",
        alto: "Aplica los conceptos en la mayoría de las situaciones.",
        superior: "Aplica los conceptos de manera autónoma y creativa.",
      },
      {
        id: "cu3",
        nombre: "Análisis y pensamiento crítico",
        bajo: "Presenta análisis superficiales y sin fundamentos.",
        basico: "Realiza análisis básicos con algunos fundamentos.",
        alto: "Realiza análisis críticos con fundamentos sólidos.",
        superior: "Realiza análisis profundos con excelente argumentación.",
      },
      {
        id: "cu4",
        nombre: "Trabajo colaborativo",
        bajo: "Participa muy poco y no aporta al trabajo del grupo.",
        basico: "Participa ocasionalmente y su aporte es limitado.",
        alto: "Participa activamente y aporta ideas relevantes.",
        superior: "Lidera el trabajo del grupo y potencia los aportes ajenos.",
      },
    ],
    // Solo 2 de las 6 actividades de esta unidad (601-604, 609, 610 en
    // `planeadorDb`) están vinculadas — suman 50%, dejando "Disponible
    // para asignar: 50%" en el diálogo "Agregar actividad" (las otras 4
    // aparecen ahí como candidatas). `actividadId` es la referencia real
    // a `Actividad.id` — ver el comentario de `UnidadActividad`.
    actividades: [
      {
        id: "ua1",
        actividadId: "601",
        nombre: "Proyecto final: Diseño de prototipo 1",
        tipo: "Sumativa",
        instrumento: "Rúbrica",
        grupo: "A",
        ponderacion: 25,
      },
      {
        id: "ua2",
        actividadId: "604",
        nombre: "Rendimiento Diseño de prototipo",
        tipo: "Sumativa",
        instrumento: "Lista de cotejo",
        grupo: "A",
        ponderacion: 25,
      },
    ],
  },
  {
    id: "u2",
    nombre: "Resolución de problemas con números enteros",
    area: "Cognitiva",
    enfoquePedagogico: "Evaluativo",
    status: "in-progress",
    fechaInicio: "2025-02-10",
    fechaFin: "2025-02-28",
    descripcion:
      "Unidad centrada en el razonamiento numérico. Se trabajan estrategias de resolución y verificación de resultados en contextos cotidianos.",
    objetivos: [
      "Operar con números enteros en situaciones problema.",
      "Justificar el procedimiento elegido para cada resolución.",
      "Verificar la razonabilidad del resultado obtenido.",
    ],
    contenidos: [
      "Adición y sustracción de enteros",
      "Multiplicación y división con signo",
      "Orden de operaciones",
      "Problemas de aplicación",
    ],
    metodoCalculo: "Promedio simple",
    grado: "Séptimo",
    asignatura: "Matemática",
    enunciadosDba: [],
    criterios: [
      {
        id: "cu5",
        nombre: "Procedimiento",
        bajo: "Omite pasos y la notación es incorrecta.",
        basico: "Desarrolla los pasos con errores de notación.",
        alto: "Desarrolla cada paso con notación correcta.",
        superior: "Desarrolla el procedimiento y propone una vía alternativa.",
      },
      {
        id: "cu6",
        nombre: "Verificación del resultado",
        bajo: "No verifica el resultado obtenido.",
        basico: "Verifica solo algunos resultados.",
        alto: "Verifica todos los resultados.",
        superior: "Verifica y argumenta la razonabilidad de cada resultado.",
      },
    ],
    actividades: [
      // "Promedio simple": el peso individual no aplica —cada actividad
      // vinculada cuenta igual— así que `ponderacion` queda en 0 en las
      // dos. El diálogo "Agregar actividad" no pide porcentaje acá.
      {
        id: "ua5",
        actividadId: "606",
        nombre: "Evaluación intermedia",
        tipo: "Sumativa",
        instrumento: "Escala de valoración",
        grupo: "B",
        ponderacion: 0,
      },
      {
        id: "ua6",
        actividadId: "611",
        nombre: "Mural colaborativo",
        tipo: "Formativa",
        instrumento: "Rúbrica",
        grupo: "B",
        ponderacion: 0,
      },
    ],
  },
  {
    id: "u3",
    nombre: "Interpretación de gráficos estadísticos",
    area: "Matemática",
    // Unidad con enfoque formativo: sus actividades no admiten
    // `esEvaluativa: true` — ver `planeador.ts`, actividad 607
    // (única del seed que cuelga de esta unidad y que se corrigió
    // a `esEvaluativa: false` para que el seed sea consistente con
    // la regla desde el arranque).
    enfoquePedagogico: "Formativo",
    status: "completed",
    fechaInicio: "2025-02-10",
    fechaFin: "2025-02-28",
    descripcion:
      "Lectura y construcción de representaciones de datos. Se enfatiza la interpretación crítica antes que el cálculo.",
    objetivos: [
      "Leer gráficos de barras, líneas y sectores.",
      "Detectar representaciones engañosas.",
      "Construir un gráfico adecuado al tipo de dato.",
    ],
    contenidos: [
      "Tipos de gráficos y cuándo usarlos",
      "Escalas y ejes",
      "Medidas de tendencia central",
    ],
    metodoCalculo: "Ponderado",
    grado: "Séptimo",
    asignatura: "Matemática",
    enunciadosDba: [],
    criterios: [
      {
        id: "cu7",
        nombre: "Interpretación",
        bajo: "Lee mal los ejes y confunde las magnitudes.",
        basico: "Lee el gráfico pero no extrae conclusiones.",
        alto: "Extrae conclusiones correctas y las fundamenta.",
        superior: "Detecta sesgos de representación y los explica.",
      },
      {
        id: "cu8",
        nombre: "Construcción",
        bajo: "Elige un gráfico inadecuado al tipo de dato.",
        basico: "Elige el gráfico correcto pero sin rotular.",
        alto: "Elige el gráfico adecuado y rotula todos los ejes.",
        superior: "Justifica la elección y cuida la escala.",
      },
    ],
    // Sin actividades vinculadas todavía: sus dos actividades reales
    // (607, 608 en `planeadorDb`) son formativas —coherente con el
    // enfoque Formativo de esta unidad— y aparecen como "disponibles"
    // en el diálogo, con el 100% completo por asignar.
    actividades: [],
  },
  {
    id: "u4",
    nombre: "Clasificación de los seres vivos",
    area: "Científica",
    // Sin actividades en `planeador.ts` — la segunda unidad formativa
    // del seed, útil para probar la regla desde "Identificación de la
    // actividad" (cambiar la unidad de cualquier actividad a esta y
    // ver cómo "¿Es evaluación sumativa?" se bloquea en "No").
    enfoquePedagogico: "Formativo",
    status: "cancelled",
    fechaInicio: "2025-02-10",
    fechaFin: "2025-02-28",
    descripcion:
      "Recorrido por los criterios de clasificación biológica y su evolución histórica hasta los sistemas actuales.",
    objetivos: [
      "Distinguir los grandes reinos y sus criterios.",
      "Usar claves dicotómicas simples.",
    ],
    contenidos: [
      "Criterios de clasificación",
      "Reinos y dominios",
      "Claves dicotómicas",
    ],
    metodoCalculo: "Suma de puntos",
    grado: "Sexto",
    asignatura: "Ciencias naturales",
    enunciadosDba: [],
    criterios: [
      {
        id: "cu9",
        nombre: "Uso de claves",
        bajo: "No logra recorrer la clave dicotómica.",
        basico: "Recorre la clave con ayuda del docente.",
        alto: "Recorre la clave sin errores.",
        superior: "Recorre la clave y justifica cada bifurcación.",
      },
    ],
    // Sin actividades reales en `planeadorDb` para esta unidad (ninguna
    // `Actividad.unidad.id` apunta a "u4") — no hay nada legítimo que
    // vincular todavía, así que queda vacía en vez de referenciar ids
    // que no existen.
    actividades: [],
  },
]

/**
 * Agrega un criterio a la rúbrica de una unidad. Devuelve `null` si la
 * unidad no existe (el handler lo traduce a 404) o el `CriterioUnidad`
 * insertado con su id asignado.
 */
export function addCriterioToUnidad(
  unidadId: string,
  criterio: Omit<CriterioUnidad, "id">,
): CriterioUnidad | null {
  const unidad = unidadesTematicasDb.find((row) => row.id === unidadId)
  if (!unidad) return null

  const created: CriterioUnidad = { ...criterio, id: crypto.randomUUID() }
  unidad.criterios.push(created)
  return created
}

/**
 * Vincula una actividad ya existente (de `planeadorDb`) a la unidad, con
 * su peso dentro de ella. Devuelve `null` si la unidad no existe o si la
 * actividad ya estaba vinculada (mismo `actividadId`) — el handler
 * traduce el primer caso a 404 y el segundo a un mensaje de conflicto,
 * para no terminar con el mismo vínculo duplicado si el usuario hace
 * doble click en "Vincular".
 */
export function addActividadToUnidad(
  unidadId: string,
  actividad: Omit<UnidadActividad, "id">,
): UnidadActividad | null | "duplicado" {
  const unidad = unidadesTematicasDb.find((row) => row.id === unidadId)
  if (!unidad) return null
  if (unidad.actividades.some((a) => a.actividadId === actividad.actividadId)) {
    return "duplicado"
  }

  const created: UnidadActividad = { ...actividad, id: crypto.randomUUID() }
  unidad.actividades.push(created)
  return created
}

/**
 * Quita una unidad por id. Devuelve `true` si la encontró y borró, `false`
 * si no existía. Mismo patrón que `planeador.ts` / `deleteActividadById`.
 */
export function deleteUnidadById(id: string): boolean {
  const index = unidadesTematicasDb.findIndex((row) => row.id === id)
  if (index === -1) return false
  unidadesTematicasDb.splice(index, 1)
  return true
}

/**
 * Agrega una unidad nueva al frente del listado (más reciente primero,
 * mismo criterio que `addActividad` en `mocks/db/planeador.ts`). El
 * handler le asigna el `id` antes de llamar a esto.
 */
export function addUnidad(unidad: UnidadTematica): UnidadTematica {
  unidadesTematicasDb.unshift(unidad)
  return unidad
}

/**
 * Actualiza los campos de "Información general" de una unidad (todo menos
 * `id`, `criterios` y `actividades` — esas listas se editan aparte, desde
 * las pestañas Rúbricas/Actividades). Devuelve `null` si la unidad no
 * existe, o la unidad ya actualizada.
 */
export function updateUnidadInfoGeneral(
  id: string,
  patch: Omit<UnidadTematica, "id" | "criterios" | "actividades">,
): UnidadTematica | null {
  const unidad = unidadesTematicasDb.find((row) => row.id === id)
  if (!unidad) return null
  Object.assign(unidad, patch)
  return unidad
}
