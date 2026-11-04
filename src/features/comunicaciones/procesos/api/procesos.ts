import Axios from "axios"
import type { AxiosResponse } from "axios"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { authRequestInterceptor } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import { api } from "@/lib/api-client"

/**
 * Procesos de postulación y elección (M.4). API en comms-service, sin mocks: es solo backend real,
 * como `academic-period`. La votación no tiene urna aquí: al abrir se crea una elección del chat con
 * el padrón como censo, así que votar sigue siendo el panel de elección de `/app/comunicaciones/chat`.
 */
const BASE = "/comunicaciones/procesos"

export type Etapa = "PREPARACION" | "POSTULACIONES" | "DECISION" | "RESULTADOS" | "RECLAMACIONES" | "FORMALIZACION" | "CERRADA"
export type Condicion = "NORMAL" | "SUSPENDIDA" | "ANULADA"
export type Metodo = "VOTACION" | "SELECCION_MOTIVADA"
export type Funcion = "ADMINISTRADOR" | "REVISOR" | "ESCRUTINIO" | "SELECTOR" | "RECLAMACIONES" | "FORMALIZACION"
export type EstadoPostulacion = "BORRADOR" | "PENDIENTE" | "PRESENTADA" | "SUBSANACION" | "HABILITADA" | "NO_HABILITADA" | "RETIRADA"

export interface ProcesoFila {
  id: number
  nombre: string
  elecciones: number
  etapa: Etapa
  estado: "BORRADOR" | "ABIERTO" | "CERRADO"
  publicado: boolean
  gestiona: boolean
}

export interface EleccionProceso {
  id: number
  nombre: string
  titulares: number
  suplentes: number
  ejercicioDesde: string | null
  ejercicioHasta: string | null
  metodo: Metodo
  poblacionPostula: string[]
  poblacionVota: string[]
  cursos: string[]
  requisitos: string[]
  autopostulacion: boolean
  porTerceros: boolean
  umbralPct: number | null
  participacionMinimaPct: number | null
  mecanismoEmpate: string
  jornada: number | null
  postulacionDesde: string | null
  postulacionHasta: string | null
  votacionInicio: string | null
  votacionCierre: string | null
  reclamacionDias: number | null
  reclamacionHasta: string | null
  etapa: Etapa
  condicion: Condicion
  listaPublicadaEn: string | null
  canal: number | null
  eleccionAnterior: number | null
}

export interface Proceso {
  id: number
  nombre: string
  objeto: string
  reglamento: string
  version: number
  publicadoEn: string | null
  misFunciones: Funcion[]
  puedeAnular: boolean
  funciones: { usuario: number; nombre: string; funcion: Funcion }[]
  elecciones: EleccionProceso[]
}

export interface Postulacion {
  id: number
  eleccion: number
  usuario: number
  nombre: string
  propuestoPor: string | null
  estado: EstadoPostulacion
  propuesta: string
  foto: string | null
  presentadaEn: string | null
  subsanarHasta: string | null
  motivo: string | null
  documentos: { id: number; archivo: number; tipo: string; nombre: string; peso: number }[]
  requisitos: { requisito: string; resultado: string; observacion: string }[]
}

export interface MiProceso {
  eleccion: number
  proceso: number
  procesoNombre: string
  nombre: string
  etapa: Etapa
  condicion: Condicion
  postulacionHasta: string | null
  postulacion: number | null
  postulacionEstado: EstadoPostulacion | null
  subsanarHasta: string | null
  propuestoPor: string | null
  puedePostular: boolean
  puedeProponer: boolean
  enPadron: boolean
  canal: number | null
  votacionCierre: string | null
  puedeReclamar: boolean
}

export interface Padron {
  id: number
  regla: string
  corte: string
  aprobadoEn: string | null
  personas: { usuario: number; nombre: string; vinculo: string; condicion: string; motivo: string | null }[]
}

export interface ActaContenido {
  habilitados?: number
  votos?: number
  abstencion?: number
  blancos?: number
  participacionPct?: number
  candidaturas?: { nombre: string; votos: number }[]
  elegidos?: { postulacion: number; nombre: string; condicion: string }[]
  incidencias?: string[]
  motivacion?: string
}

export interface Acta {
  id: number
  version: number
  tipo: "RESULTADOS" | "DEFINITIVA"
  creadoEn: string
  contenido: ActaContenido
}

export interface Reclamacion {
  id: number
  reclamante: string
  motivo: string
  estado: "EN_TRAMITE" | "ACEPTADA" | "RECHAZADA"
  respuesta: string | null
  afectaResultado: boolean
  creadoEn: string
}

export interface Designacion {
  id: number
  usuario: number
  nombre: string
  condicion: string
  desde: string | null
  hasta: string | null
  novedades: { tipo: string; detalle: string; creadoEn: string }[]
}

export const procesosKeys = {
  raiz: ["procesos"] as const,
  lista: () => ["procesos", "lista"] as const,
  mios: () => ["procesos", "mios"] as const,
  detalle: (id: number) => ["procesos", "detalle", id] as const,
  eleccion: (id: number, parte: string) => ["procesos", "eleccion", id, parte] as const,
}

export function useProcesosQuery() {
  return useQuery({ queryKey: procesosKeys.lista(), queryFn: () => evalCol.getRows<ProcesoFila>(BASE) })
}

export function useMisProcesosQuery() {
  return useQuery({ queryKey: procesosKeys.mios(), queryFn: () => evalCol.getRows<MiProceso>(`${BASE}/mios`) })
}

export function useProcesoQuery(id: number) {
  return useQuery({
    queryKey: procesosKeys.detalle(id),
    queryFn: async () => (await evalCol.getRows<Proceso>(`${BASE}/${id}`))[0] ?? null,
  })
}

