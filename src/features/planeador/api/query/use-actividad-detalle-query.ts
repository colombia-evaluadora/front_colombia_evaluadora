import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { env } from "@/config/env"
import { estadoDerivadoToStatus } from "@/features/planeador/lib/estado-derivado"
import { fetchTipoRecursoOptions, type TipoRecursoOption } from "@/features/planeador/api/query/use-tipo-recurso-catalog"
import { fetchTipoAdaptacionOptions, type TipoAdaptacionOption } from "@/features/planeador/api/query/use-tipo-adaptacion-catalog"
import { fetchAplicaAOptions, type AplicaAOption } from "@/features/planeador/api/query/use-aplica-a-catalog"
import type { Actividad, Adaptacion, Recurso, RecursoTipo } from "@/features/planeador/api/types/actividad"

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
  // `fn_actividad_buscar_por_pk` (V224/V440): evidencias/criterios YA
  // relacionados con esta actividad, con el pk de la RELACIÓN (no el del
  // enunciado/criterio) — es el mismo pk que exige
  // `PATCH .../evidencias/:id` / `PATCH .../criterios/:id` para quitarlos.
  evidencias: EvidenciaRelacionadaRow[] | null
  criterios: CriterioRelacionadoRow[] | null
  campos_disponibles: CamposDisponiblesRow | null
  unidad_configuracion: unknown
  active: boolean
}

interface EvidenciaRelacionadaRow {
  pk: number
  fkReferenteEnunciado: number
  texto: string
  fkPadre: number | null
  textoPadre: string | null
}

