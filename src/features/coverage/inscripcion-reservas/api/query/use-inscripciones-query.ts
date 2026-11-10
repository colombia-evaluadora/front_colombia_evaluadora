import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { fetchGrados } from "@/features/coverage/matricula/api/query/use-matricula-dependent-catalogs-query"
import { fetchEstablishmentsOptions } from "@/features/establishment/institution/api/query/use-establishments-options"
import type {
  EstadoInscripcion,
  EstadoOpcion,
  GrupoAdmision,
  InscripcionDetalle,
  InscripcionesQueryRequest,
  InscripcionesQueryResponse,
  ListaSorteo,
  RevisionSoporte,
  SituacionEdad,
} from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"
import type { GrupoAdmisionConfig } from "@/features/coverage/inscripcion-reservas/api/types/configuracion"

// Endpoints de sso V426. Los wrappers devuelven `SELECT fn(...) AS datos`: una fila con el JSON.
export const INSCRIPCIONES_BASE = "/cobertura-academica/inscripciones"
export const datos = <T>(row: { datos: T }) => row.datos

const all = ["inscripciones"] as const

export const inscripcionesKeys = {
  all,
  lista: (grupoId: string, params: InscripcionesQueryRequest) =>
    [...all, "lista", grupoId, params] as const,
  gruposAdmision: [...all, "grupos-admision"] as const,
  detalle: (id: string) => [...all, "detalle", id] as const,
  listaSorteo: (grupoId: string, grado: string, jornada: string | undefined) =>
    [...all, "lista-sorteo", grupoId, grado, jornada ?? null] as const,
  catalogos: [...all, "catalogos"] as const,
}

/** Establecimiento que consulta: el primero de los del usuario. */
export async function fetchEstablecimientoId(): Promise<number | null> {
  const { rows } = await fetchEstablishmentsOptions()
  return rows[0]?.id ?? null
}

// --- Grupos de admisión ------------------------------------------------------

/** JSON de `fn_grupo_admision_detalle_interno`. */
export interface GrupoAdmisionRow {
  id: number
  anio: string | number
  modalidad: string
  ciclo: number
  fechaCierre: string | null
  menorFechaLimiteMatricula: string
  modoAdmision: GrupoAdmisionConfig["modoAdmision"]
  desempate: GrupoAdmisionConfig["desempate"]
  sorteoEjecutado: boolean
  bloqueado: boolean
  configurado: boolean
  criterios: number[]
  documentosRequeridos: number[]
  /** "Sede · Jornada" de cada período del grupo. */
  periodos: { id: number; nombre: string }[]
}

export async function fetchGruposAdmisionRows(ee: number): Promise<GrupoAdmisionRow[]> {
  const [row] = await evalCol.getRows<{ datos: GrupoAdmisionRow[] }>(
    `${INSCRIPCIONES_BASE}/configuracion/establecimiento/${ee}/grupos`,
  )
  return row ? datos(row) : []
}

async function fetchGruposAdmision(): Promise<GrupoAdmision[]> {
  const ee = await fetchEstablecimientoId()
  if (ee == null) return []
  const grupos = await fetchGruposAdmisionRows(ee)
  return Promise.all(
    grupos.map(async (g) => {
      // El grupo no trae grados: salen de sus períodos.
      const grados = new Set<string>()
      for (const p of g.periodos) for (const gr of await fetchGrados(p.id)) grados.add(gr.nombre)
      const jornadas = [
        ...new Set(g.periodos.map((p) => p.nombre.split(" · ").at(-1) ?? "")),
      ].filter(Boolean)
      return {
        id: String(g.id),
        establecimientoId: ee,
        anio: Number(g.anio),
        modalidad: g.modalidad,
        ciclo: g.ciclo,
        desempate: g.desempate,
        fechaCierre: g.fechaCierre ?? "",
        sorteoEjecutado: g.sorteoEjecutado,
        grados: [...grados],
        jornadas,
      }
    }),
  )
}

/** Grupos de admisión del establecimiento (Año · Modalidad · Ciclo). */
export function useGruposAdmisionQuery() {
  return useQuery({ queryKey: inscripcionesKeys.gruposAdmision, queryFn: fetchGruposAdmision })
}

/** El grupo elegido, o el primero (el más reciente). */
export function useGrupoAdmisionQuery(grupoId?: string) {
  const query = useGruposAdmisionQuery()
  const grupos = query.data ?? []
  return { ...query, grupos, data: grupos.find((g) => g.id === grupoId) ?? grupos[0] }
}

export const formatGrupoAdmision = (g: Pick<GrupoAdmision, "anio" | "modalidad" | "ciclo">) =>
  `${g.anio} · ${g.modalidad} · Ciclo ${g.ciclo}`

// --- Lista -------------------------------------------------------------------

