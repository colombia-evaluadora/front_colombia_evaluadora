import { ratingSymbolsDb } from "@/mocks/db/academic-period/rating-symbols"

/**
 * Semilla de Informes. El módulo no tenía NINGÚN mock —las 14 rutas
 * `/informes/*` caían sin handler— así que la pantalla no se podía mostrar sin
 * backend.
 *
 * Dos grupos a propósito, porque la pantalla se bifurca por `formato`:
 *   * **Jardín I 02 — preescolar, solo cualitativo.** Nunca lleva nota: sus
 *     dimensiones traen `valoracion` + `simbolo` (la URL de una carita real de
 *     `assets/caras`) y cada estudiante tiene su observación.
 *   * **5°01 — primaria, numérico.** Es el que ejercita la otra tabla: notas,
 *     puesto, aprobadas/reprobadas y los estados gris/negro.
 */

/** Caritas reales del catálogo de escalas, en orden de "mejor" a "peor".
 *  Se toman de un solo color para que la columna se lea pareja. */
const CARITAS = ratingSymbolsDb
  .filter((s) => s.categoria === "carita" && s.color === "verde")
  .map((s) => s.valor)

/** `simbolo` de una valoración cualitativa: una imagen si el catálogo de
 *  caritas está disponible. `null` deja que la UI caiga al texto de
 *  `valoracion`, que es el comportamiento sin símbolo configurado. */
function carita(indice: number): string | null {
  return CARITAS[indice] ?? null
}

export const SEDE_INFORME = {
  fk_tsede: 1,
  sede_nombre: "Sede Principal",
  fk_testablecimiento: 1,
  establecimiento_nombre: "I.E. Colombia Evaluadora",
}

export const ANIOS_INFORME = [
  { anio: 2026, es_actual: true },
  { anio: 2025, es_actual: false },
]

export const JORNADA_INFORME = {
  fk_tlv_jornada: 11,
  jornada_nombre: "Mañana",
  fk_tperiodo_academico: 100,
  periodo_nombre: "Año lectivo 2026",
  fecha_inicio: "2026-01-26",
  fecha_fin: "2026-11-27",
  en_curso: true,
}

interface PeriodoSeed {
  id: number
  nombre: string
  abreviacion: string
  fechaInicio: string
  fechaFin: string
  termino: boolean
  enCurso: boolean
}

export const PERIODOS_INFORME: PeriodoSeed[] = [
  { id: 201, nombre: "Primer período", abreviacion: "P1", fechaInicio: "2026-01-26", fechaFin: "2026-04-10", termino: true, enCurso: false },
  { id: 202, nombre: "Segundo período", abreviacion: "P2", fechaInicio: "2026-04-13", fechaFin: "2026-06-19", termino: true, enCurso: false },
  { id: 203, nombre: "Tercer período", abreviacion: "P3", fechaInicio: "2026-07-06", fechaFin: "2026-09-25", termino: false, enCurso: true },
  { id: 204, nombre: "Cuarto período", abreviacion: "P4", fechaInicio: "2026-09-28", fechaFin: "2026-11-27", termino: false, enCurso: false },
]

interface GrupoSeed {
  grupoId: number
  grupoCodigo: string
  grupoNombre: string
  grupoEtiqueta: string
  gradoId: number
  gradoCodigo: string
  gradoNombre: string
  nivelId: number
  nivelNombre: string
  director: string
  /** Preescolar es SOLO cualitativo — nunca lleva nota numérica. */
  cualitativo: boolean
}

export const GRUPOS_INFORME: GrupoSeed[] = [
  {
    grupoId: 501,
    grupoCodigo: "02",
    grupoNombre: "02",
    grupoEtiqueta: "Jardín I 02",
    gradoId: 3748,
    // Los códigos negativos de preescolar son correctos, no un error de carga.
    gradoCodigo: "-1",
    gradoNombre: "Jardín I",
    nivelId: 1,
    nivelNombre: "Preescolar",
    director: "MARTA LUCÍA OSPINA",
    cualitativo: true,
  },
  {
    grupoId: 502,
    grupoCodigo: "01",
    grupoNombre: "01",
    grupoEtiqueta: "5°01",
    gradoId: 3712,
    gradoCodigo: "5",
    gradoNombre: "Quinto",
    nivelId: 2,
    nivelNombre: "Básica primaria",
    director: "JORGE ELIÉCER RAMOS",
    cualitativo: false,
  },
]

interface EstudianteSeed {
  matriculaId: number
  estudianteId: number
  nombre: string
  documento: string
  grupoId: number
}

