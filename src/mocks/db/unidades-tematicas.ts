import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

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
    actividades: [
      {
        id: "ua1",
        nombre: "Entrevista a usuarios",
        tipo: "Formativa",
        instrumento: "Rúbrica",
        grupo: "Grupo A",
        ponderacion: 25,
      },
      {
        id: "ua2",
        nombre: "Mapa de empatía",
        tipo: "Formativa",
        instrumento: "Lista de cotejo",
        grupo: "Grupo A",
        ponderacion: 25,
      },
      {
        id: "ua3",
        nombre: "Propuesta de solución",
        tipo: "Sumativa",
        instrumento: "Escala de valoración",
        grupo: "Grupo B",
        ponderacion: 25,
      },
      {
        id: "ua4",
        nombre: "Presentación del prototipo",
        tipo: "Sumativa",
        instrumento: "Rúbrica",
        grupo: "Grupo B",
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
      {
        id: "ua5",
        nombre: "Taller de operaciones",
        tipo: "Formativa",
        instrumento: "Lista de cotejo",
        grupo: "Grupo A",
        ponderacion: 30,
      },
      {
        id: "ua6",
        nombre: "Problemas de aplicación",
        tipo: "Formativa",
        instrumento: "Rúbrica",
        grupo: "Grupo A",
        ponderacion: 20,
      },
      {
        id: "ua7",
        nombre: "Evaluación intermedia",
        tipo: "Sumativa",
        instrumento: "Prueba escrita",
        grupo: "Grupo B",
        ponderacion: 25,
      },
      {
        id: "ua8",
        nombre: "Proyecto integrador",
        tipo: "Sumativa",
        instrumento: "Rúbrica",
        grupo: "Grupo B",
        ponderacion: 15,
      },
      {
        id: "ua9",
        nombre: "Cierre y autoevaluación",
        tipo: "Formativa",
        instrumento: "Autoevaluación",
        grupo: "Grupo B",
        ponderacion: 10,
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
    actividades: [
      {
        id: "ua10",
        nombre: "Lectura de gráficos de prensa",
        tipo: "Formativa",
        instrumento: "Lista de cotejo",
        grupo: "Grupo A",
        ponderacion: 40,
      },
      {
        id: "ua11",
        nombre: "Construcción de un informe",
        tipo: "Sumativa",
        instrumento: "Rúbrica",
        grupo: "Grupo A",
        ponderacion: 40,
      },
      {
        id: "ua12",
        nombre: "Cierre de unidad",
        tipo: "Sumativa",
        instrumento: "Prueba escrita",
        grupo: "Grupo B",
        ponderacion: 20,
      },
    ],
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
    actividades: [
      {
        id: "ua13",
        nombre: "Salida de campo",
        tipo: "Formativa",
        instrumento: "Lista de cotejo",
        grupo: "Grupo A",
        ponderacion: 50,
      },
      {
        id: "ua14",
        nombre: "Informe de clasificación",
        tipo: "Sumativa",
        instrumento: "Rúbrica",
        grupo: "Grupo B",
        ponderacion: 50,
      },
    ],
  },
]