/** Fila de `fn_inscripcion_listar_interno`. */
export interface OpcionInscripcionRow {
  id: number
  inscripcion_id: number
  posicion: number
  numero_inscripcion: string
  aspirante: string
  documento: string
  documentos_faltantes: string[] | null
  prioridad: string | null
  numero_sorteo: number | null
  preferencia: number
  estado_opcion: EstadoOpcion
  estado_inscripcion: EstadoInscripcion
  total_opciones: number
  situacion_edad: SituacionEdad
  cupos_disponibles: number
  total_count: number
}

export const formatNumeroSorteo = (n: number | null) =>
  n == null ? null : String(n).padStart(4, "0")

export async function fetchInscripciones(
  grupo: GrupoAdmision,
  { filters, pageIndex, pageSize }: InscripcionesQueryRequest,
): Promise<InscripcionesQueryResponse> {
  const rows = await evalCol.postRows<OpcionInscripcionRow>(`${INSCRIPCIONES_BASE}/query`, {
    FK_TESTABLECIMIENTO: grupo.establecimientoId,
    FK_TGRUPO_ADMISION: Number(grupo.id),
    FILTERS: {
      GRADO: filters.grado,
      JORNADA: filters.jornada ?? null,
      SEARCH: filters.q ?? null,
      ESTADOS: filters.estados ?? [],
    },
    PAGEINDEX: pageIndex,
    PAGESIZE: pageSize,
  })
  const total = Number(rows[0]?.total_count ?? 0)
  return {
    rows: rows.map((r) => ({
      id: String(r.id),
      inscripcionId: String(r.inscripcion_id),
      posicion: Number(r.posicion),
      numeroInscripcion: r.numero_inscripcion,
      aspirante: r.aspirante,
      documento: r.documento,
      documentosFaltantes: r.documentos_faltantes ?? [],
      documentosIncompletos: (r.documentos_faltantes ?? []).length > 0,
      prioridad: r.prioridad,
      numeroSorteo: formatNumeroSorteo(r.numero_sorteo),
      preferencia: r.preferencia,
      estadoOpcion: r.estado_opcion,
      estadoInscripcion: r.estado_inscripcion,
      situacionEdad: r.situacion_edad ?? "SIN_CALCULAR",
      totalOpciones: Number(r.total_opciones),
    })),
    pageCount: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
    totalCount: total,
    // El back la repite por fila; sin filas no hay de dónde leerla.
    cuposDisponibles: rows[0]?.cupos_disponibles ?? 0,
  }
}

export function useInscripcionesQuery(
  grupo: GrupoAdmision | undefined,
  params: InscripcionesQueryRequest,
) {
  return useQuery({
    queryKey: inscripcionesKeys.lista(grupo?.id ?? "none", params),
    queryFn: () => fetchInscripciones(grupo as GrupoAdmision, params),
    placeholderData: (previous) => previous,
    // Sin grupo ni grado no hay lista: el grado es obligatorio para admitir.
    enabled: Boolean(grupo && params.filters.grado),
  })
}

// --- Detalle -----------------------------------------------------------------

export interface PersonaInscripcionRow {
  usuarioId: number
  tipoDocumento: string | null
  documento: string
  primerNombre: string
  segundoNombre: string | null
  primerApellido: string
  segundoApellido: string | null
  fechaNacimiento: string | null
  genero: string | null
  telefono: string | null
  email: string | null
  parentesco?: string | null
}

/** JSON de `fn_inscripcion_detalle_interno`. */
export interface InscripcionDetalleRow {
  id: number
  numeroInscripcion: string
  estado: EstadoInscripcion
  documentoHermano: string | null
  paisOrigen: string | null
  lenguaMaterna: string | null
  condicionMigratoria: string | null
  opciones: {
    id: number
    preferencia: number
    grado: string
    establecimiento: string
    sede: string
    jornada: string
    numeroSorteo: number | null
    estado: EstadoOpcion
    hermanoVerificado: boolean
  }[]
  estudiante: PersonaInscripcionRow
  acudiente: PersonaInscripcionRow | null
  soportes: { tipoId: number; nombre: string; archivo: string | null; revision: RevisionSoporte }[]
}