export const ESTUDIANTES_INFORME: EstudianteSeed[] = [
  { matriculaId: 9001, estudianteId: 8001, nombre: "NATALIA ANDREA CARPINTERO CASTRO", documento: "1092345671", grupoId: 501 },
  { matriculaId: 9002, estudianteId: 8002, nombre: "SAMUEL DAVID BELTRÁN MEJÍA", documento: "1092345672", grupoId: 501 },
  { matriculaId: 9003, estudianteId: 8003, nombre: "LUCÍA FERNANDA OCAMPO RUIZ", documento: "1092345673", grupoId: 501 },
  { matriculaId: 9004, estudianteId: 8004, nombre: "MATÍAS ALEJANDRO PEÑA SOTO", documento: "1092345674", grupoId: 501 },
  { matriculaId: 9005, estudianteId: 8005, nombre: "ISABELA SOFÍA GUERRERO LARA", documento: "1092345675", grupoId: 501 },
  { matriculaId: 9006, estudianteId: 8006, nombre: "TOMÁS EMILIO VARGAS DÍAZ", documento: "1092345676", grupoId: 501 },
  { matriculaId: 9101, estudianteId: 8101, nombre: "CAMILA ANDREA ROJAS MEJÍA", documento: "1093456781", grupoId: 502 },
  { matriculaId: 9102, estudianteId: 8102, nombre: "JUAN ESTEBAN MORALES GIL", documento: "1093456782", grupoId: 502 },
  { matriculaId: 9103, estudianteId: 8103, nombre: "VALENTINA HOYOS PALACIO", documento: "1093456783", grupoId: 502 },
  { matriculaId: 9104, estudianteId: 8104, nombre: "SEBASTIÁN SILVERA CUADRADO", documento: "1093456784", grupoId: 502 },
  { matriculaId: 9105, estudianteId: 8105, nombre: "MARIANA ZAPATA CORREA", documento: "1093456785", grupoId: 502 },
  { matriculaId: 9106, estudianteId: 8106, nombre: "ANDRÉS FELIPE LONDOÑO TORO", documento: "1093456786", grupoId: 502 },
]

interface AsignaturaSeed {
  id: number
  nombre: string
  abreviacion: string
  area: string
  orden: number
  grupoId: number
}

/** Preescolar trabaja por DIMENSIONES, no por asignaturas con nota. */
export const ASIGNATURAS_INFORME: AsignaturaSeed[] = [
  { id: 4301, nombre: "Dimensión comunicativa", abreviacion: "COM", area: "Preescolar", orden: 1, grupoId: 501 },
  { id: 4302, nombre: "Dimensión cognitiva", abreviacion: "COG", area: "Preescolar", orden: 2, grupoId: 501 },
  { id: 4303, nombre: "Dimensión corporal", abreviacion: "COR", area: "Preescolar", orden: 3, grupoId: 501 },
  { id: 4304, nombre: "Dimensión socioafectiva", abreviacion: "SOC", area: "Preescolar", orden: 4, grupoId: 501 },
  { id: 4401, nombre: "Matemáticas", abreviacion: "MAT", area: "Matemáticas", orden: 1, grupoId: 502 },
  { id: 4402, nombre: "Lengua castellana", abreviacion: "LEN", area: "Humanidades", orden: 2, grupoId: 502 },
  { id: 4403, nombre: "Ciencias naturales", abreviacion: "CNA", area: "Ciencias", orden: 3, grupoId: 502 },
  { id: 4404, nombre: "Ciencias sociales", abreviacion: "CSO", area: "Ciencias", orden: 4, grupoId: 502 },
]

const VALORACIONES = ["Superior", "Alto", "Básico", "Bajo"] as const

/** Determinista: el mismo estudiante saca siempre lo mismo, para que una
 *  demo no cambie entre refrescos. */
function indiceValoracion(matriculaId: number, asignaturaId: number): number {
  return (matriculaId + asignaturaId) % VALORACIONES.length
}

export function valoracionDe(matriculaId: number, asignaturaId: number) {
  const indice = indiceValoracion(matriculaId, asignaturaId)
  return {
    valoracion: VALORACIONES[indice],
    // Las caritas están ordenadas de "mejor" a "peor" igual que VALORACIONES,
    // pero espaciadas: 8 caritas para 4 valoraciones.
    simbolo: carita(indice * 2),
  }
}

export function notaDe(matriculaId: number, asignaturaId: number): number {
  const base = 2.8 + ((matriculaId + asignaturaId * 7) % 22) / 10
  return Math.round(base * 10) / 10
}

/**
 * Observación del período por estudiante (preescolar). No es una línea suelta:
 * es el CONSOLIDADO de todo lo que el docente fue observando actividad por
 * actividad durante el período, así que son párrafos. La clave es
 * `<matricula>-<periodo>`; las que no están devuelven `null`, que es el caso
 * "todavía sin observación" y conviene dejar algunas para que la demo muestre
 * ese estado.
 */
