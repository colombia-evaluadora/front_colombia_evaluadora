import type {
  CambiosPendientesInfo,
  ColumnaAsignatura,
  EstudianteInforme,
  GrupoInforme,
  HistorialCambio,
  NotasPeriodo,
  PeriodoId,
  PeriodoOption,
} from "@/features/academic-management/reports/api/types"

export const PERIODOS: PeriodoOption[] = [
  { id: 1, label: "1. Primer periodo" },
  { id: 2, label: "2. Segundo periodo" },
  { id: 3, label: "3. Tercer periodo" },
  { id: 4, label: "4. Final" },
]

// Docentes que no han registrado ninguna calificación en el período (aún no
// hay ni siquiera nota proyectada que mostrar).
export const PLANILLAS_PENDIENTES = 7

// Docentes que SÍ calificaron, pero después de que el período ya había
// cerrado — ese cambio queda pendiente de que el administrador lo apruebe o
// lo rechace antes de contar para el informe. `totalDocentes` es el total en
// todo el establecimiento; `grupos` solo lista los de los grados/grupos con
// pestaña abierta en esta vista (por eso puede ser una lista más corta).
export const CAMBIOS_PENDIENTES: CambiosPendientesInfo = {
  totalDocentes: 5,
  grupos: [
    { id: 1, nombreDocente: "José Pérez", asignatura: "Educación Física", gradoGrupo: "601 M" },
    { id: 2, nombreDocente: "José Pérez", asignatura: "Educación Física", gradoGrupo: "601 M" },
    { id: 3, nombreDocente: "José Pérez", asignatura: "Educación Física", gradoGrupo: "601 M" },
  ],
}

export const NOTA_MINIMA_APROBATORIA = 3.0
export const NOTA_MAXIMA = 5.0

// Peso de cada periodo dentro del año (para calcular "nota faltante"). No
// hay todavía un endpoint real de criterio de promoción para Informes —
// placeholder alineado con el ejemplo 30/30/40 que dio negocio, hasta que
// se traiga la configuración real por establecimiento/nivel. El 4 ("Final")
// queda fuera: es la fila consolidada, no un periodo calificable.
export const PESOS_PERIODO: Partial<Record<PeriodoId, number>> = { 1: 0.3, 2: 0.3, 3: 0.4 }

export const COLUMNAS_RESUMEN: ColumnaAsignatura[] = [
  { key: "promedio", label: "PR", descripcion: "Promedio general del período" },
  { key: "puesto", label: "PU", descripcion: "Puesto dentro del grupo" },
  { key: "areasPerdidas", label: "AP", descripcion: "Asignaturas aprobadas" },
  { key: "recuperaciones", label: "RE", descripcion: "Asignaturas reprobadas" },
]

export const COLUMNAS_ASIGNATURAS: ColumnaAsignatura[] = [
  { key: "mat", label: "MAT", descripcion: "Matemáticas" },
  { key: "len", label: "LEN", descripcion: "Lenguaje" },
  { key: "cn", label: "CN", descripcion: "Ciencias Naturales" },
  { key: "ing", label: "ING", descripcion: "Inglés" },
  { key: "art", label: "ART", descripcion: "Educación Artística" },
  { key: "ef", label: "EF", descripcion: "Educación Física" },
  { key: "inf", label: "INF", descripcion: "Informática" },
  { key: "rel", label: "RE", descripcion: "Religión" },
]

function notas(
  promedio: number,
  puesto: number,
  areasPerdidas: number,
  recuperaciones: number,
  asignaturas: Record<string, number>,
  confirmado: boolean,
): NotasPeriodo {
  return { promedio, puesto, areasPerdidas, recuperaciones, asignaturas, confirmado }
}

function estudiante(
  id: number,
  documento: string,
  nombreCompleto: string,
  p1: NotasPeriodo,
  p2: NotasPeriodo,
): EstudianteInforme {
  return { id, documento, nombreCompleto, notasPorPeriodo: { 1: p1, 2: p2 } }
}