function useParteEleccion<T>(eleccion: number, parte: string, enabled = true) {
  return useQuery({
    queryKey: procesosKeys.eleccion(eleccion, parte),
    queryFn: () => evalCol.getRows<T>(`${BASE}/elecciones/${eleccion}/${parte}`),
    enabled,
  })
}

export const usePostulacionesQuery = (e: number, enabled: boolean) => useParteEleccion<Postulacion>(e, "postulaciones", enabled)
export const useCandidaturasQuery = (e: number) =>
  useParteEleccion<{ id: number; nombre: string; propuesta: string; foto: string | null }>(e, "candidaturas")
export const usePadronQuery = (e: number, enabled: boolean) => useParteEleccion<Padron>(e, "padron", enabled)
export const useActasQuery = (e: number) => useParteEleccion<Acta>(e, "actas")
export const useReclamacionesQuery = (e: number) => useParteEleccion<Reclamacion>(e, "reclamaciones")
export const useDesignacionesQuery = (e: number) => useParteEleccion<Designacion>(e, "designaciones")

export function useCursosQuery() {
  return useQuery({ queryKey: ["procesos", "cursos"], queryFn: () => evalCol.getRows<string>(`${BASE}/cursos`), staleTime: Infinity })
}

export function usePersonasQuery(tipo: "ESTUDIANTES" | "ACUDIENTES" | "FUNCIONARIOS", enabled = true) {
  return useQuery({
    queryKey: ["procesos", "personas", tipo],
    queryFn: () => evalCol.getRows<{ id: number; nombre: string }>(`${BASE}/personas?tipo=${tipo}`),
    enabled,
  })
}

export function useJornadasQuery() {
  return useQuery({
    queryKey: ["procesos", "jornadas"],
    queryFn: () => evalCol.getRows<{ id: number; nombre: string }>("/comunicaciones/elecciones/jornadas"),
    staleTime: Infinity,
  })
}

interface Accion {
  ruta: string
  cuerpo?: unknown
  metodo?: "post" | "put" | "patch"
}

/**
 * Toda escritura del proceso mueve la etapa o el estado de varias pantallas a la vez, así que se
 * invalida el prefijo `["procesos"]` y no key por key.
 */
export function useAccionProceso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ruta, cuerpo, metodo = "post" }: Accion) =>
      api[metodo]<{ rows: unknown[] }>(`/eval-col${BASE}${ruta}`, cuerpo ?? {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: procesosKeys.raiz }),
  })
}

/** Soporte reservado: file-service guarda el archivo y reenvía ADJUNTO = pk_tarchivo a comms-service. */
export function useAdjuntarDocumento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postulacion, archivo, tipo }: { postulacion: number; archivo: File; tipo: "SOPORTE" | "AUTORIZACION" }) =>
      postMultipart(`/eval-col${BASE}/postulaciones/${postulacion}/documentos`, { TIPO: tipo }, { ADJUNTO: archivo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: procesosKeys.raiz }),
  })
}

const pdfApi = Axios.create({ baseURL: env.API_URL, responseType: "blob" })
pdfApi.interceptors.request.use(authRequestInterceptor)

/** Instancia propia, como `use-informe-eleccion`: `api` desenvuelve el cuerpo y no sirve para blobs. */
export function useDescargarActa() {
  return useMutation({
    mutationFn: async ({ eleccion, acta }: { eleccion: number; acta: number }) => {
      let respuesta: AxiosResponse<Blob>
      try {
        respuesta = await pdfApi.get<AxiosResponse<Blob>>(`/eval-col${BASE}/elecciones/${eleccion}/actas/${acta}/pdf`)
      } catch {
        throw new Error("No se pudo descargar el acta.")
      }
      const url = URL.createObjectURL(respuesta.data)
      const enlace = document.createElement("a")
      enlace.href = url
      enlace.download = `acta-${acta}.pdf`
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
  })
}

export const ETAPA_LABEL: Record<Etapa, string> = {
  PREPARACION: "Preparación",
  POSTULACIONES: "Convocatoria y postulaciones",
  DECISION: "Votación o selección",
  RESULTADOS: "Resultados provisionales",
  RECLAMACIONES: "Reclamaciones",
  FORMALIZACION: "Formalización",
  CERRADA: "Formalización y cierre",
}

export const ESTADO_POSTULACION_LABEL: Record<EstadoPostulacion, string> = {
  BORRADOR: "Borrador",
  PENDIENTE: "Pendiente de aceptación",
  PRESENTADA: "Presentada",
  SUBSANACION: "En subsanación",
  HABILITADA: "Habilitada",
  NO_HABILITADA: "No habilitada",
  RETIRADA: "Retirada",
}

export const FUNCION_LABEL: Record<Funcion, string> = {
  ADMINISTRADOR: "Administrador del proceso",
  REVISOR: "Revisor de requisitos",
  ESCRUTINIO: "Responsable de escrutinio",
  SELECTOR: "Evaluador o selector",
  RECLAMACIONES: "Responsable de reclamaciones",
  FORMALIZACION: "Responsable de formalización",
}

export const POBLACION_LABEL: Record<string, string> = {
  ESTUDIANTES: "Estudiantes",
  ACUDIENTES: "Acudientes",
  FUNCIONARIOS: "Funcionarios",
}

export function fechaCorta(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bogota" })
}

/** `datetime-local` (hora del navegador) ↔ ISO que espera el backend. */
export const aIso = (local: string) => (local ? new Date(local).toISOString() : null)

export function aLocal(iso: string | null | undefined) {
  if (!iso) return ""
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
