import Axios from "axios"
import type { AxiosResponse } from "axios"

import { env } from "@/config/env"
import { authRequestInterceptor, cleanErrorMessage } from "@/lib/api-client"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

/** Cliente del `reporting-service`: instancia propia porque se necesitan las cabeceras de la respuesta. */
const reportApi = Axios.create({
  baseURL: env.API_URL,
  // Todo llega como binario, también los errores (ver `mensajeDeError`).
  responseType: "blob",
})

reportApi.interceptors.request.use(authRequestInterceptor)

/** Claves de `reporting.reports.*` del `reporting-service`. */
export type ReportKey =
  | "funcionarios"
  | "establecimientos"
  | "sedes"
  | "periodos-academicos"
  | "periodos-evaluacion"
  | "plan-estudio"
  | "grados"
  | "areas"
  | "escalas"
  | "asignaciones"
  | "asistencia"
  | "matricula"
  | "informes"
  | "informes-tabla"
  | "boletin"
  | "planeador-actividades"
  | "planeador-unidades"
  | "referentes-curriculares"
  | "auditoria-sesiones"
  | "auditoria-tabla-operaciones"
  | "auditoria-sesion-operaciones"
  | "bitacora"

interface ReportInput {
  format: ExportFormat
  /** Los mismos filtros que la tabla; vacío = todo. */
  filters?: unknown
  sorting?: unknown
  /** Columnas a incluir, en orden; solo filtra las ya declaradas del reporte. Vacío = todas. */
  columns?: string[]
  /** Resumen de filtros ya escrito para el membrete (con nombres, no ids). */
  filtersLabel?: string
  /** Encabezados que reemplazan a los configurados, por clave de columna. */
  columnLabels?: Record<string, string>
  /** Query params de la URL (ej. `nivel` del boletín). */
  params?: Record<string, string>
}

const ETIQUETA_FORMATO: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

/** Pide el reporte, dispara la descarga y devuelve `{ status, message }`. */
export async function downloadReport(
  key: ReportKey,
  { format, filters, sorting, columns, filtersLabel, columnLabels, params }: ReportInput,
): Promise<ExportResult> {
  try {
    // Genérico explícito: la augmentación global de axios en `api-client` lo retipa.
    const response = await reportApi.post<AxiosResponse<Blob>>(`/reportes/${key}`, {
      format,
      filters,
      sorting,
      columns,
      filtersLabel,
      columnLabels,
    }, { params })

    const blob = response.data as Blob
    const filas = Number(response.headers["x-report-rows"])
    const nombre = nombreDeArchivo(response.headers["content-disposition"]) ?? `${key}.${format === "pdf" ? "pdf" : "xlsx"}`

    guardar(blob, nombre)

    // Vacío se descarga igual, pero se avisa.
    if (Number.isFinite(filas) && filas === 0) {
      return { status: "ok", message: "No hay registros que coincidan con los filtros.", filas }
    }

    const cuantos = Number.isFinite(filas) ? `${filas} registro(s)` : "El listado"
    return {
      status: "ok",
      message: `${cuantos} exportado(s) a ${ETIQUETA_FORMATO[format]}.`,
      filas: Number.isFinite(filas) ? filas : undefined,
    }
  } catch (error) {
    return { status: "error", message: await mensajeDeError(error) }
  }
}

/** `attachment; filename="x.pdf"; filename*=UTF-8''x.pdf` → `x.pdf`. */
function nombreDeArchivo(contentDisposition: unknown): string | null {
  if (typeof contentDisposition !== "string") return null

  // Primero `filename*`, que conserva las tildes.
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1])
    } catch {
      // Mal formado: se usa `filename`.
    }
  }

  const simple = /filename="?([^";]+)"?/i.exec(contentDisposition)
  return simple?.[1] ?? null
}

function guardar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()

  // Revocar diferido: hacerlo enseguida cancela la descarga en silencio.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Con `responseType: "blob"` el error también es un Blob: se lee su `message`. */
async function mensajeDeError(error: unknown): Promise<string> {
  const respuesta = Axios.isAxiosError(error) ? error.response : undefined
  const cuerpo = respuesta?.data

  if (cuerpo instanceof Blob) {
    try {
      const texto = await cuerpo.text()
      const json = JSON.parse(texto) as { message?: string; detail?: string }
      const mensaje = json.message ?? json.detail
      if (mensaje) return cleanErrorMessage(mensaje)
    } catch {
      // No era JSON.
    }
  }

  if (respuesta?.status === 422) {
    return "El reporte tiene demasiados registros. Agrega filtros para acotarlo."
  }
  return "No se pudo generar el reporte."
}