interface CriterioRelacionadoRow {
  pk: number
  fkTcriterioUnidad: number
  descripcion: string
  codigo: string | null
  orden: number
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
 * Ids de las evidencias (nivel 2, `PK_REFERENTE_ENUNCIADO`) ya marcadas
 * para ESTA actividad — antes no había ejemplo real de qué campo lo
 * confirmaba y quedaba fijo en `[]`; ahora `fn_actividad_buscar_por_pk`
 * (V224/V440) trae la columna `evidencias` con el pk de la RELACIÓN
 * (`TACTIVIDAD_EVIDENCIA`) y `fkReferenteEnunciado` (el id real de la
 * evidencia, que es lo que compara el checklist).
 */
function evidenciasIdsFromRow(raw: EvidenciaRelacionadaRow[] | null): number[] {
  return (raw ?? []).map((evidencia) => evidencia.fkReferenteEnunciado)
}

/**
 * Igual que `evidenciasIdsFromRow`, pero para los criterios de la rúbrica
 * de la unidad (`TACTIVIDAD_CRITERIO_UNIDAD`, columna `criterios` de
 * `fn_actividad_buscar_por_pk`).
 */
function criteriosUnidadIdsFromRow(raw: CriterioRelacionadoRow[] | null): number[] {
  return (raw ?? []).map((criterio) => criterio.fkTcriterioUnidad)
}

/**
 * `row.materiales` no tiene un ejemplo real capturado con datos (siempre
 * vino `[]` — ver el comentario largo de `interface ActividadDetalleRow`),
 * así que no hay forma de confirmar los nombres EXACTOS de sus campos. En
 * vez de dejarlo en `[]` (como antes, perdiendo lo guardado por
 * `useUpdateMaterialesActividad`), se lee de forma tolerante asumiendo que
 * el backend devuelve el mismo JSONB que `PUT .../materiales` guardó
 * (`{tipoRecurso, url, descripcion}`, ver `update-materiales-actividad.ts`)
 * — probando también la variante `snake_case` por si el motor la normaliza
 * al leer, igual que hace el resto de esta fila con sus pares
 * `fk_x`/`x` ya confirmados.
 *
 * Los recursos de tipo "Archivo" viajan como `multipart/form-data` (ver
 * `update-materiales-actividad.ts`), pero no hay un ejemplo real de cómo el
 * backend devuelve esos materiales en el detalle (¿`fkTarchivo`? ¿una URL de
 * descarga?) — hasta confirmarlo, esta lectura tolerante no intenta
 * resolverlos y caen al mismo fallback `"URL"` que cualquier campo
 * desconocido.
 */
function recursoFromMaterialRaw(raw: unknown, tipoRecursoOptions: TipoRecursoOption[], index: number): Recurso {
  const item = (raw ?? {}) as Record<string, unknown>
  const tipoRaw = item.tipoRecurso ?? item.tipo_recurso
  let tipo: RecursoTipo = "URL"
  if (typeof tipoRaw === "number") {
    tipo = tipoRecursoOptions.find((option) => option.id === tipoRaw)?.tipo ?? "URL"
  } else if (typeof tipoRaw === "string") {
    const lower = tipoRaw.toLowerCase()
    if (lower.includes("archivo")) tipo = "Archivo"
    else if (lower.includes("virtual") || lower.includes("repositorio")) tipo = "Unidad virtual"
  }
  const url = item.url ?? item.URL
  const descripcion = item.descripcion ?? item.DESCRIPCION
  return {
    // Ni el body de `PUT .../materiales` ni (hasta donde se confirmó) el
    // detalle traen un id propio por recurso — solo sirve de key en la
    // lista, así que el índice alcanza (mismo criterio que `syntheticId`
    // en `use-instrumento-actividad-form-query.ts`).
    id: index,
    titulo: "",
    fuente: "",
    tipo,
    url: typeof url === "string" ? url : "",
    descripcion: typeof descripcion === "string" ? descripcion : "",
  }
}

/**
 * `row.adaptaciones` tiene el mismo problema que `row.materiales`: sin
 * ejemplo real con datos, pero el confirmado body de
 * `PUT .../adaptaciones` (`update-adaptaciones-actividad.ts`) da la mejor
 * pista de sus campos: `{tipoAdaptacion, descripcion, usaVersionModificada,
 * aplicaA}`. Se lee tolerando `snake_case` igual que los materiales.
 *
 * `versionModificadaRef`/`estudiantesIds` NO tienen campo confirmado ni
 * para guardar ni para leer (mismo gap documentado en
 * `update-adaptaciones-actividad.ts`) — quedan vacíos en vez de inventar en
 * cuál de los tres tipos ("archivo"/"enlace"/"biblioteca") cayó, que sería
 * peor que no mostrar nada.
 */
function adaptacionFromRaw(
  raw: unknown,
  tipoAdaptacionOptions: TipoAdaptacionOption[],
  aplicaAOptions: AplicaAOption[],
): Adaptacion {
  const item = (raw ?? {}) as Record<string, unknown>
  const tipoRaw = item.tipoAdaptacion ?? item.tipo_adaptacion
  const tipo =
    typeof tipoRaw === "number"
      ? (tipoAdaptacionOptions.find((option) => option.id === tipoRaw)?.tipo ?? "")
      : typeof tipoRaw === "string"
        ? tipoRaw
        : ""
  const descripcionRaw = item.descripcion ?? item.DESCRIPCION
  const aplicaRaw = item.aplicaA ?? item.aplica_a
  const aplicaA =
    typeof aplicaRaw === "number"
      ? (aplicaAOptions.find((option) => option.id === aplicaRaw)?.valor ?? "")
      : typeof aplicaRaw === "string"
        ? aplicaRaw
        : ""
  return {
    tipo,
    descripcion: typeof descripcionRaw === "string" ? descripcionRaw : "",
    // `usaVersionModificadaRaw === "S"` solo dice que SÍ hay una versión
    // modificada, no cuál de las tres variantes ("archivo"/"enlace"/
    // "biblioteca") — mostrar cualquiera de ellas fijo sería afirmar un
    // dato que no se tiene, así que se deja en "no" (sin el campo auxiliar)
    // en vez de arriesgar el tipo equivocado.
    versionModificada: "no",
    versionModificadaRef: "",
    aplicaA,
    estudiantesIds: [],
  }
}

function toActividadDetalle(
  row: ActividadDetalleRow,
  tipoRecursoOptions: TipoRecursoOption[],
  tipoAdaptacionOptions: TipoAdaptacionOption[],
  aplicaAOptions: AplicaAOption[],
): Actividad {
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
    evidenciasIds: evidenciasIdsFromRow(row.evidencias),
    criteriosUnidadIds: criteriosUnidadIdsFromRow(row.criterios),
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
    recursos: row.materiales.map((raw, index) => recursoFromMaterialRaw(raw, tipoRecursoOptions, index)),
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
    adaptaciones: row.adaptaciones.map((raw) => adaptacionFromRaw(raw, tipoAdaptacionOptions, aplicaAOptions)),
    asignaturaId: row.fk_tasignatura ?? undefined,
    grupoId: row.fk_tgrupo ?? undefined,
    // El detalle real no trae de vuelta CUÁLES matrículas quedaron
    // asignadas (solo el conteo, `estudiantes_asignados`) — no hay endpoint
    // confirmado para leer la selección, solo para escribirla (ver el
    // comentario de `Actividad.matriculasIds`). Guardar de nuevo sin tocar
    // "Estudiantes" no cambia nada: `update-actividad.ts` solo manda
    // `FK_TMATRICULAS`/`ASIGNAR_TODO_EL_GRUPO` si el docente lo toca.
    matriculasIds: [],
    asignarTodoElGrupo: true,
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
  const [tipoRecursoOptions, tipoAdaptacionOptions, aplicaAOptions] = await Promise.all([
    fetchTipoRecursoOptions(),
    fetchTipoAdaptacionOptions(),
    fetchAplicaAOptions(),
  ])
  return toActividadDetalle(first as ActividadDetalleRow, tipoRecursoOptions, tipoAdaptacionOptions, aplicaAOptions)
}

export function useActividadDetalleQuery(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? actividadDetalleQueryKey(id) : ["planeador", "actividad", "none"],
    queryFn: () => fetchActividadDetalle(id!),
    enabled: id !== undefined,
    staleTime: 1000 * 60,
  })
}
