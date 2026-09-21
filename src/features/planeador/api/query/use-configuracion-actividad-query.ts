import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { defaultRecuperacionCampoDisponible, type Actividad } from "@/features/planeador/api/types/actividad"
import { normalizeInstrumentosPermitidos } from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"

/**
 * `GET /planeador/unidades/:id/configuracion-actividad?ES_SUMATIVO=S|N`
 * (confirmado real, colección Postman `planeador-flujo-unidad-actividad`,
 * paso 6): el equivalente de `campos_disponibles` de
 * `GET /actividades/:id/configuracion` (guía completa, 5.1) para cuando la
 * actividad TODAVÍA no existe — ese otro endpoint exige un PK de actividad
 * que en el formulario de alta no hay. Con la unidad ya elegida en el
 * `<Select>` de "Unidad temática asociada", esto dice qué mostrar/exigir
 * ANTES de crear, con la misma forma que ya usa el detalle real
 * (`Actividad.camposDisponibles`).
 *
 * El parámetro de ESTA ruta es `ES_SUMATIVO`, no `ES_EVALUATIVA` (que sí es
 * el nombre correcto para el campo `ES_EVALUATIVA` del body de
 * `POST`/`PUT /planeador/actividades` — son dos cosas distintas, no un
 * alias). Va en MAYÚSCULAS y como `S`/`N` en la query — el binder del motor
 * solo hace `toUpperCase()`, así que `?esSumativa=` se ignora en silencio
 * (mismo aviso documentado en la colección Postman).
 */
type CamposDisponibles = NonNullable<Actividad["camposDisponibles"]>

/** Misma fila cruda que `GET .../actividades/:id` — `evaluacion.
 *  instrumentosPermitidos` viene como `{pk, valor, etiqueta, nombre,
 *  variantes, campos}[]`, no `string[]` (ver `normalizeInstrumentosPermitidos`). */
type CamposDisponiblesRaw = Omit<CamposDisponibles, "evaluacion" | "recuperacion"> & {
  evaluacion: Omit<CamposDisponibles["evaluacion"], "instrumentosPermitidos"> & {
    instrumentosPermitidos: Parameters<typeof normalizeInstrumentosPermitidos>[0]
  }
  recuperacion?: CamposDisponibles["recuperacion"]
}

interface ConfiguracionActividadRow {
  configuracion: { campos_disponibles: CamposDisponiblesRaw }
}

/** Mismo blindaje de forma que `use-unidad-referente-query.ts`: tolera
 *  array suelto, `{rows: [...]}`, u objeto suelto. */
function firstRow(body: unknown): ConfiguracionActividadRow | undefined {
  if (Array.isArray(body)) return body[0] as ConfiguracionActividadRow | undefined
  if (body != null && typeof body === "object" && "rows" in body) {
    const rows = (body as { rows?: unknown }).rows
    return Array.isArray(rows) ? (rows[0] as ConfiguracionActividadRow | undefined) : undefined
  }
  return body as ConfiguracionActividadRow | undefined
}

async function fetchConfiguracionActividad(
  unidadId: number,
  esEvaluativa: boolean,
): Promise<CamposDisponibles | undefined> {
  const body = await api.get(
    `/eval-col/planeador/unidades/${unidadId}/configuracion-actividad?ES_SUMATIVO=${esEvaluativa ? "S" : "N"}`,
  )
  const campos = firstRow(body)?.configuracion?.campos_disponibles
  if (!campos) return undefined
  return {
    ...campos,
    evaluacion: {
      ...campos.evaluacion,
      instrumentosPermitidos: normalizeInstrumentosPermitidos(campos.evaluacion.instrumentosPermitidos),
    },
    recuperacion: campos.recuperacion ?? defaultRecuperacionCampoDisponible(),
  }
}

export const configuracionActividadQueryKey = (unidadId: number, esEvaluativa: boolean) =>
  ["planeador", "unidad", unidadId, "configuracion-actividad", esEvaluativa] as const

/**
 * Campos obligatorios/visibles para crear una actividad EN esta unidad,
 * antes de que la actividad exista todavía — la misma fuente de verdad que
 * `EvaluacionSection` ya usa para editar (`Actividad.camposDisponibles`),
 * en vez de re-adivinar la regla del lado del cliente con
 * `useUnidadReferenteQuery`/`useReferenteCurricularQuery`.
 */
export function useConfiguracionActividadQuery(unidadId: number | undefined, esEvaluativa: boolean) {
  return useQuery({
    queryKey:
      unidadId != null
        ? configuracionActividadQueryKey(unidadId, esEvaluativa)
        : (["planeador", "unidad", "none", "configuracion-actividad", esEvaluativa] as const),
    queryFn: () => fetchConfiguracionActividad(unidadId!, esEvaluativa),
    enabled: unidadId != null,
    staleTime: 1000 * 60,
  })
}

/**
 * `GET /planeador/actividades/configuracion?GRUPO=&ASIGNATURA=&ES_SUMATIVO=`
 * (`fn_actividad_configuracion_contexto`) — el mismo `campos_disponibles`
 * que `useConfiguracionActividadQuery`, pero para una actividad SIN unidad
 * (huérfana o recién creada sin vincular): ese otro endpoint exige
 * `:unidadId` en el path y no sirve acá. `GRUPO`/`ASIGNATURA` son
 * obligatorios para el backend — sin los dos, ni se llama.
 *
 * La fila viene envuelta bajo `configuracion` — mismo shape ya CONFIRMADO
 * EN VIVO contra este mismo endpoint por `use-programacion-actividad-
 * query.ts` (que lee `configuracion.programacion`, no `programacion`
 * suelto): `{configuracion: {programacion, campos_disponibles}}`.
 */
