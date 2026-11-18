import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"

// Bloque 14 (informe 2.14, Regla 73): soportes con su revisión y documentos del convenio.

export type TipoSoporte =
  | "DOCUMENTO_IDENTIDAD"
  | "CERTIFICADO_ESTUDIOS"
  | "CERTIFICADO_MEDICO"
  | "HOJA_FIRMADA"
  | "OTRO"

export type RevisionSoporte = "SIN_REVISAR" | "SOPORTADO" | "SOPORTADO_OBSERVACIONES" | "NO_SOPORTADO"

export const NOMBRE_SOPORTE: Record<TipoSoporte, string> = {
  DOCUMENTO_IDENTIDAD: "Documento de identidad del estudiante",
  CERTIFICADO_ESTUDIOS: "Certificado de estudios del año anterior",
  CERTIFICADO_MEDICO: "Certificado médico del estudiante",
  HOJA_FIRMADA: "Hoja de matrícula firmada",
  OTRO: "Otros documentos relevantes",
}

export const REVISION_SOPORTE: Record<RevisionSoporte, string> = {
  SIN_REVISAR: "Sin revisar",
  SOPORTADO: "Soportado",
  SOPORTADO_OBSERVACIONES: "Soportado con observaciones",
  NO_SOPORTADO: "No soportado",
}

export const SOPORTES_FIJOS: TipoSoporte[] = [
  "DOCUMENTO_IDENTIDAD",
  "CERTIFICADO_ESTUDIOS",
  "CERTIFICADO_MEDICO",
  "HOJA_FIRMADA",
]

export const SOPORTE_MAX_BYTES = 10 * 1024 * 1024
export const SOPORTE_ACCEPT = "application/pdf,image/jpeg,image/png"

interface SoporteRow {
  pk_tmatricula_archivo: number | null
  tipo: TipoSoporte
  fk_tarchivo: number | null
  archivo_nombre: string | null
  archivo_tamano: number | null
  subido_por: string | null
  subido_at: string | null
  revision: RevisionSoporte | null
  observacion: string | null
  revisado_por: string | null
  revisado_at: string | null
}

export interface Soporte {
  id: number | null
  tipo: TipoSoporte
  archivoId: number | null
  archivoNombre: string | null
  archivoTamano: number | null
  subidoPor: string | null
  subidoAt: string | null
  revision: RevisionSoporte
  observacion: string | null
  revisadoPor: string | null
  revisadoAt: string | null
}

const toSoporte = (r: SoporteRow): Soporte => ({
  id: r.pk_tmatricula_archivo,
  tipo: r.tipo,
  archivoId: r.fk_tarchivo,
  archivoNombre: r.archivo_nombre,
  archivoTamano: r.archivo_tamano,
  subidoPor: r.subido_por,
  subidoAt: r.subido_at,
  revision: r.revision ?? "SIN_REVISAR",
  observacion: r.observacion,
  revisadoPor: r.revisado_por,
  revisadoAt: r.revisado_at,
})

interface DocumentoConvenioRow {
  pk_tdocumento: number
  nombre: string
  entregado: "S" | "N"
}

export interface DocumentoConvenio {
  id: number
  nombre: string
  entregado: boolean
}

const base = (matriculaId: string) => `/cobertura-academica/matricula/${matriculaId}`

export function useSoportesQuery(matriculaId: string | undefined) {
  return useQuery({
    queryKey: matriculaKeys.soportes(matriculaId),
    queryFn: async () => (await evalCol.getRows<SoporteRow>(`${base(matriculaId as string)}/soportes`)).map(toSoporte),
    enabled: Boolean(matriculaId),
  })
}

/** Solo la complementaria por adscripción trae filas. */
export function useDocumentosConvenioQuery(matriculaId: string | undefined) {
  return useQuery({
    queryKey: matriculaKeys.documentosConvenio(matriculaId),
    queryFn: async () =>
      (await evalCol.getRows<DocumentoConvenioRow>(`${base(matriculaId as string)}/documentos-convenio`)).map(
        (r): DocumentoConvenio => ({ id: r.pk_tdocumento, nombre: r.nombre, entregado: r.entregado === "S" }),
      ),
    enabled: Boolean(matriculaId),
  })
}

function useInvalidarSoportes(matriculaId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: matriculaKeys.soportes(matriculaId) })
}

export interface CargarSoporteInput {
  tipo: TipoSoporte
  /** Con id reemplaza; sin id adjunta un fijo o agrega uno a Otros documentos relevantes. */
  id: number | null
  archivo: File
}

/** Adjuntar, reemplazar o agregar: el back deja la revisión en Sin revisar (Regla 73). */
export function useCargarSoporte(matriculaId: string) {
  const invalidar = useInvalidarSoportes(matriculaId)
  return useMutation({
    mutationFn: ({ tipo, id, archivo }: CargarSoporteInput) =>
      postMultipart(`/eval-col${base(matriculaId)}/soportes`, { TIPO: tipo, PK_TMATRICULA_ARCHIVO: id }, { ARCHIVO: archivo }),
    onSuccess: invalidar,
  })
}

export interface RevisarSoporteInput {
  id: number
  resultado: Exclude<RevisionSoporte, "SIN_REVISAR">
  observacion: string
}

export function useRevisarSoporte(matriculaId: string) {
  const invalidar = useInvalidarSoportes(matriculaId)
  return useMutation({
    mutationFn: ({ id, resultado, observacion }: RevisarSoporteInput) =>
      evalCol.put(`${base(matriculaId)}/soportes/${id}/revision`, {
        RESULTADO: resultado,
        OBSERVACION: observacion.trim() || null,
      }),
    onSuccess: invalidar,
  })
}

/** Solo los de Otros documentos relevantes; el archivo y su revisión quedan en la Bitácora. */
export function useQuitarSoporte(matriculaId: string) {
  const invalidar = useInvalidarSoportes(matriculaId)
  return useMutation({
    mutationFn: (id: number) => evalCol.put(`${base(matriculaId)}/soportes/${id}/quitar`),
    onSuccess: invalidar,
  })
}

export function useMarcarDocumentoConvenio(matriculaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, entregado }: { id: number; entregado: boolean }) =>
      evalCol.put(`${base(matriculaId)}/documentos-convenio/${id}`, { ENTREGADO: entregado ? "S" : "N" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: matriculaKeys.documentosConvenio(matriculaId) }),
  })
}

export function formatearTamano(bytes: number | null): string {
  if (bytes == null) return ""
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function formatearFecha(iso: string | null): string {
  if (!iso) return ""
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

export function validarArchivoSoporte(archivo: File): string | null {
  if (!["application/pdf", "image/jpeg", "image/png"].includes(archivo.type)) return "Solo PDF, JPG o PNG."
  if (archivo.size > SOPORTE_MAX_BYTES) return "El archivo supera los 10 MB."
  return null
}