const observaciones = new Map<string, string>([
  [
    "9001-201",
    "Natalia exploró el material de conteo con autonomía y logró agrupar hasta diez elementos por color y por tamaño sin ayuda del adulto. En las actividades de lectura de imágenes anticipa lo que va a pasar en la historia y sostiene la atención durante toda la ronda. Comparte sus hallazgos con el grupo y espera su turno para hablar, aunque todavía interrumpe cuando algo la entusiasma mucho. En motricidad fina avanzó en el agarre de pinza; los trazos dentro del contorno aún requieren acompañamiento. Se recomienda continuar con ejercicios de rasgado y ensartado en casa.",
  ],
  [
    "9001-202",
    "Durante este período Natalia consolidó el conteo hasta veinte y empezó a reconocer su nombre escrito entre otros. Participó con entusiasmo en los proyectos de aula y propuso ideas propias para la huerta. En la dimensión socioafectiva mostró avances importantes: resuelve los desacuerdos con palabras y busca al adulto solo cuando no logra acordar. Persiste el acompañamiento en trazos finos, aunque ya sostiene el lápiz con mayor firmeza y termina las guías sin frustrarse.",
  ],
  [
    "9002-201",
    "Samuel participa en las rondas siguiendo el ritmo y respetando los turnos de sus compañeros. Reconoce y nombra las figuras básicas, y las asocia con objetos del salón cuando se le pide. Le cuesta iniciar las actividades por su cuenta: necesita que el adulto le indique el primer paso, pero una vez que empieza sostiene la tarea hasta terminarla. En el juego libre prefiere grupos pequeños y comparte los materiales sin dificultad. Se sugiere darle responsabilidades cortas dentro del aula para fortalecer la autonomía.",
  ],
  [
    "9002-202",
    "Samuel ganó seguridad para iniciar las actividades sin que se le indique el primer paso, que era la meta del período anterior. Amplió su vocabulario y ahora narra lo que hizo el fin de semana con secuencia clara de principio, medio y final. En motricidad gruesa salta en un pie y mantiene el equilibrio en la viga baja. Sigue prefiriendo los grupos pequeños; se le invita a participar en juegos de mayor número de niños.",
  ],
  [
    "9003-201",
    "Lucía nombra y clasifica por color, tamaño y forma sin ayuda del adulto, y explica en voz alta el criterio que usó. Disfruta las actividades de expresión artística y se detiene en los detalles de sus dibujos. En la dimensión corporal se desplaza con seguridad y coordina bien los movimientos en las rondas. Con los compañeros es cuidadosa y suele ayudar a quien se queda atrás. Le cuesta aceptar cuando una actividad se termina antes de que ella la dé por terminada.",
  ],
  [
    "9003-202",
    "Lucía continúa destacándose en las actividades de clasificación y empezó a establecer relaciones de cantidad: identifica dónde hay más y dónde hay menos sin contar uno a uno. En lenguaje amplió sus descripciones y pregunta por el significado de las palabras nuevas. Maneja mejor el cierre de las actividades cuando se le anticipa el tiempo que queda, estrategia que conviene sostener. Su participación en los proyectos de aula fue constante durante todo el período.",
  ],
  [
    "9004-201",
    "Matías pide ayuda cuando la necesita y persiste en las tareas de armado hasta completarlas, incluso cuando le toma varios intentos. Reconoce las vocales en su nombre y las busca en los carteles del salón. En las actividades grupales observa primero y se suma después; una vez integrado participa con gusto. Está fortaleciendo el control de esfínteres y la rutina de orden de sus objetos personales, con avances sostenidos en las últimas semanas.",
  ],
  [
    "9005-201",
    "Isabela se expresa con frases completas y es la primera en ofrecerse para las actividades nuevas. Identifica los colores primarios y los secundarios, y los usa intencionalmente en sus creaciones. En motricidad fina recorta siguiendo la línea con precisión para su edad. Está aprendiendo a esperar el turno para hablar, que es el punto en el que más acompañamiento necesita. Su relación con los compañeros es cálida y suele mediar cuando alguien se molesta.",
  ],
  [
    "9006-201",
    "Tomás ingresó al grupo en la segunda semana del período y se adaptó a la rutina más rápido de lo esperado. Reconoce a sus compañeros por el nombre y ya tiene preferencias claras de juego. En la dimensión cognitiva arma rompecabezas de seis piezas sin ayuda y arriesga hipótesis sobre lo que va a pasar en los experimentos. Habla en voz baja cuando se dirige a los adultos; se trabaja en fortalecer la seguridad para expresarse frente al grupo.",
  ],
  [
    "9004-202",
    "Matías consolidó la rutina de orden y ahora ayuda a organizar los materiales al cierre de la jornada sin que se le pida. Identifica todas las vocales y empezó a reconocer la letra inicial de los nombres de sus compañeros. Se integra a las actividades grupales desde el comienzo, sin la etapa de observación previa que se describía en el período anterior. Sostiene la atención por períodos más largos y tolera mejor la espera.",
  ],
])

