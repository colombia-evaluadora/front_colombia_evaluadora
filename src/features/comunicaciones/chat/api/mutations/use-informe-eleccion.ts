import Axios from "axios"
import type { AxiosResponse } from "axios"
import { useMutation } from "@tanstack/react-query"

import { env } from "@/config/env"
import { authRequestInterceptor, cleanErrorMessage } from "@/lib/api-client"

/**
 * Informe final del proceso electoral (PDF). Lo arma comms-service
 * (`GET /comunicaciones/conversaciones/{id}/eleccion/informe`, OpenPDF) porque los datos viven en
 * el esquema `comunicaciones`, que el reporting-service no alcanza. Solo quien gestiona la elección
 * y con la votación cerrada (403 / 409 si no).
 *
 * Instancia axios propia, como `lib/report-client.ts`: la de `api` desenvuelve el cuerpo y pierde
 * el `Content-Disposition`, y su toast global no sabe leer un error que llega como Blob.
 */
const informeApi = Axios.create({ baseURL: env.API_URL, responseType: "blob" })
informeApi.interceptors.request.use(authRequestInterceptor)

function nombreDeArchivo(contentDisposition: unknown, conversacionId: number) {
  const valor = typeof contentDisposition === "string" ? contentDisposition : ""
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(valor)
  if (utf8) return decodeURIComponent(utf8[1])
  const simple = /filename="?([^";]+)"?/i.exec(valor)
  return simple?.[1] ?? `informe-eleccion-${conversacionId}.pdf`
}

async function mensajeDeError(error: unknown) {
  const cuerpo = Axios.isAxiosError(error) ? error.response?.data : undefined
  if (cuerpo instanceof Blob) {
    try {
      const json = JSON.parse(await cuerpo.text()) as { message?: string }
      if (json.message) return cleanErrorMessage(json.message)
    } catch {
      // No era JSON.
    }
  }
  return "No se pudo generar el informe de la elección."
}

async function descargarInforme(conversacionId: number) {
  let respuesta: AxiosResponse<Blob>
  try {
    respuesta = await informeApi.get<AxiosResponse<Blob>>(`/eval-col/comunicaciones/conversaciones/${conversacionId}/eleccion/informe`)
  } catch (error) {
    throw new Error(await mensajeDeError(error))
  }
  const nombre = nombreDeArchivo(respuesta.headers["content-disposition"], conversacionId)
  const url = URL.createObjectURL(respuesta.data)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  // Revocar diferido: hacerlo enseguida cancela la descarga en silencio.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return nombre
}

export function useDescargarInformeEleccion() {
  return useMutation({ mutationFn: descargarInforme })
}
