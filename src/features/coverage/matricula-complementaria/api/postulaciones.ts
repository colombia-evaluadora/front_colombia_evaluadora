import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"
import { invalidarMatriculas } from "@/features/coverage/matricula/api/query-keys"
import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

import { camelizar, convocatoriaKeys } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import type {
  OpcionesPostulacion,
  OpcionPostulacion,
  Postulacion,
  PrincipalPostulable,
} from "@/features/coverage/matricula-complementaria/api/types"

// Postulaciones de la matrícula complementaria (Sección 2.16.2): cada una con
// 1 a 3 opciones de especialidad ordenadas por preferencia.

const BASE = "/cobertura-academica/matricula-complementaria/postulaciones"

const all = ["matricula-complementaria", "postulaciones"] as const
const detalle = (id: number | "none") => [...all, id] as const
export const postulacionKeys = {
  all,
  lista: <P>(params: P) => [...all, "lista", params] as const,
  detalle,
  principales: (q: string) => [...all, "principales", q] as const,
  opciones: (matriculaId: number | null) => [...all, "opciones", matriculaId] as const,
  matricula: (id: number) => [...detalle(id), "matricula"] as const,
  motivosAnulacion: [...all, "motivos-anulacion"] as const,
}

export interface PostulacionesParams {
  search?: string
  convocatoria?: number
  grado?: string
  /** Roles territoriales: establecimiento elegido. */
  establecimiento?: number
  pageIndex: number
  pageSize: number
}

/** `opciones` puede llegar como texto JSON. */
function aPostulacion(r: unknown): Postulacion {
  const p = camelizar<Postulacion & { opciones: unknown }>(r)
  const opciones = typeof p.opciones === "string" ? camelizar<OpcionPostulacion[]>(JSON.parse(p.opciones)) : p.opciones
  return { ...p, opciones: ((opciones as OpcionPostulacion[]) ?? []).slice().sort((a, b) => a.orden - b.orden) }
}

