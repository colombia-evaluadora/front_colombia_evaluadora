import type { EstadoTurno } from "@/features/assistant/api/types"

// Sugerencias por pantalla. El backend no expone un endpoint de sugerencias
// (brecha anotada en el PR), así que se escriben acá alineadas con las
// herramientas que el agente tiene en el catálogo (V557.2): lecturas de
// planeador/funcionarios/periodos, escrituras del planeador con confirmación,
// `buscar_pantalla` y `consulta_analitica` (planeador_estadisticas).
const POR_RUTA: { prefijo: string; sugerencias: string[] }[] = [
  {
    prefijo: "/app/planeador/unidades",
    sugerencias: [
      "¿Qué unidades temáticas tengo este periodo?",
      "Crea una unidad temática para mi grupo",
      "¿Qué criterios tiene esta unidad?",
    ],
  },
  {
    prefijo: "/app/planeador/planilla",
    sugerencias: [
      "¿Qué actividades me faltan por calificar?",
      "Registra la asistencia de la actividad de hoy",
    ],
  },
  {
    prefijo: "/app/planeador",
    sugerencias: [
      "¿Qué actividades tengo esta semana?",
      "Crea una actividad evaluativa para mañana",
      "Muéstrame las estadísticas de mis actividades",
    ],
  },
  {
    prefijo: "/app/establecimiento-educativo/funcionarios",
    sugerencias: [
      "¿Cuántos funcionarios hay por cargo?",
      "Busca al funcionario por apellido",
      "Ayúdame a llenar el formulario de funcionario",
    ],
  },
  {
    prefijo: "/app/establecimiento-educativo/periodos",
    sugerencias: ["¿Cuáles son los periodos del año lectivo?", "¿Qué periodo de evaluación está abierto?"],
  },
  {
    prefijo: "/app/establecimiento-educativo",
    sugerencias: ["¿Qué sedes y jornadas tiene el establecimiento?", "Llévame a los funcionarios"],
  },
  {
    prefijo: "/app/gestion-academica",
    sugerencias: ["¿Qué referentes curriculares hay?", "Llévame a informes"],
  },
  {
    prefijo: "/app/asistencia",
    sugerencias: ["¿Qué estudiantes tiene mi grupo?", "Llévame al planeador"],
  },
]

const GENERALES = [
  "¿Qué puedo hacer contigo?",
  "¿Dónde registro las calificaciones?",
  "¿Qué actividades tengo esta semana?",
]

export function sugerenciasPara(pathname: string): string[] {
  return POR_RUTA.find((r) => pathname.startsWith(r.prefijo))?.sugerencias ?? GENERALES
}

const ETIQUETAS_ESTADO: Partial<Record<EstadoTurno, string>> = {
  RECIBIDO: "Recibiendo tu mensaje…",
  VALIDADO: "Analizando…",
  INTENCION: "Entendiendo lo que necesitas…",
  PERMISO_OK: "Revisando tus permisos…",
  RECOLECTANDO: "Consultando la información…",
  PENDIENTE_CONFIRMACION: "Preparando la acción…",
}

export function etiquetaEstado(estado: EstadoTurno | null): string {
  return (estado && ETIQUETAS_ESTADO[estado]) || "Pensando…"
}
