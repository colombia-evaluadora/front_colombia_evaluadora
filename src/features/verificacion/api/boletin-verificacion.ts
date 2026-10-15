import { useMutation, useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"

/**
 * Verificación pública de boletines (QR impreso en el PDF).
 * Contrato: sso PR `feat/boletin-verificacion-qr`.
 *
 * Sin login solo se expone el estado + institución/sede/periodo/fecha. El PDF
 * (que sí trae datos del estudiante) exige como segundo factor los últimos 4
 * dígitos del documento del estudiante.
 *
 * Se usa `fetch` directo y NO la instancia `api` de axios a propósito: la
 * página es pública, así que no debe viajar el Bearer de una sesión que
 * pudiera estar en memoria, ni dispararse el manejo de "sesión vencida"
 * (redirect a /login) del interceptor, ni su toast global de errores.
 */
export type EstadoBoletin = "VIGENTE" | "ACTUALIZADO" | "REEMPLAZADO" | "NO_VALIDO"

export interface BoletinVerificacion {
  estado: EstadoBoletin
  emitidoEn: string | null
  actualizadoEn: string | null
  institucion: string | null
  sede: string | null
  periodo: string | null
}

const ESTADOS: EstadoBoletin[] = ["VIGENTE", "ACTUALIZADO", "REEMPLAZADO", "NO_VALIDO"]

const str = (v: unknown): string | null =>
  v == null || v === "" || typeof v === "object" ? null : String(v)

/** Nombre del catálogo o string plano: tolera `{ nombre }` / `{ name }`. */
const label = (v: unknown): string | null => {
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>
    return str(o.nombre ?? o.name ?? o.descripcion)
  }
  return str(v)
}

/** Único punto de adaptación si el backend cambia levemente la forma. */
export function toBoletinVerificacion(raw: unknown): BoletinVerificacion {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const estadoRaw = String(o.estado ?? "")
    .toUpperCase()
    .replace(/\s+/g, "_")
  const estado = ESTADOS.includes(estadoRaw as EstadoBoletin)
    ? (estadoRaw as EstadoBoletin)
    : "NO_VALIDO"
  return {
    estado,
    emitidoEn: str(o.emitidoEn ?? o.emitido_en),
    actualizadoEn: str(o.actualizadoEn ?? o.actualizado_en),
    institucion: label(o.institucion),
    sede: label(o.sede),
    periodo: label(o.periodo),
  }
}

const basePath = (codigo: string) =>
  `${env.API_URL}/reportes/public/boletin/${encodeURIComponent(codigo)}`

async function fetchBoletin(codigo: string): Promise<BoletinVerificacion> {
  const res = await fetch(basePath(codigo), { credentials: "omit" })
  // Un código inexistente puede llegar como 404 en vez de estado NO_VALIDO.
  if (res.status === 404) return toBoletinVerificacion({ estado: "NO_VALIDO" })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return toBoletinVerificacion(await res.json())
}

export function useBoletinVerificacion(codigo: string) {
  return useQuery({
    queryKey: ["verificacion-boletin", codigo],
    queryFn: () => fetchBoletin(codigo),
    enabled: Boolean(codigo),
    // C-80 / spec app-shell: sin red el fetch debe fallar y mostrar el copy
    // offline, no quedar pausado en "Verificando…" por el `onlineManager`.
    // Nunca lleva `meta.offline`: un estado de verificación no se persiste.
    networkMode: "always",
  })
}

/** `true` si el error es de red (fetch rechazado) o el navegador está sin conexión. */
export function isOfflineVerificationError(error: unknown): boolean {
  return error instanceof TypeError || (typeof navigator !== "undefined" && navigator.onLine === false)
}

/** Error con el status HTTP para que la UI distinga 403 (no coincide) de 429. */
export class BoletinPdfError extends Error {
  status: number
  constructor(status: number) {
    super(`Error ${status}`)
    this.status = status
  }
}

async function fetchBoletinPdf({
  codigo,
  ultimos4,
}: {
  codigo: string
  ultimos4: string
}): Promise<Blob> {
  const res = await fetch(`${basePath(codigo)}/pdf`, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json", Accept: "application/pdf" },
    body: JSON.stringify({ ultimos4 }),
  })
  if (!res.ok) throw new BoletinPdfError(res.status)
  return res.blob()
}

/**
 * Mutación (no query) a propósito: los dígitos no deben quedar en la caché de
 * TanStack Query como parte de una key, ni en la URL ni en storage.
 */
export function useBoletinPdf() {
  return useMutation({ mutationFn: fetchBoletinPdf })
}

export function pdfErrorMessage(error: unknown): string {
  const status = error instanceof BoletinPdfError ? error.status : 0
  if (status === 403) return "Los dígitos no coinciden."
  if (status === 429) return "Demasiados intentos. Intenta de nuevo en unos minutos."
  return "No se pudo cargar el boletín. Intenta de nuevo."
}