// El primer periodo ya cerró y se guardó (confirmado); el segundo sigue en
// curso: sus notas son la proyección del sistema sobre lo ya calificado,
// todavía sin confirmar (gris) — mismo escenario descrito por negocio.
const ESTUDIANTES_601: EstudianteInforme[] = [
  estudiante(
    1,
    "1023456701",
    "Sebastián David Jaramillo Gómez",
    notas(3.6, 4, 7, 0, { mat: 2.5, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 2.5, inf: 3.0, rel: 3.0 }, true),
    notas(3.9, 4, 7, 0, { mat: 2.5, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 2.5, inf: 3.0, rel: 3.0 }, false),
  ),
  estudiante(
    2,
    "1023456702",
    "Valentina Sofía Torres Martínez",
    notas(2.8, 1, 10, 0, { mat: 3.0, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 3.0, inf: 3.0, rel: 3.0 }, true),
    notas(3.1, 4, 7, 0, { mat: 2.5, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 2.5, inf: 3.0, rel: 3.0 }, false),
  ),
  estudiante(
    3,
    "1023456703",
    "Juan Esteban Pérez Morales",
    notas(4.0, 10, 7, 0, { mat: 3.0, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 2.5, inf: 2.5, rel: 3.0 }, true),
    notas(4.3, 4, 7, 0, { mat: 2.5, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 2.5, inf: 3.0, rel: 3.0 }, false),
  ),
  estudiante(
    4,
    "1023456704",
    "Mariana Alejandra Castillo Ruiz",
    notas(3.0, 2, 10, 0, { mat: 2.5, len: 2.5, cn: 2.5, ing: 2.5, art: 3.0, ef: 2.5, inf: 2.5, rel: 2.5 }, true),
    notas(3.4, 4, 7, 0, { mat: 2.5, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 2.5, inf: 3.0, rel: 3.0 }, false),
  ),
  estudiante(
    5,
    "1023456705",
    "Samuel Nicolás Patiño Gómez",
    notas(2.6, 8, 7, 1, { mat: 2.5, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 2.5, inf: 3.0, rel: 3.0 }, true),
    notas(2.9, 4, 7, 0, { mat: 2.5, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 2.5, inf: 3.0, rel: 3.0 }, false),
  ),
  estudiante(
    6,
    "1023456706",
    "Isabella Camila Herrera Díaz",
    notas(2.8, 20, 4, 2, { mat: 3.0, len: 3.0, cn: 3.0, ing: 3.0, art: 2.5, ef: 3.0, inf: 3.0, rel: 3.0 }, true),
    notas(3.4, 4, 7, 0, { mat: 2.5, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 3.0, inf: 3.0, rel: 3.0 }, false),
  ),
  estudiante(
    7,
    "1023456707",
    "Santiago José Gómez López",
    notas(3.1, 12, 5, 1, { mat: 3.0, len: 2.5, cn: 2.5, ing: 2.5, art: 2.5, ef: 3.0, inf: 3.0, rel: 2.5 }, true),
    notas(3.4, 4, 7, 0, { mat: 2.5, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 2.5, inf: 3.0, rel: 3.0 }, false),
  ),
  estudiante(
    8,
    "1023456708",
    "Natalia Andrea Ramírez Salgado",
    notas(4.5, 5, 8, 0, { mat: 3.0, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 3.0, inf: 3.0, rel: 2.7 }, true),
    notas(3.4, 4, 7, 0, { mat: 2.5, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 2.5, inf: 2.5, rel: 3.0 }, false),
  ),
]

