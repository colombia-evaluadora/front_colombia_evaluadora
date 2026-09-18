import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { estadoDerivadoToStatus } from "@/features/planeador/lib/estado-derivado"
import type { Actividad } from "@/features/planeador/api/types/actividad"

/**
 * `GET /planeador/actividades/mias` (V250, ver colección Postman
 * `planeador-pantalla-principal`) — listado del docente autenticado
 * (resuelto del token) para el rail izquierdo, reemplaza el hack de
 * `use-actividades-query.ts` (traer TODO con `size=500` y filtrar/paginar
 * en el cliente): acá `search`/`estados` ya filtran del lado del servidor y
 * `size`/`offset` paginan de verdad (con default 20/0 si se omiten).
 *
 * La fila es un RESUMEN, no el detalle completo de `Actividad` — por eso se
 * mapea rellenando con valores vacíos/neutros los campos que esta lista no
 * trae (materiales, rúbrica, adaptaciones, etc.): la card del rail
 * (`ActividadCard`) y sus diálogos de eliminar/exportar solo leen
 * `id`/`nombre`/`asignatura`/`grado`/`grupo`/`status`/`evaluados`/
 * `totalEstudiantes`, así que el resto nunca se renderiza desde acá. Abrir
 * la actividad (panel de detalle) pega aparte a
 * `useActividadDetalleQuery`, que sí trae todo.
 */
interface ActividadMiaRow {
  // `null` únicamente en la fila-centinela de un día vacío (ver `?dia=`
  // abajo): ese día no tiene ninguna actividad vigente, pero la fila igual
  // llega para traer `dia_anterior`/`dia_siguiente` y no dejar al usuario
  // sin forma de salir del día vacío.
  pk_tactividad: number | null
  titulo: string
  estado: string
  // Vienen como datetime ISO completo ("2026-09-01T00:00:00.000Z"),
  // confirmado contra el backend real — no como `yyyy-MM-dd` plano
  // (así lo mostraba, de forma solo ilustrativa, el ejemplo de la
  // colección Postman). Se normalizan a `yyyy-MM-dd` acá mismo.
  fecha_inicio: string
  fecha_cierre: string
  asignatura: string | null
  grupo: string | null
  /** Confirmado real (colección Postman `planeador-delta-cambios`, punto
   *  3.1): antes el resumen no traía grado, solo `grupo` — ahora llegan
   *  estos cuatro, con `grado_grupo` ya resuelto por el backend (ver el
   *  comentario de `Actividad.gradoGrupo`). */
  fk_tgrado: number | null
  grado: string | null
  grado_codigo: string | null
  grado_grupo: string | null
  unidad: string | null
  instrumento_evaluacion: string | null
  ponderacion: number | null
  es_evaluativa: "S" | "N"
  /** Nuevo en el listado (antes había que abrir el detalle para saberlo) —
   *  opcional para tolerar una respuesta vieja sin la columna. */
  es_recuperacion?: "S" | "N"
  estudiantes_asignados: number
  estudiantes_evaluados: number
  total_count: number
  // Presentes (no NULL) solo cuando se manda `?dia=` — sin él, "nada cambia
  // del comportamiento anterior" y vienen NULL (colección Postman 4.1/8.3).
  dia?: string | null
  dia_anterior?: string | null
  dia_siguiente?: string | null
}

function toDateOnly(value: string): string {
  return value.slice(0, 10)
}

function toActividadResumen(row: ActividadMiaRow & { pk_tactividad: number }): Actividad {
  return {
    id: row.pk_tactividad,
    nombre: row.titulo,
    // `tipo_actividad` real ("Trabajo en clase", "Tarea", …) no calza con
    // el union `ActividadTipo` del front (pensado para el form de alta) —
    // no importa acá: la card del rail no lo muestra.
    tipo: "Otro",
    esRecuperacion: row.es_recuperacion === "S",
    // El resumen de "Mis actividades" no trae la config de recuperación
    // (destino/tipoAplicacion/tipoCalculo/%) — la card del rail solo lee
    // `esRecuperacion` para el badge, así que estos quedan vacíos; abrir el
    // detalle real (`useActividadDetalleQuery`) sí los trae.
    recuperacionDestino: "",
    recuperacionActividadId: undefined,
    recuperacionTipoAplicacion: "",
    recuperacionTipoCalculo: "",
    recuperacionValorPonderacion: undefined,
    unidad: { id: 0, nombre: row.unidad ?? "" },
    evidenciasIds: [],
    criteriosUnidadIds: [],
    // El resumen de "Mis actividades" no trae la selección de estudiantes
    // puntuales (no hay endpoint confirmado para leerla, ver el comentario
    // de `Actividad.matriculasIds`) — mismo default que una actividad nueva.
    matriculasIds: [],
    asignarTodoElGrupo: true,
    asignatura: row.asignatura ?? "",
    grado: row.grado ?? "",
    grupo: row.grupo ?? "",
    gradoGrupo: row.grado_grupo ?? undefined,
    fechaInicio: toDateOnly(row.fecha_inicio),
    fechaCierre: toDateOnly(row.fecha_cierre),
    status: estadoDerivadoToStatus(row.estado),
    evaluados: row.estudiantes_evaluados,
    totalEstudiantes: row.estudiantes_asignados,
    materiales: "",
    recursos: [],
    duracionEstimada: "",
    semana: "",
    modalidad: "Presencial",
    esEvaluativa: row.es_evaluativa === "S",
    instrumento: row.instrumento_evaluacion ?? "",
    ponderacion: row.ponderacion ?? 0,
    generaEvidencias: false,
    tipoEvidencia: "",
    requiereValidacion: false,
    observaciones: "",
    contenidos: [],
    objetivos: [],
    descripcionUnidad: [],
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
      requiereArchivo: false,
      requiereRespuestaTexto: false,
    },
    adaptaciones: [],
  }
}

