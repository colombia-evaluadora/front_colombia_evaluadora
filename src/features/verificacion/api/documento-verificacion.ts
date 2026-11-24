import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"

/**
 * Ruta común de verificación (Administración del Sistema, Sección 12.4):
 * `/verificar/<código>`. reporting-service reconoce el documento por la forma del
 * código (`GET /reportes/public/documento/{codigo}`) y devuelve su tipo y estado.
 * Hoy: carné (tres bloques de cuatro) y boletín (base64url, que sigue en su página).
 *
 * `fetch` directo, como en el boletín: página pública, sin Bearer ni el manejo
 * de sesión vencida del interceptor de axios.
 */
export type TipoDocumentoGe = "SERVICIO_SOCIAL_CERTIFICADO" | "MENCION_HONOR" | "CONSTANCIA_ESTUDIO"
export type TipoDocumento = "CARNE" | "BOLETIN" | TipoDocumentoGe | null
export type EstadoCarne = "VIGENTE" | "REEMPLAZADO" | "ANULADO" | "NO_VALIDO"

export interface CarneVerificacion {
  estado: EstadoCarne
  emitidoEn: string | null
  reemplazadoEn: string | null
  vigencia: string | null
  /** El estudiante sigue con matrícula Cursando en el establecimiento hoy. */
  matriculaVigente: boolean
  institucion: string | null
  dane: string | null
  titular: string | null
  documentoUltimos4: string | null
  sede: string | null
  jornada: string | null
  gradoGrupo: string | null
  anio: string | null
}

/** Estados de un documento de Gestión Estudiantil; ACTUALIZADO: sus datos cambiaron tras emitirlo. */
export type EstadoDocumentoGe = "VIGENTE" | "ACTUALIZADO" | "REEMPLAZADO" | "ANULADO" | "NO_VALIDO"

export interface DocumentoGeVerificacion {
  tipo: TipoDocumentoGe
  estado: EstadoDocumentoGe
  emitidoEn: string | null
  reemplazadoEn: string | null
  institucion: string | null
  dane: string | null
  titular: string | null
}

export type DocumentoVerificacion =
  | { tipo: "CARNE"; carne: CarneVerificacion }
  | { tipo: "BOLETIN" }
  | { tipo: TipoDocumentoGe; ge: DocumentoGeVerificacion }
  | { tipo: null }

const TIPOS_GE: string[] = ["SERVICIO_SOCIAL_CERTIFICADO", "MENCION_HONOR", "CONSTANCIA_ESTUDIO"]
const ESTADOS_GE: EstadoDocumentoGe[] = ["VIGENTE", "ACTUALIZADO", "REEMPLAZADO", "ANULADO", "NO_VALIDO"]

const ESTADOS: EstadoCarne[] = ["VIGENTE", "REEMPLAZADO", "ANULADO", "NO_VALIDO"]

const str = (v: unknown): string | null => (v == null || v === "" || typeof v === "object" ? null : String(v))

export function toDocumentoVerificacion(raw: unknown): DocumentoVerificacion {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  if (o.tipo === "BOLETIN") return { tipo: "BOLETIN" }
  if (typeof o.tipo === "string" && TIPOS_GE.includes(o.tipo)) {
    const e = String(o.estado ?? "").toUpperCase()
    const tipo = o.tipo as TipoDocumentoGe
    return {
      tipo,
      ge: {
        tipo,
        estado: ESTADOS_GE.includes(e as EstadoDocumentoGe) ? (e as EstadoDocumentoGe) : "NO_VALIDO",
        emitidoEn: str(o.emitidoEn),
        reemplazadoEn: str(o.reemplazadoEn),
        institucion: str(o.institucion),
        dane: str(o.dane),
        titular: str(o.titular),
      },
    }
  }
  if (o.tipo !== "CARNE") return { tipo: null }
  const estadoRaw = String(o.estado ?? "").toUpperCase()
  return {
    tipo: "CARNE",
    carne: {
      estado: ESTADOS.includes(estadoRaw as EstadoCarne) ? (estadoRaw as EstadoCarne) : "NO_VALIDO",
      emitidoEn: str(o.emitidoEn),
      reemplazadoEn: str(o.reemplazadoEn),
      vigencia: str(o.vigencia),
      matriculaVigente: o.matriculaVigente === true,
      institucion: str(o.institucion),
      dane: str(o.dane),
      titular: str(o.titular),
      documentoUltimos4: str(o.documentoUltimos4),
      sede: str(o.sede),
      jornada: str(o.jornada),
      gradoGrupo: str(o.gradoGrupo),
      anio: str(o.anio),
    },
  }
}

async function fetchDocumento(codigo: string): Promise<DocumentoVerificacion> {
  const res = await fetch(`${env.API_URL}/reportes/public/documento/${encodeURIComponent(codigo)}`, {
    credentials: "omit",
  })
  if (res.status === 404) return { tipo: null }
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return toDocumentoVerificacion(await res.json())
}

export function useDocumentoVerificacion(codigo: string) {
  return useQuery({
    queryKey: ["verificacion-documento", codigo],
    queryFn: () => fetchDocumento(codigo),
    enabled: Boolean(codigo),
    // Como el boletín: sin red falla y muestra el aviso, no se queda pausado.
    networkMode: "always",
  })
}