interface ConfiguracionContextoRow {
  configuracion: { campos_disponibles: CamposDisponiblesRaw }
}

function firstRowContexto(body: unknown): ConfiguracionContextoRow | undefined {
  if (Array.isArray(body)) return body[0] as ConfiguracionContextoRow | undefined
  if (body != null && typeof body === "object" && "rows" in body) {
    const rows = (body as { rows?: unknown }).rows
    return Array.isArray(rows) ? (rows[0] as ConfiguracionContextoRow | undefined) : undefined
  }
  return body as ConfiguracionContextoRow | undefined
}

async function fetchConfiguracionContexto(
  grupoId: number,
  asignaturaId: number,
  esEvaluativa: boolean,
  recuperar = false,
): Promise<CamposDisponibles | undefined> {
  const params = new URLSearchParams({
    GRUPO: String(grupoId),
    ASIGNATURA: String(asignaturaId),
    ES_SUMATIVO: esEvaluativa ? "S" : "N",
  })
  // Solo se agrega si hace falta: mandar `RECUPERAR=N` explícito es
  // equivalente al default del backend, pero infla la query key (y por lo
  // tanto el caché) con una variante idéntica a la de sin el param.
  if (recuperar) params.set("RECUPERAR", "S")
  const body = await api.get(`/eval-col/planeador/actividades/configuracion?${params}`)
  const campos = firstRowContexto(body)?.configuracion?.campos_disponibles
  if (!campos) return undefined
  return {
    ...campos,
    evaluacion: {
      ...campos.evaluacion,
      instrumentosPermitidos: normalizeInstrumentosPermitidos(campos.evaluacion.instrumentosPermitidos),
    },
    recuperacion: campos.recuperacion ?? defaultRecuperacionCampoDisponible(),
  }
}

export const configuracionContextoActividadQueryKey = (
  grupoId: number,
  asignaturaId: number,
  esEvaluativa: boolean,
) => ["planeador", "actividad", "configuracion-contexto", grupoId, asignaturaId, esEvaluativa] as const

/**
 * Igual que `useConfiguracionActividadQuery`, para cuando la actividad
 * TODAVÍA no tiene (ni va a tener) una unidad asociada — por ejemplo, al
 * elegir la actividad a recuperar y autocompletar Grado/Grupo/Asignatura
 * (`useRecuperacionAutoFill`) sin pasar por "Unidad temática asociada".
 */
export function useConfiguracionContextoActividadQuery(
  grupoId: number | undefined,
  asignaturaId: number | undefined,
  esEvaluativa: boolean,
) {
  const enabled = grupoId != null && asignaturaId != null
  return useQuery({
    queryKey: enabled
      ? configuracionContextoActividadQueryKey(grupoId, asignaturaId, esEvaluativa)
      : (["planeador", "actividad", "configuracion-contexto", "none", esEvaluativa] as const),
    queryFn: () => fetchConfiguracionContexto(grupoId!, asignaturaId!, esEvaluativa),
    enabled,
    staleTime: 1000 * 60,
  })
}

export const actividadesRecuperablesQueryKey = (grupoId: number, asignaturaId: number) =>
  ["planeador", "actividad", "actividades-recuperables", grupoId, asignaturaId] as const

/**
 * `GET /planeador/actividades/configuracion?GRUPO=&ASIGNATURA=&ES_SUMATIVO=S&RECUPERAR=S`
 * (guía `planeador-recuperacion-actividad`, paso 2: "¿Qué desea recuperar?")
 * — la lista de actividades recuperables YA filtrada por el backend
 * (sumativa, no es ella misma una recuperación, activa, sin otra
 * recuperación activa apuntándole).
 *
 * `ES_SUMATIVO=S` fijo porque no hay otro caso de uso real: una actividad
 * de recuperación siempre es sumativa (ver el bloqueo del mismo nombre en
 * `EvaluacionSection`), así que preguntar por recuperables de una NO
 * sumativa no tiene sentido.
 *
 * Antes `ActividadRecuperarCascada` usaba `useActividadesMiasQuery`
 * (`/actividades/mias`, el listado genérico del rail) y filtraba en el
 * cliente solo por `esEvaluativa` — dejaba elegir una actividad que YA es
 * una recuperación, o que YA tiene otra recuperación activa apuntándole,
 * ninguna de las dos visible en ese listado; el guardado terminaba
 * rechazándolas con 422/23505 sin que la UI lo hubiera anticipado.
 */
export function useActividadesRecuperablesQuery(grupoId: number | undefined, asignaturaId: number | undefined) {
  const enabled = grupoId != null && asignaturaId != null
  return useQuery({
    queryKey: enabled
      ? actividadesRecuperablesQueryKey(grupoId, asignaturaId)
      : (["planeador", "actividad", "actividades-recuperables", "none"] as const),
    queryFn: () => fetchConfiguracionContexto(grupoId!, asignaturaId!, true, true),
    select: (campos) => campos?.recuperacion.actividadesRecuperables ?? [],
    enabled,
    staleTime: 1000 * 30,
  })
}