export function toInscripcionDetalle(d: InscripcionDetalleRow): InscripcionDetalle {
  const e = d.estudiante
  const a = d.acudiente
  return {
    id: String(d.id),
    numeroInscripcion: d.numeroInscripcion,
    grado: d.opciones[0]?.grado ?? "",
    estado: d.estado,
    documentoHermano: d.documentoHermano,
    opciones: d.opciones.map((o) => ({
      id: String(o.id),
      preferencia: o.preferencia,
      establecimiento: o.establecimiento,
      sede: o.sede,
      jornada: o.jornada,
      numeroSorteo: formatNumeroSorteo(o.numeroSorteo),
      estado: o.estado,
      hermanoVerificado: o.hermanoVerificado,
    })),
    estudiante: {
      tipoDocumento: e.tipoDocumento ?? "",
      documento: e.documento,
      genero: e.genero ?? "",
      primerNombre: e.primerNombre,
      segundoNombre: e.segundoNombre,
      primerApellido: e.primerApellido,
      segundoApellido: e.segundoApellido,
      fechaNacimiento: e.fechaNacimiento ?? "",
      paisOrigen: d.paisOrigen ?? "",
      // La inscripción todavía no los guarda.
      lugarExpedicion: "",
      lugarNacimiento: "",
      etnia: "",
      lenguaMaterna: d.lenguaMaterna ?? "",
      condicionMigratoria: d.condicionMigratoria ?? "",
    },
    acudiente: {
      parentesco: a?.parentesco ?? "",
      tipoDocumento: a?.tipoDocumento ?? "",
      documento: a?.documento ?? "",
      nombre: [a?.primerNombre, a?.segundoNombre].filter(Boolean).join(" "),
      primerApellido: a?.primerApellido ?? "",
      segundoApellido: a?.segundoApellido ?? null,
      telefono: a?.telefono ?? "",
      email: a?.email ?? "",
    },
    soportes: d.soportes.map((s) => ({
      id: String(s.tipoId),
      nombre: s.nombre,
      archivo: s.archivo,
      revision: s.revision,
    })),
  }
}

export function useInscripcionDetalleQuery(id: string) {
  return useQuery({
    queryKey: inscripcionesKeys.detalle(id),
    queryFn: async () =>
      toInscripcionDetalle(
        datos(
          await evalCol.getRow<{ datos: InscripcionDetalleRow }>(`${INSCRIPCIONES_BASE}/${id}`),
        ),
      ),
    enabled: Boolean(id),
  })
}

// --- Lista del sorteo --------------------------------------------------------

/** Datos del documento Lista del sorteo para un grado (y jornada). */
export function useListaSorteoQuery(
  grupoId: string,
  grado: string,
  jornada: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: inscripcionesKeys.listaSorteo(grupoId, grado, jornada),
    queryFn: async () =>
      datos(
        await evalCol.postRow<{ datos: ListaSorteo }>(`${INSCRIPCIONES_BASE}/lista-sorteo/datos`, {
          FK_TGRUPO_ADMISION: Number(grupoId),
          GRADO: grado,
          JORNADA: jornada ?? null,
        }),
      ),
    enabled: enabled && Boolean(grado),
  })
}

// --- Catálogos ---------------------------------------------------------------

type ItemCatalogo = { id: number; nombre: string }

/** JSON de `fn_inscripcion_catalogos_interno`. */
export interface CatalogosInscripcion {
  criterios: ItemCatalogo[]
  documentos: ItemCatalogo[]
  motivosNoAdmision: ItemCatalogo[]
  motivosAnulacion: ItemCatalogo[]
}

export async function fetchCatalogosInscripcion(): Promise<CatalogosInscripcion> {
  const ee = await fetchEstablecimientoId()
  if (ee == null)
    return { criterios: [], documentos: [], motivosNoAdmision: [], motivosAnulacion: [] }
  return datos(
    await evalCol.getRow<{ datos: CatalogosInscripcion }>(
      `${INSCRIPCIONES_BASE}/configuracion/catalogos/${ee}`,
    ),
  )
}

export function useCatalogosInscripcionQuery() {
  return useQuery({
    queryKey: inscripcionesKeys.catalogos,
    queryFn: fetchCatalogosInscripcion,
    staleTime: Infinity,
  })
}

/** Motivos de no admisión y de anulación (Listas de Valores), por nombre. */
export function useMotivosInscripcion() {
  const { data } = useCatalogosInscripcionQuery()
  return {
    noAdmision: (data?.motivosNoAdmision ?? []).map((m) => m.nombre),
    anulacion: (data?.motivosAnulacion ?? []).map((m) => m.nombre),
  }
}

// --- Cascada de opciones -----------------------------------------------------

/** Período en Inscripciones que todavía recibe opciones (`fn_inscripcion_opciones_cupo_interno`). */
export interface PeriodoOpcionCupo {
  periodoId: number
  establecimientoId: number
  establecimiento: string
  sede: string
  jornada: string
  grupoAdmisionId: number
  grupoAdmision: string
  grados: { id: number; nombre: string }[]
}

export const opcionesCupoKey = [...all, "opciones-cupo"] as const

export async function fetchOpcionesCupo(): Promise<PeriodoOpcionCupo[]> {
  return datos(
    await evalCol.getRow<{ datos: PeriodoOpcionCupo[] }>(`${INSCRIPCIONES_BASE}/opciones-cupo`),
  )
}

/** Cascada de Nueva inscripción y Ampliar: períodos de todos los establecimientos, no solo los del usuario. */
export function useOpcionesCupoQuery() {
  return useQuery({ queryKey: opcionesCupoKey, queryFn: fetchOpcionesCupo, staleTime: 5 * 60_000 })
}