export async function fetchPostulaciones(p: PostulacionesParams) {
  const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/query`, {
    SEARCH: p.search || null,
    FK_CONVOCATORIA: p.convocatoria ?? null,
    GRADO: p.grado || null,
    ESTABLECIMIENTO: p.establecimiento ?? null,
    PAGE_INDEX: p.pageIndex,
    PAGE_SIZE: p.pageSize,
  })
  return toPaginated(rows, { pageSize: p.pageSize, map: aPostulacion })
}

export function usePostulacionesQuery(p: PostulacionesParams) {
  return useQuery({
    queryKey: postulacionKeys.lista(p),
    queryFn: () => fetchPostulaciones(p),
    placeholderData: keepPreviousData,
  })
}

export async function fetchPostulacion(id: number) {
  return aPostulacion(await evalCol.getRow(`${BASE}/${id}`))
}

export function usePostulacionQuery(id: number | null) {
  return useQuery({
    queryKey: postulacionKeys.detalle(id ?? "none"),
    queryFn: () => fetchPostulacion(id as number),
    enabled: id != null,
  })
}

/** Matrículas principales Cursando del origen, sin complementaria ni postulación vigente. */
export function usePrincipalesPostulablesQuery(q: string) {
  return useQuery({
    queryKey: postulacionKeys.principales(q),
    queryFn: async () =>
      camelizar<PrincipalPostulable[]>(await evalCol.getRows(`${BASE}/principales?Q=${encodeURIComponent(q)}`)),
    placeholderData: keepPreviousData,
  })
}

export function useOpcionesPostulacionQuery(matriculaId: number | null) {
  return useQuery({
    queryKey: postulacionKeys.opciones(matriculaId),
    queryFn: async () =>
      camelizar<OpcionesPostulacion>(await evalCol.getRow(`${BASE}/opciones?FK_MATRICULA=${matriculaId}`)),
    enabled: matriculaId != null,
    staleTime: 0,
  })
}

export function useMotivosAnulacionQuery() {
  return useQuery({
    queryKey: postulacionKeys.motivosAnulacion,
    queryFn: async () =>
      (await fetchSelectCategory("MOTIVO_ANULACION_POSTULACION")).map((r) => ({ id: r.pk_lista_valor, nombre: r.nombre })),
    staleTime: Infinity,
  })
}

function useMutacion<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postulacionKeys.all })
      // Cupos, seleccionados y lista de espera de la convocatoria cambian con cada postulación.
      queryClient.invalidateQueries({ queryKey: convocatoriaKeys.all })
    },
  })
}

/** Alta: cupos en orden de preferencia (1 a 3, sin repetir); la autorización es obligatoria. */
export const usePostular = () =>
  useMutacion((v: { matriculaId: number; cupoIds: number[] }) =>
    evalCol.postRow<{ pk_postulacion: number; numero: string; estado: string }>(BASE, {
      FK_MATRICULA: v.matriculaId,
      FK_CUPOS: v.cupoIds,
      AUTORIZACION: "S",
    }),
  )

/** Editar opciones: reemplaza las opciones de la postulación. */
export const useEditarOpciones = () =>
  useMutacion((v: { id: number; cupoIds: number[] }) =>
    evalCol.putRow<{ estado: string }>(`${BASE}/${v.id}/opciones`, { FK_CUPOS: v.cupoIds }),
  )

export const useAnularPostulacion = () =>
  useMutacion((v: { id: number; motivoId: number }) =>
    evalCol.put(`${BASE}/${v.id}/anular`, { FK_TLV_MOTIVO_ANULACION: v.motivoId }),
  )

/* Agregar matrícula complementaria por adscripción (C.2.POS.5). */

export interface PreviaMatriculaAdscripcion {
  sede: string
  periodo: string
  grado: string
  especialidad: string
  grupos: { id: number; codigo: string; cupo: number; libres: number }[]
}

export function usePreviaMatriculaAdscripcionQuery(id: number) {
  return useQuery({
    queryKey: postulacionKeys.matricula(id),
    queryFn: async () => camelizar<PreviaMatriculaAdscripcion>(await evalCol.getRow(`${BASE}/${id}/matricula/previa`)),
    staleTime: 0,
  })
}

export function useMatricularAdscripcion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; grupoId: number }) =>
      evalCol.postRow<{ pk_matricula: number }>(`${BASE}/${v.id}/matricula`, { FK_TGRUPO: v.grupoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postulacionKeys.all })
      queryClient.invalidateQueries({ queryKey: convocatoriaKeys.all })
      invalidarMatriculas(queryClient)
    },
  })
}

/* Cambiar de especialidad una matrícula complementaria (Sección 2.16, Regla 80). */

export interface PreviaCambioEspecialidad {
  /** «Sistemas · IE Central · Tarde · Décimo · 10°T1». */
  actual: string
  especialidadActual: string
  /** Por adscripción: el origen que recibe el aviso. */
  origen: string | null
  especialidades: { id: number; nombre: string; grupos: { id: number; codigo: string; cupo: number; libres: number }[] }[]
}

const especialidadUrl = (matriculaId: number) => `/cobertura-academica/matricula/${matriculaId}/complementaria/especialidad`

export function usePreviaCambioEspecialidadQuery(matriculaId: number) {
  return useQuery({
    queryKey: [...postulacionKeys.all, "especialidad", matriculaId],
    queryFn: async () => camelizar<PreviaCambioEspecialidad>(await evalCol.getRow(`${especialidadUrl(matriculaId)}/previa`)),
    staleTime: 0,
  })
}

export function useCambiarEspecialidad() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { matriculaId: number; especialidadId: number; grupoId: number }) =>
      evalCol.put(especialidadUrl(v.matriculaId), { FK_ESPECIALIDAD: v.especialidadId, FK_TGRUPO: v.grupoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postulacionKeys.all })
      invalidarMatriculas(queryClient)
    },
  })
}

/* Reglas de las acciones del menú ⁞ (Sección 2.16.2, Acciones sobre una postulación). */

const antesDe = (iso: string) => new Date().toISOString().slice(0, 10) <= iso

/** Opción seleccionada (Seleccionada o Matriculada), si la hay. */
export const opcionSeleccionada = (p: Postulacion) =>
  p.opciones.find((o) => o.id === p.opcionSeleccionadaId) ?? null

export function accionesPostulacion(p: Postulacion) {
  const sel = opcionSeleccionada(p)
  return {
    agregarMatricula: p.estado === "SELECCIONADA" && sel != null && sel.esReceptor && antesDe(sel.limiteMatricula),
    editarOpciones: p.esOrigen && p.enPostulacion && (p.estado === "POSTULADA" || p.estado === "EN_LISTA_ESPERA"),
    anular: p.esOrigen && ["POSTULADA", "EN_LISTA_ESPERA", "SELECCIONADA"].includes(p.estado),
  }
}
