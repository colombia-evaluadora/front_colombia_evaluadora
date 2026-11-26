import { z } from "zod"

/** Opciones del selector de informe (C.4.GEN.1), por grupo. */
export const INFORMES = [
  { grupo: "Consultas", opciones: [{ value: "matriculados", label: "Consulta de matriculados" }] },
  {
    grupo: "Matrícula",
    opciones: [
      { value: "informe-matricula", label: "Informe de matrícula" },
      { value: "fuera-matricula", label: "Estudiantes fuera de matrícula" },
      { value: "nivelaciones", label: "Nivelaciones pendientes" },
      { value: "libro-calificaciones", label: "Libro de registro de calificaciones finales" },
      { value: "edades", label: "Estadística de edades" },
    ],
  },
  {
    grupo: "Grado y certificaciones",
    opciones: [
      { value: "graduacion", label: "Graduación" },
      { value: "actas-graduacion", label: "Actas de graduación" },
      { value: "culminacion", label: "Certificados de culminación" },
    ],
  },
  {
    grupo: "Reservas",
    opciones: [
      { value: "cupos-reservas", label: "Cupos frente a reservas" },
      { value: "reservas-confirmar", label: "Reservas por confirmar" },
      { value: "traslados", label: "Traslados" },
    ],
  },
  {
    grupo: "Admisión",
    opciones: [
      { value: "inscripciones", label: "Inscripciones" },
      { value: "lista-sorteo", label: "Lista del sorteo" },
      { value: "demanda-no-atendida", label: "Demanda no atendida" },
    ],
  },
  { grupo: "Calidad", opciones: [{ value: "calidad", label: "Calidad de la información de matrícula" }] },
  {
    grupo: "Reportes externos",
    opciones: [
      { value: "simat", label: "SIMAT" },
      { value: "c600", label: "Hoja de apoyo C600" },
    ],
  },
] as const

export type InformeId = (typeof INFORMES)[number]["opciones"][number]["value"]
const IDS = INFORMES.flatMap((g) => g.opciones.map((o) => o.value as InformeId)) as [InformeId, ...InformeId[]]

const OPCIONES: readonly { value: string; label: string }[] = INFORMES.flatMap((g) => [...g.opciones])

export const etiquetaInforme = (id: InformeId) => OPCIONES.find((o) => o.value === id)?.label ?? id

const texto = z.string().optional().catch(undefined)

export const informesReportesSearchSchema = z.object({
  informe: z.enum(IDS).optional().catch(undefined),
  q: texto,
  sede: texto,
  anio: z.coerce.number().optional().catch(undefined),
  jornada: texto,
  periodo: z.coerce.number().optional().catch(undefined),
  grado: z.coerce.number().optional().catch(undefined),
  grupo: texto,
  estado: texto,
  tipo: z.enum(["PRINCIPAL", "COMPLEMENTARIA"]).optional().catch(undefined),
  edad: z.enum(["EN_EDAD", "PREEXTRAEDAD", "EXTRAEDAD", "BAJA_EDAD", "SIN_CALCULAR"]).optional().catch(undefined),
  metodologia: z.coerce.number().optional().catch(undefined),
  nuevo: z.enum(["S", "N"]).optional().catch(undefined),
  grupoAdmision: z.coerce.number().optional().catch(undefined),
  agrupar: z.enum(["GRADO", "GRUPO", "SEDE", "JORNADA", "NIVEL", "METODOLOGIA", "ESTADO", "ESTABLECIMIENTO"]).optional().catch(undefined),
  // Estadística de edades: filtros múltiples (C.4.EDA). Sin valor = todos; estados sin valor = Cursando.
  eSedes: z.array(z.string()).optional().catch(undefined),
  eJornadas: z.array(z.string()).optional().catch(undefined),
  ePeriodos: z.array(z.coerce.number()).optional().catch(undefined),
  eGrados: z.array(z.coerce.number()).optional().catch(undefined),
  eEstados: z.array(z.string()).optional().catch(undefined),
  eTipos: z.array(z.string()).optional().catch(undefined),
  eMetodologias: z.array(z.string()).optional().catch(undefined),
  columnas: z.enum(["AUTOMATICO", "EDAD", "RANGO", "SITUACION"]).optional().catch(undefined),
  grupoEdad: texto,
  municipio: z.coerce.number().optional().catch(undefined),
  establecimiento: z.coerce.number().optional().catch(undefined),
  control: z.enum(["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11"]).optional().catch(undefined),
  estadoHallazgo: z.enum(["PENDIENTE", "AJUSTADO", "JUSTIFICADO"]).optional().catch(undefined),
  situacionFuera: z.enum(["RETIRADO", "SIN_CONTINUIDAD", "SIN_CUPO_PLATAFORMA"]).optional().catch(undefined),
  direccion: z.enum(["ENTRANTE", "SALIENTE"]).optional().catch(undefined),
  estadoTraslado: z.enum(["PENDIENTE", "ACEPTADO", "RECHAZADO", "CANCELADO"]).optional().catch(undefined),
  libroModo: z.enum(["GRUPO", "ESTUDIANTE"]).optional().catch(undefined),
  situacionGrado: z.enum(["PENDIENTES"]).optional().catch(undefined),
  // Reportes externos: versión del SIMAT cuya lista de generados se muestra (sin valor = la Activa).
  versionExterna: z.coerce.number().optional().catch(undefined),
  page: z.coerce.number().catch(0).default(0),
  pageSize: z.coerce.number().catch(10).default(10),
})

export type InformesSearch = z.infer<typeof informesReportesSearchSchema>