export interface UseActividadesMiasParams {
  search?: string
  asignatura?: number
  grupo?: number
  unidad?: number
  estados?: string
  diasGracia?: number
  size?: number
  offset?: number
  /** `yyyy-MM-dd` — paginado por día activo (colección Postman 4.1/8.3):
   *  solo actividades cuya ventana `[fechaInicio, fechaCierre]` CUBRE ese
   *  día. Sin esto, el listado no cambia (comportamiento previo). */
  dia?: string
}

interface ActividadesMiasResult {
  rows: Actividad[]
  totalCount: number
  /** Día `dia_anterior`/`dia_siguiente` que trae la respuesta cuando se pide
   *  `?dia=` — el día OCUPADO más cercano a cada lado (saltando vacíos),
   *  `null` cuando no hay más por ese lado. `undefined` si no se pidió
   *  `?dia=` (no hay de dónde sacarlos). */
  diaAnterior?: string | null
  diaSiguiente?: string | null
}

async function fetchActividadesMias(
  params: UseActividadesMiasParams,
): Promise<ActividadesMiasResult> {
  const query = new URLSearchParams()
  if (params.search) query.set("search", params.search)
  if (params.asignatura != null) query.set("asignatura", String(params.asignatura))
  if (params.grupo != null) query.set("grupo", String(params.grupo))
  if (params.unidad != null) query.set("unidad", String(params.unidad))
  if (params.estados) query.set("estados", params.estados)
  if (params.diasGracia != null) query.set("dias_gracia", String(params.diasGracia))
  if (params.dia) query.set("dia", params.dia)
  query.set("size", String(params.size ?? 20))
  query.set("offset", String(params.offset ?? 0))

  const rawRows = await evalCol.getRows<ActividadMiaRow>(`/planeador/actividades/mias?${query}`)
  const first = rawRows[0]
  // Fila-centinela de un día vacío: todas las columnas de negocio vienen
  // NULL (`pk_tactividad` incluido) y `total_count: 0` — no es una
  // actividad real, se descarta del listado pero sus `dia_*` sí sirven.
  const realRows = rawRows.filter(
    (row): row is ActividadMiaRow & { pk_tactividad: number } => row.pk_tactividad !== null,
  )
  return {
    rows: realRows.map(toActividadResumen),
    totalCount: first?.total_count ?? 0,
    diaAnterior: params.dia ? (first?.dia_anterior ?? null) : undefined,
    diaSiguiente: params.dia ? (first?.dia_siguiente ?? null) : undefined,
  }
}

/** Primer tanteo de `fetchTodasLasActividadesMias`. Con menos que esto casi
 *  siempre hacen falta dos viajes; con más, se pide de sobra en el caso
 *  normal. El segundo viaje solo ocurre si el docente supera esta cifra. */
const TAMANO_TANTEO = 200

/**
 * TODAS las actividades del docente, sin los filtros del rail.
 *
 * El listado de la pantalla va acotado por `dia` (el día activo de la barra
 * "Hoy | ‹ ›", que por defecto es hoy), `search` y `estados`, y además
 * paginado de a 50. Eso está bien para el rail, pero "Exportar todo" no
 * puede salir de ahí: exportaría solo las actividades vigentes en el día
 * que se esté mirando.
 *
 * Así que esto pide la misma lista SIN ninguno de esos filtros. El backend
 * devuelve `total_count` en cada fila, así que se tantea con
 * {@link TAMANO_TANTEO} y solo si el docente tiene más se repite el pedido
 * con el total exacto — en la práctica, un solo viaje.
 */
export async function fetchTodasLasActividadesMias(): Promise<Actividad[]> {
  const primera = await fetchActividadesMias({ size: TAMANO_TANTEO, offset: 0 })
  if (primera.totalCount <= primera.rows.length) return primera.rows
  const completa = await fetchActividadesMias({ size: primera.totalCount, offset: 0 })
  return completa.rows
}

export const actividadesMiasQueryKey = (params: UseActividadesMiasParams) =>
  ["planeador", "actividades-mias", params] as const

export function useActividadesMiasQuery(params: UseActividadesMiasParams) {
  return useQuery({
    queryKey: actividadesMiasQueryKey(params),
    queryFn: () => fetchActividadesMias(params),
    placeholderData: (previous) => previous,
    staleTime: 1000 * 30,
  })
}