const ESTUDIANTES_602: EstudianteInforme[] = [
  estudiante(
    9,
    "1023456709",
    "Andrés Felipe Rojas Villamizar",
    notas(3.3, 6, 6, 0, { mat: 3.0, len: 3.0, cn: 2.5, ing: 3.0, art: 3.0, ef: 3.0, inf: 3.0, rel: 3.0 }, true),
    notas(3.5, 5, 6, 0, { mat: 3.0, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 3.0, inf: 3.0, rel: 3.0 }, false),
  ),
  estudiante(
    10,
    "1023456710",
    "Camila Andrea Suárez Ortiz",
    notas(3.9, 2, 9, 0, { mat: 3.0, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 3.0, inf: 3.0, rel: 3.0 }, true),
    notas(4.0, 2, 8, 0, { mat: 3.0, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 3.0, inf: 3.0, rel: 3.0 }, false),
  ),
  estudiante(
    11,
    "1023456711",
    "David Santiago Moreno Vargas",
    notas(2.7, 15, 5, 2, { mat: 2.5, len: 2.5, cn: 2.5, ing: 2.5, art: 3.0, ef: 2.5, inf: 2.5, rel: 2.5 }, true),
    notas(2.9, 13, 5, 1, { mat: 2.5, len: 2.5, cn: 3.0, ing: 2.5, art: 3.0, ef: 2.5, inf: 3.0, rel: 2.5 }, false),
  ),
  estudiante(
    12,
    "1023456712",
    "Laura Valentina Cárdenas Restrepo",
    notas(3.6, 7, 6, 0, { mat: 3.0, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 3.0, inf: 3.0, rel: 3.0 }, true),
    notas(3.7, 6, 6, 0, { mat: 3.0, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 3.0, inf: 3.0, rel: 3.0 }, false),
  ),
  estudiante(
    13,
    "1023456713",
    "Miguel Ángel Torres Beltrán",
    notas(3.0, 11, 5, 1, { mat: 2.5, len: 3.0, cn: 2.5, ing: 3.0, art: 3.0, ef: 2.5, inf: 3.0, rel: 3.0 }, true),
    notas(3.2, 9, 6, 0, { mat: 3.0, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 2.5, inf: 3.0, rel: 3.0 }, false),
  ),
]

// Preescolar no califica con notas: cada estudiante lleva una sola
// observación de texto por período (o ninguna todavía). `notasPorPeriodo`
// queda vacío porque `GradesTable` no se usa para este grupo — lo consume
// `ObservacionesTable`, que lee `observacionesPorPeriodo`.
const ESTUDIANTES_PREESCOLAR: EstudianteInforme[] = [
  {
    id: 14,
    documento: "1023456714",
    nombreCompleto: "Sofía Daniela Torres",
    jornada: "Mañana",
    notasPorPeriodo: {},
    observacionesPorPeriodo: {
      1: "Sofía ha demostrado gran compromiso en las actividades sobre el cuidado de las plantas. Muestra curiosidad y participa con entusiasmo en las actividades grupales.",
    },
  },
  {
    id: 15,
    documento: "1023456715",
    nombreCompleto: "Valentina Martínez",
    jornada: "Mañana",
    notasPorPeriodo: {},
    observacionesPorPeriodo: {},
  },
  {
    id: 16,
    documento: "1023456716",
    nombreCompleto: "Juan Esteban Pérez",
    jornada: "Mañana",
    notasPorPeriodo: {},
    observacionesPorPeriodo: {
      1: "Juan ha mostrado avances en la identificación de elementos de la naturaleza y colabora activamente con sus compañeros durante las salidas al patio.",
    },
  },
  {
    id: 17,
    documento: "1023456717",
    nombreCompleto: "María Camila Ríos",
    jornada: "Mañana",
    notasPorPeriodo: {},
    observacionesPorPeriodo: {
      1: "María participa con alegría en las actividades propuestas y expresa con claridad lo que observa durante las exploraciones al aire libre.",
    },
  },
  {
    id: 18,
    documento: "1023456718",
    nombreCompleto: "Samuel Nicolás Gómez",
    jornada: "Mañana",
    notasPorPeriodo: {},
    observacionesPorPeriodo: {},
  },
  {
    id: 19,
    documento: "1023456719",
    nombreCompleto: "Isabella Camila Herrera",
    jornada: "Mañana",
    notasPorPeriodo: {},
    observacionesPorPeriodo: {},
  },
]

