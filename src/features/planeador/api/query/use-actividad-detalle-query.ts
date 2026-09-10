import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { env } from "@/config/env"
import { estadoDerivadoToStatus } from "@/features/planeador/lib/estado-derivado"
import type { Actividad } from "@/features/planeador/api/types/actividad"

/**
 * `GET /planeador/actividades/:id` (confirmado real, colección Postman
 * `planeador-guia-completa`, 4.3). Fila COMPLETAMENTE distinta del mock:
 * escalares sueltos (no objetos anidados), `unidad`/`fk_tunidad` en `null`
 * cuando la actividad no tiene unidad (no un objeto `{id, nombre}` —
 * accederle `.nombre` directo, como hacía `detail-sections.tsx`, revienta
 * con "Cannot read properties of null"), y trae `campos_disponibles`/
 * `unidad_configuracion` (el mismo bloque de "pintado dinámico" de
 * `GET .../configuracion`, carpeta 5). `campos_disponibles` SÍ se mapea
 * (`Actividad.camposDisponibles`, ver `EvaluacionSection` en
 * `form-editar-actividad.tsx`, que lo usa para actividades huérfanas en vez
 * de re-derivar la regla con `referente-curricular`); `unidad_configuracion`
 * queda sin usar todavía.
 *
 * Ojo con lo que esta fila NO trae: ni rastro de `rubrica`/`listaCotejo`/
 * `escalaValoracion` — el instrumento de la actividad vive en
 * `GET .../actividades/:id/instrumento` (`use-instrumento-actividad-query.ts`,
 * ya real), no en el detalle. Acá quedan en placeholder vacío, igual que ya
 * hace `use-actividades-mias-query.ts` con el resumen del listado.
 */
interface ActividadDetalleRow {
  pk_tactividad: number
  titulo: string
  descripcion: string | null
  fk_tasignatura: number | null
  asignatura: string | null
  fk_tunidad: number | null
  unidad: string | null
  fk_tgrupo: number | null
  grupo: string | null
  /** Confirmado real (colección Postman `planeador-delta-cambios`, punto
   *  3.3): antes el detalle NO traía el grado de la actividad (solo
   *  `fk_tgrupo`) — `AsignaturaGradoSection` en `form-editar-actividad.tsx`
   *  lo resolvía cruzando `grupoId` contra el catálogo del propio docente
   *  como workaround. Ahora llega directo; ese cruce queda como respaldo
   *  para una actividad de un grupo que el docente autenticado no dicta. */
  fk_tgrado: number | null
  grado: string | null
  grado_codigo: string | null
  grado_grupo: string | null
  fk_tlv_tipo_actividad: number | null
  tipo_actividad: string | null
  fk_tlv_jerarquia: number | null
  jerarquia: string | null
  fk_tlv_modalidad: number | null
  modalidad: string | null
  fk_tlv_instrumento_evaluacion: number | null
  instrumento_evaluacion: string | null
  descripcion_instrumento: string | null
  fk_tlv_tipo_evidencia: number | null
  tipo_evidencia: string | null
  fk_tlv_metodo_valoracion: number | null
  metodo_valoracion: string | null
  fk_tlv_tipo_calculo: number | null
  tipo_calculo: string | null
  ponderacion: number | null
  influencia: unknown
  nota_maxima: number | null
  // Datetime ISO completo, no `yyyy-MM-dd` plano — mismo patrón confirmado
  // en el resto del Planeador real.
  fecha_inicio: string
  fecha_cierre: string
  fecha_calificado: string | null
  fecha_publicacion: string | null
  duracion_estimada: number | string | null
  semana_cronograma: string | null
  material_requerido: string | null
  es_evaluativa: "S" | "N"
  es_recuperacion: "S" | "N"
  requiere_archivo: "S" | "N"
  requiere_texto: "S" | "N"
  genera_evidencias: "S" | "N"
  requiere_validacion_coordinador: "S" | "N"
  observaciones_docente: string | null
  estado: string
  estudiantes_asignados: number
  estudiantes_evaluados: number
  materiales: unknown[]
  adaptaciones: unknown[]
  recuperacion: unknown
  campos_disponibles: CamposDisponiblesRow | null
  unidad_configuracion: unknown
  active: boolean
}

/** Confirmado contra una respuesta real (actividad huérfana, sin unidad):
 *  `evaluacion.visible: false` con motivo "La actividad no tiene unidad
 *  relacionada" — el backend ya resuelve ahí "¿corresponde mostrar/exigir
 *  esto?" con las reglas de negocio completas (huérfana, unidad con
 *  referente FORMATIVO, etc.), no solo un derivado de grado/asignatura. */
interface CampoDisponibleRow {
  visible: boolean
  requerido: boolean
  motivo: string
}

interface CamposDisponiblesRow {
  criterio: CampoDisponibleRow
  evaluacion: CampoDisponibleRow & { instrumentosPermitidos: string[] }
  ponderacion: CampoDisponibleRow & { modo: string | null }
}

function toDateOnly(value: string | null): string {
  return value ? value.slice(0, 10) : ""
}

