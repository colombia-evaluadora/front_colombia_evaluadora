import Axios from "axios"
import type { AxiosResponse } from "axios"

import { env } from "@/config/env"
import { authRequestInterceptor, cleanErrorMessage } from "@/lib/api-client"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

/**
 * Cliente de los reportes del `reporting-service`.
 *
 * Instancia propia y no `api` por una razón concreta: el interceptor de
 * respuesta de `api` devuelve `response.data` y descarta el resto, pero acá
 * las cabeceras son parte del resultado — `Content-Disposition` trae el nombre
 * del archivo y `X-Report-Rows` cuántos registros salieron. El request
 * interceptor sí se reutiliza, así que manda el mismo Bearer que el resto de
 * la app.
 *
 * El backend responde el binario en el cuerpo (no una URL), así que la
 * descarga se arma acá con un object URL.
 */
const reportApi = Axios.create({
  baseURL: env.API_URL,
  // Todo lo que devuelve el servicio es binario… incluidos los errores, que
  // llegan como JSON pero envueltos en un Blob. Ver `mensajeDeError`.
  responseType: "blob",
})

reportApi.interceptors.request.use(authRequestInterceptor)

/**
 * Claves registradas en el catálogo del `reporting-service`
 * (`reporting.reports.*` de su `application.yml`). Cada una corresponde a una
 * fila `…/reporte` en `public.query`.
 */
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
  | "boletin-preescolar"
  | "planeador-actividades"
  | "auditoria-sesiones"
  | "auditoria-tabla-operaciones"
  | "auditoria-sesion-operaciones"

interface ReportInput {
  format: ExportFormat
  /** Los mismos filtros que la tabla; vacío significa "sin filtrar" = todo. */
  filters?: unknown
  /** El orden de la tabla, si se quiere respetar en el reporte. */
  sorting?: unknown
  /**
   * Claves de columna a incluir, EN ORDEN -- típicamente las columnas que la
   * tabla tiene visibles en ese momento (`table.getVisibleLeafColumns()`).
   * `reporting-service` las filtra contra el catálogo YA declarado para ese
   * reporte (`ReportRequest.columns`): una clave que no esté ahí se ignora,
   * nunca se agrega una columna nueva por este camino. Vacío u omitido =
   * todas las configuradas (comportamiento de siempre).
   */
  columns?: string[]
}

const ETIQUETA_FORMATO: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

/**
 * Pide el reporte, dispara la descarga y devuelve el mismo
 * `{ status, message }` que ya consumen los diálogos de exportación. Mantener
 * esa forma es deliberado: los diálogos no cambian, solo cambia de dónde sale
 * el archivo.
 */
export async function downloadReport(
  key: ReportKey,
  { format, filters, sorting, columns }: ReportInput,
): Promise<ExportResult> {
  try {
    // El genérico explícito NO es decorativo: `api-client` tiene un
    // `declare module "axios"` que retipa AxiosInstance.post como
    // `Promise<T>` porque SU interceptor desenvuelve `response.data`. Esa
    // augmentación es global y alcanza también a esta instancia, que no
    // desenvuelve nada — así que sin el genérico el resultado quedaba
    // `unknown`. Pidiendo `AxiosResponse<Blob>` el tipo vuelve a coincidir
    // con lo que realmente llega en runtime.
    const response = await reportApi.post<AxiosResponse<Blob>>(`/reportes/${key}`, {
      format,
      filters,
      sorting,
      columns,
    })

    const blob = response.data as Blob
    const filas = Number(response.headers["x-report-rows"])
    const nombre = nombreDeArchivo(response.headers["content-disposition"]) ?? `${key}.${format === "pdf" ? "pdf" : "xlsx"}`

    guardar(blob, nombre)

    if (Number.isFinite(filas) && filas === 0) {
      // Se descarga igual —el archivo es válido y sirve como constancia de que
      // el filtro no encontró nada—, pero se avisa, porque un archivo vacío
      // que aparece sin explicación se lee como un error del sistema.
      return { status: "ok", message: "No hay registros que coincidan con los filtros." }
    }

    const cuantos = Number.isFinite(filas) ? `${filas} registro(s)` : "El listado"
    return { status: "ok", message: `${cuantos} exportado(s) a ${ETIQUETA_FORMATO[format]}.` }
  } catch (error) {
    return { status: "error", message: await mensajeDeError(error) }
  }
}

/** `attachment; filename="x.pdf"; filename*=UTF-8''x.pdf` → `x.pdf`. */
function nombreDeArchivo(contentDisposition: unknown): string | null {
  if (typeof contentDisposition !== "string") return null

  // Se prueba primero `filename*` (RFC 6266), que es el que conserva las
  // tildes; `filename` a secas es el fallback para clientes viejos.
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1])
    } catch {
      // Un `filename*` mal formado no debería costarnos la descarga entera.
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

  // El revoke va DIFERIDO, no en la misma vuelta del event loop. `.click()`
  // solo encola la descarga: el navegador todavía no leyó el blob. Revocar el
  // object URL inmediatamente después le saca el contenido de abajo y la
  // descarga se cancela en silencio — sin error, sin archivo, y con el aviso
  // de éxito igual en pantalla. Revocarlo hace falta (si no, el blob queda
  // retenido hasta cerrar la pestaña, y un reporte son varios MB), pero
  // después de que la descarga arrancó.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Con `responseType: "blob"` el cuerpo de error también llega como Blob, así
 * que el `{ message }` del backend hay que leerlo del texto. Sin esto, todos
 * los errores se verían como "[object Blob]".
 */
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
      // No era JSON: se cae al mensaje genérico de abajo.
    }
  }

  if (respuesta?.status === 422) {
    return "El reporte tiene demasiados registros. Agrega filtros para acotarlo."
  }
  return "No se pudo generar el reporte."
}