export function observacionKey(matriculaId: number, periodoId: number): string {
  return `${matriculaId}-${periodoId}`
}

export function getObservacion(matriculaId: number, periodoId: number): string | null {
  return observaciones.get(observacionKey(matriculaId, periodoId)) ?? null
}

export function setObservacion(matriculaId: number, periodoId: number, texto: string): void {
  observaciones.set(observacionKey(matriculaId, periodoId), texto)
}

export function deleteObservacion(matriculaId: number, periodoId: number): void {
  observaciones.delete(observacionKey(matriculaId, periodoId))
  estadosObservacion.delete(observacionKey(matriculaId, periodoId))
}

/** `APROBADA` = tal como salió de la IA, `MODIFICADA` = el docente la editó
 *  a mano. Lo que decide si `/ai/observaciones/periodo` puede pisarla sin
 *  `SOBRESCRIBIR`. */
export type EstadoObservacion = "APROBADA" | "MODIFICADA"

const estadosObservacion = new Map<string, EstadoObservacion>()

export function getEstadoObservacion(matriculaId: number, periodoId: number): EstadoObservacion | null {
  return estadosObservacion.get(observacionKey(matriculaId, periodoId)) ?? null
}

export function setEstadoObservacion(
  matriculaId: number,
  periodoId: number,
  estado: EstadoObservacion,
): void {
  estadosObservacion.set(observacionKey(matriculaId, periodoId), estado)
}

/** El comentario del AÑO — la fila Final. Va en su propio mapa, igual que en
 *  el backend va en su propia tabla: la llave es solo la matrícula, sin
 *  período, porque la matrícula ya determina el año. */
const observacionesAnio = new Map<number, string>()
const estadosObservacionAnio = new Map<number, EstadoObservacion>()

export function getObservacionAnio(matriculaId: number): string | null {
  return observacionesAnio.get(matriculaId) ?? null
}

export function setObservacionAnio(matriculaId: number, texto: string): void {
  observacionesAnio.set(matriculaId, texto)
}

export function deleteObservacionAnio(matriculaId: number): void {
  observacionesAnio.delete(matriculaId)
  estadosObservacionAnio.delete(matriculaId)
}

export function getEstadoObservacionAnio(matriculaId: number): EstadoObservacion | null {
  return estadosObservacionAnio.get(matriculaId) ?? null
}

export function setEstadoObservacionAnio(matriculaId: number, estado: EstadoObservacion): void {
  estadosObservacionAnio.set(matriculaId, estado)
}

/** Informes ya consolidados: `<grupo>-<periodo>`. Lo que NO está acá se
 *  muestra en gris (proyectado) hasta que se guarde. */
const consolidados = new Set<string>(["501-201", "502-201"])

export function estaConsolidado(grupoId: number, periodoId: number): boolean {
  return consolidados.has(`${grupoId}-${periodoId}`)
}

export function consolidar(grupoId: number, periodoId: number): void {
  consolidados.add(`${grupoId}-${periodoId}`)
}

export interface HistorialSeed {
  id: number
  grupoId: number
  asignaturaId: number | null
  origen: string
  periodoId: number
  usuario: string
  fecha: string
  momento: string
  estudiantes: number
}

export const historialInforme: HistorialSeed[] = [
  { id: 1, grupoId: 501, asignaturaId: null, origen: "informe", periodoId: 201, usuario: "MARTA LUCÍA OSPINA", fecha: "2026-04-14", momento: "2026-04-14T15:20:00", estudiantes: 6 },
  { id: 2, grupoId: 502, asignaturaId: null, origen: "informe", periodoId: 201, usuario: "JORGE ELIÉCER RAMOS", fecha: "2026-04-15", momento: "2026-04-15T09:05:00", estudiantes: 6 },
  { id: 3, grupoId: 502, asignaturaId: 4401, origen: "planilla", periodoId: 202, usuario: "JORGE ELIÉCER RAMOS", fecha: "2026-06-22", momento: "2026-06-22T11:42:00", estudiantes: 6 },
]

export function registrarHistorial(entrada: Omit<HistorialSeed, "id">): void {
  historialInforme.unshift({ ...entrada, id: historialInforme.length + 1 })
}