/**
 * Ids de las evidencias ya marcadas para ESTA actividad — deberían salir de
 * `unidad_configuracion` (paso 8 de la colección Postman
 * `planeador-flujo-unidad-actividad` confirma que el campo existe y trae el
 * árbol de enunciados/evidencias), pero no hay un ejemplo real capturado de
 * CUÁL es el flag que marca "esta evidencia ya está en la actividad".
 *
 * Un primer intento adivinando el nombre del flag terminó marcando
 * evidencias como ya relacionadas cuando no lo estaban (deshabilitaba el
 * checkbox sin que hubiera nada guardado) — peor que no mostrar nada. Hasta
 * tener una respuesta real de este campo, se deja siempre en `[]`: el
 * checklist de evidencias arranca sin nada tildado ni deshabilitado en el
 * panel de detalle (se puede volver a marcar sin problema — el mock/backend
 * ya tolera un alta repetida sin duplicar).
 */
function evidenciasIdsFromUnidadConfiguracion(_raw: unknown): number[] {
  return []
}

function toActividadDetalle(row: ActividadDetalleRow): Actividad {
  return {
    id: row.pk_tactividad,
    nombre: row.titulo,
    tipo: row.tipo_actividad ?? "Otro",
    esRecuperacion: row.es_recuperacion === "S",
    // `unidad`/`fk_tunidad` vienen `null` (no un objeto) cuando la
    // actividad es huérfana — `{id: 0, nombre: ""}` es el sentinel que ya
    // usa el resto del front para "sin unidad".
    unidad:
      row.fk_tunidad != null
        ? { id: row.fk_tunidad, nombre: row.unidad ?? "" }
        : { id: 0, nombre: "" },
    evidenciasIds: evidenciasIdsFromUnidadConfiguracion(row.unidad_configuracion),
    asignatura: row.asignatura ?? "",
    grado: row.grado ?? "",
    gradoId: row.fk_tgrado ?? undefined,
    grupo: row.grupo ?? "",
    gradoGrupo: row.grado_grupo ?? undefined,
    fechaInicio: toDateOnly(row.fecha_inicio),
    fechaCierre: toDateOnly(row.fecha_cierre),
    status: estadoDerivadoToStatus(row.estado),
    evaluados: row.estudiantes_evaluados,
    totalEstudiantes: row.estudiantes_asignados,
    materiales: row.material_requerido ?? "",
    // Shape real de `materiales`/`recursos` sin confirmar (el ejemplo real
    // vino vacío, `[]`) — se deja vacío en vez de adivinar el mapeo.
    recursos: [],
    duracionEstimada: row.duracion_estimada != null ? String(row.duracion_estimada) : "",
    semana: row.semana_cronograma ?? "",
    modalidad: (row.modalidad ?? "Presencial") as Actividad["modalidad"],
    esEvaluativa: row.es_evaluativa === "S",
    instrumento: row.instrumento_evaluacion ?? "",
    ponderacion: row.ponderacion ?? 0,
    notaMaxima: row.nota_maxima ?? undefined,
    generaEvidencias: row.genera_evidencias === "S",
    tipoEvidencia: row.tipo_evidencia ?? "",
    requiereValidacion: row.requiere_validacion_coordinador === "S",
    observaciones: row.observaciones_docente ?? "",
    contenidos: [],
    objetivos: [],
    descripcionUnidad: [],
    // El instrumento de la actividad vive aparte (`use-instrumento-actividad-query.ts`)
    // — ver nota arriba.
    rubrica: { id: 0, criterios: [] },
    listaCotejo: { id: 0, items: [] },
    escalaValoracion: {
      id: 0,
      criteriosGenerales: "",
      tipo: "Numérica",
      interpretacionRangos: "",
      niveles: [],
    },
    instrumentoPersonalizado: {
      descripcion: "",
      tipoEvidenciaEsperada: "",
      metodoValoracion: "",
      requiereArchivo: row.requiere_archivo === "S",
      requiereRespuestaTexto: row.requiere_texto === "S",
    },
    adaptaciones: [],
    asignaturaId: row.fk_tasignatura ?? undefined,
    grupoId: row.fk_tgrupo ?? undefined,
    camposDisponibles: row.campos_disponibles ?? undefined,
  }
}

function actividadDetalleUrl(id: number): string {
  return `/planeador/actividades/${id}`
}

export const actividadDetalleQueryKey = (id: number) => ["planeador", "actividad", id] as const

/**
 * Detalle de una actividad. El sobre `{rows: [...]}` es igual en mock y
 * real; lo que cambia es la forma de la fila — el mock ya entrega
 * `Actividad` completa (`normalizeActividad` solo defiende `recursos`
 * ausente), el real entrega `ActividadDetalleRow` y hay que traducirla con
 * `toActividadDetalle`. Si no existe, se lanza un error para que el
 * `<ErrorBoundary>` / toast del interceptor se encargue.
 */
async function fetchActividadDetalle(id: number): Promise<Actividad> {
  const rows = await evalCol.getRows<Actividad | ActividadDetalleRow>(actividadDetalleUrl(id))
  const first = rows[0]
  if (!first) {
    throw new Error(`No se encontró la actividad ${id}.`)
  }
  if (env.ENABLE_API_MOCKING) {
    return { ...(first as Actividad), recursos: (first as Actividad).recursos ?? [] }
  }
  return toActividadDetalle(first as ActividadDetalleRow)
}

export function useActividadDetalleQuery(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? actividadDetalleQueryKey(id) : ["planeador", "actividad", "none"],
    queryFn: () => fetchActividadDetalle(id!),
    enabled: id !== undefined,
    staleTime: 1000 * 60,
  })
}
