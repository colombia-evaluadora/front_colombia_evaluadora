import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

/**
 * `GET /planeador/actividades/configuracion?GRUPO=&ASIGNATURA=`
 * (`fn_actividad_configuracion_contexto`, V422/V440) — el único de los tres
 * endpoints de `campos_disponibles` (por contexto, por unidad, por
 * actividad) que además devuelve `programacion`: los topes reales de la
 * sección "Programación" del formulario (ventana del periodo académico del
 * grado, días hábiles del horario de ese grupo+asignatura, duración y
 * semana de cronograma admitidas).
 *
 * Hace falta consultarlo porque `fn_actividad_crear`/`fn_actividad_
 * actualizar` YA validan estos mismos límites al escribir
 * (`fn_actividad_programacion_assert`, V422) y responden 22023 si no se
 * cumplen — sin este query el formulario deja elegir cualquier fecha/
 * duración y el error solo aparece al guardar, sin decir por qué.
 *
 * `GRUPO`+`ASIGNATURA` son obligatorios (de ahí sale la ventana). `UNIDAD`
 * es OPCIONAL pero, si la actividad ya tiene una unidad elegida
 * ("Unidad temática asociada"/"Proyecto pedagógico"), hay que mandarlo: la
 * unidad puede acotar la ventana más todavía (su propia vigencia, dentro
 * del periodo académico del grado) — confirmado en vivo, sin `UNIDAD` la
 * respuesta sigue trayendo los topes genéricos de grado+asignatura, sin
 * angostarlos a la unidad puntual. `ES_EVALUATIVA`/`ES_SUMATIVO` sí siguen
 * sin pedirse acá: sirven para otros bloques de `campos_disponibles`
 * (evaluación/ponderación), que ya resuelven `useConfiguracionActividadQuery`
 * (con `ES_SUMATIVO`, ver su propio comentario)/`useReferenteCurricularQuery`
 * por su cuenta.
 */
interface DiaHabil {
  valor: number
  nombre: string
}

interface RangoFecha {
  min: string | null
  max: string | null
  diasHabiles: number[] | null
  motivo: string | null
}

interface RangoNumero {
  min: number | null
  max: number | null
  motivo: string | null
}

interface ProgramacionRaw {
  periodoAcademico: { pk: number; nombre: string; fechaInicio: string; fechaFin: string; semanas: number } | null
  intensidadHoraria: { bloquesPorSemana: number; diasHabiles: DiaHabil[] } | null
  fechaInicio: RangoFecha
  fechaCierre: RangoFecha
  semanaCronograma: RangoNumero
  duracionEstimada: RangoNumero & { unidad: string | null }
}

interface ConfiguracionContextoRow {
  configuracion: { programacion: ProgramacionRaw }
}

function firstRow(body: unknown): ConfiguracionContextoRow | undefined {
  if (Array.isArray(body)) return body[0] as ConfiguracionContextoRow | undefined
  if (body != null && typeof body === "object" && "rows" in body) {
    const rows = (body as { rows?: unknown }).rows
    return Array.isArray(rows) ? (rows[0] as ConfiguracionContextoRow | undefined) : undefined
  }
  return body as ConfiguracionContextoRow | undefined
}

export interface ProgramacionActividad {
  periodoAcademico: { nombre: string; fechaInicio: Date | null; fechaFin: Date | null; semanas: number } | null
  intensidadHoraria: {
    bloquesPorSemana: number
    // Ya convertidos a la convención de `Date.getDay()`, mismo criterio
    // que `fechaInicio`/`fechaCierre.diasHabiles` — ver `toDiaSemanaJs`.
    diasHabiles: { valorJs: number; nombre: string }[]
  } | null
  fechaInicio: { min: Date | null; max: Date | null; diasHabiles: number[] | null; motivo: string | null }
  fechaCierre: { min: Date | null; max: Date | null; diasHabiles: number[] | null; motivo: string | null }
  semanaCronograma: { min: number | null; max: number | null; motivo: string | null }
  duracionEstimada: { min: number | null; max: number | null; unidad: string | null; motivo: string | null }
}

function toDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * El backend numera los días 1-7 con DOMINGO = 1 (confirmado real: la
 * respuesta trae `intensidadHoraria.diasHabiles` con nombre, y `valor: 2`
 * viene etiquetado "Lunes", `valor: 4` "Miércoles" — 1 = domingo, no 0).
 * `DatePicker.enabledDaysOfWeek`/`date-fns` usan la convención de
 * `Date.getDay()` (0-6, DOMINGO = 0) — sin esta conversión, cada `valor`
 * del backend calzaba con el día siguiente en el calendario (Lunes real
 * bloqueado como si fuera Martes, etc.).
 */
function toDiaSemanaJs(valorBackend: number): number {
  return valorBackend - 1
}

function toRangoFecha(raw: RangoFecha | undefined): ProgramacionActividad["fechaInicio"] {
  return {
    min: toDate(raw?.min ?? null),
    max: toDate(raw?.max ?? null),
    diasHabiles: raw?.diasHabiles?.map(toDiaSemanaJs) ?? null,
    motivo: raw?.motivo ?? null,
  }
}

async function fetchProgramacionActividad(
  grupoId: number,
  asignaturaId: number,
  unidadId: number | undefined,
): Promise<ProgramacionActividad | undefined> {
  const query = `GRUPO=${grupoId}&ASIGNATURA=${asignaturaId}${unidadId != null ? `&UNIDAD=${unidadId}` : ""}`
  const body = await api.get(`/eval-col/planeador/actividades/configuracion?${query}`)
  const programacion = firstRow(body)?.configuracion?.programacion
  if (!programacion) return undefined
  return {
    periodoAcademico: programacion.periodoAcademico
      ? {
          nombre: programacion.periodoAcademico.nombre,
          fechaInicio: toDate(programacion.periodoAcademico.fechaInicio),
          fechaFin: toDate(programacion.periodoAcademico.fechaFin),
          semanas: programacion.periodoAcademico.semanas,
        }
      : null,
    intensidadHoraria: programacion.intensidadHoraria
      ? {
          bloquesPorSemana: programacion.intensidadHoraria.bloquesPorSemana,
          diasHabiles: programacion.intensidadHoraria.diasHabiles.map((dia) => ({
            valorJs: toDiaSemanaJs(dia.valor),
            nombre: dia.nombre,
          })),
        }
      : null,
    fechaInicio: toRangoFecha(programacion.fechaInicio),
    fechaCierre: toRangoFecha(programacion.fechaCierre),
    semanaCronograma: {
      min: programacion.semanaCronograma?.min ?? null,
      max: programacion.semanaCronograma?.max ?? null,
      motivo: programacion.semanaCronograma?.motivo ?? null,
    },
    duracionEstimada: {
      min: programacion.duracionEstimada?.min ?? null,
      max: programacion.duracionEstimada?.max ?? null,
      unidad: programacion.duracionEstimada?.unidad ?? null,
      motivo: programacion.duracionEstimada?.motivo ?? null,
    },
  }
}

export const programacionActividadQueryKey = (
  grupoId: number,
  asignaturaId: number,
  unidadId: number | undefined,
) => ["planeador", "actividades", "configuracion", "programacion", grupoId, asignaturaId, unidadId] as const

/**
 * Topes reales de la sección "Programación", para bloquearlos en el
 * calendario/inputs en vez de dejar que el 22023 de `fn_actividad_crear`/
 * `_actualizar` sea la única señal de que una fecha o duración no aplica.
 *
 * `unidadId`: el `id` de "Unidad temática asociada" ya elegida en el form
 * (`0`/`undefined` = sin unidad, mismo sentinel que el resto del form —
 * ver `UnidadAsociadaSection`) — se manda como `UNIDAD` para que la ventana
 * venga acotada a esa unidad puntual, no solo a grado+asignatura.
 */
export function useProgramacionActividadQuery(
  grupoId: number | undefined,
  asignaturaId: number | undefined,
  unidadId?: number,
) {
  const enabled = grupoId != null && asignaturaId != null
  const unidadIdEfectivo = unidadId || undefined
  return useQuery({
    queryKey: enabled
      ? programacionActividadQueryKey(grupoId, asignaturaId, unidadIdEfectivo)
      : (["planeador", "actividades", "configuracion", "programacion", "none"] as const),
    queryFn: () => fetchProgramacionActividad(grupoId!, asignaturaId!, unidadIdEfectivo),
    enabled,
    staleTime: 1000 * 60,
  })
}