// Cambios recientes en planillas de actividades que ya impactaron el
// consolidado — el panel de "Historial de cambios" los agrupa por día.
export const HISTORIAL_CAMBIOS: HistorialCambio[] = [
  {
    id: 1,
    grupoNombre: "601 M",
    asignatura: "Artística",
    tendencia: "subio",
    periodo: 2,
    fecha: "2026-09-15",
    hora: "08:14 a.m.",
    cantidadCambios: 3,
    usuario: "Cristian Sánchez",
  },
  {
    id: 2,
    grupoNombre: "601 M",
    asignatura: "Matemáticas",
    tendencia: "subio",
    periodo: 2,
    fecha: "2026-09-15",
    hora: "08:00 a.m.",
    cantidadCambios: 2,
    usuario: "José Pérez",
  },
  {
    id: 3,
    grupoNombre: "602 M",
    asignatura: "Lenguaje",
    tendencia: "subio",
    periodo: 1,
    fecha: "2026-09-14",
    hora: "04:15 p.m.",
    cantidadCambios: 1,
    usuario: "Natalia Carpintero",
  },
  {
    id: 4,
    grupoNombre: "601 M",
    asignatura: "Inglés",
    tendencia: "bajo",
    periodo: 2,
    fecha: "2026-08-07",
    hora: "11:08 a.m.",
    cantidadCambios: 4,
    usuario: "Jorge Maldonado",
  },
]

// Grupo que el docente todavía no tiene abierto como pestaña — demuestra
// "Agregar grado/grupo" junto a las pestañas (ver `GRUPOS_DISPONIBLES_IDS`
// más abajo, en `reports-page.tsx`).
const ESTUDIANTES_603: EstudianteInforme[] = [
  estudiante(
    20,
    "1023456720",
    "Emmanuel David Rojas Pardo",
    notas(3.2, 3, 6, 0, { mat: 3.0, len: 3.0, cn: 3.0, ing: 2.5, art: 3.0, ef: 3.0, inf: 3.0, rel: 3.0 }, true),
    notas(3.4, 3, 6, 0, { mat: 3.0, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 3.0, inf: 3.0, rel: 3.0 }, false),
  ),
  estudiante(
    21,
    "1023456721",
    "Gabriela Sofía Muñoz Cárdenas",
    notas(4.1, 1, 8, 0, { mat: 3.0, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 3.0, inf: 3.0, rel: 3.0 }, true),
    notas(4.2, 1, 8, 0, { mat: 3.0, len: 3.0, cn: 3.0, ing: 3.0, art: 3.0, ef: 3.0, inf: 3.0, rel: 3.0 }, false),
  ),
  estudiante(
    22,
    "1023456722",
    "Tomás Alejandro Vega Cortés",
    notas(2.6, 9, 5, 1, { mat: 2.5, len: 2.5, cn: 2.5, ing: 2.5, art: 3.0, ef: 2.5, inf: 3.0, rel: 3.0 }, true),
    notas(2.8, 8, 5, 1, { mat: 2.5, len: 3.0, cn: 2.5, ing: 2.5, art: 3.0, ef: 2.5, inf: 3.0, rel: 3.0 }, false),
  ),
]

export const GRUPOS_INFORME: GrupoInforme[] = [
  { id: 601, nombre: "601 M", estudiantes: ESTUDIANTES_601 },
  { id: 602, nombre: "602 M", estudiantes: ESTUDIANTES_602 },
  { id: 1, nombre: "00-1 M", preescolar: true, estudiantes: ESTUDIANTES_PREESCOLAR },
  { id: 603, nombre: "603 M", estudiantes: ESTUDIANTES_603 },
]

// Pestañas que el docente/coordinador ve abiertas por defecto al entrar —
// el resto de `GRUPOS_INFORME` queda disponible detrás de "Agregar
// grado/grupo" hasta que el usuario lo abra.
export const GRUPOS_ABIERTOS_POR_DEFECTO = [601, 602, 1]
