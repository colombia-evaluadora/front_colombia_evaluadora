import { api } from "@/lib/api-client"

/**
 * Subida y visualización de archivos vía `file-service`.
 *
 * **Cómo se manda.** No se sube el archivo por separado: se manda el mismo
 * payload de siempre, pero como `multipart/form-data` y contra el prefijo
 * `/files`. `file-service` se pone en el medio, guarda el binario en S3, lo
 * registra en `TARCHIVO` con la clasificación que declara `param_types`,
 * **reemplaza el campo por el `pk_tarchivo` resultante** y reenvía el JSON al
 * destino real (query-service o auth-center) con el mismo JWT. Para el front
 * es el mismo endpoint de siempre con otra envoltura.
 *
 * Dos formas de destino, y la diferencia importa en la URL:
 *   - destino `query`    → lleva prefijo de microservicio: `/files/eval-col/...`
 *   - destino `endpoint` → NO lo lleva:                    `/files/register/...`
 *
 * **Cómo se ve.** Un `<img src>` no puede mandar `Authorization`, así que la
 * imagen no se pide directo: primero se acuña (autenticado) un token de un solo
 * archivo y vida corta, y la URL que devuelve ya trae ese token. Ver
 * `fetchArchivoViewUrl`.
 */

/**
 * Aplana el payload a las claves con punto que espera `file-service`
 * (`basicInfo.name`, `address.municipality`), que es como viaja un objeto
 * anidado dentro de un form-data.
 *
 * Los `null`/`undefined` se omiten en vez de mandarse como la cadena "null":
 * en un form-data todo es texto, y "null" no es lo mismo que ausente — para un
 * PATCH parcial la diferencia es entre "no toques este campo" y "ponelo en
 * null".
 */
function appendFlattened(form: FormData, value: unknown, prefix = ""): void {
  if (value === null || value === undefined) return

  if (value instanceof File || value instanceof Blob) {
    form.append(prefix, value)
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => appendFlattened(form, item, `${prefix}[${index}]`))
    return
  }

  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      appendFlattened(form, child, prefix ? `${prefix}.${key}` : key)
    }
    return
  }

  form.append(prefix, String(value))
}

/**
 * `data` aplanado + los archivos bajo el nombre EXACTO que declara el catálogo
 * (`logo` para el escudo, `fkTarchivoFoto` para la foto de perfil). Un campo
 * binario con otro nombre lo rechaza `file-service` con 400 antes de tocar S3
 * — la validación es por nombre, no por contenido.
 *
 * Un archivo ausente (`null`) simplemente no se agrega: los tres destinos lo
 * tratan como opcional y dejan el registro sin imagen.
 */
export function toMultipart(data: unknown, files: Record<string, File | null | undefined>): FormData {
  const form = new FormData()
  appendFlattened(form, data)
  for (const [field, file] of Object.entries(files)) {
    if (file) form.append(field, file)
  }
  return form
}

/**
 * No se fija `Content-Type` a mano: el navegador lo arma con el `boundary`
 * del multipart, y ponerlo explícito lo rompe.
 */
export function postMultipart<T>(
  path: string,
  data: unknown,
  files: Record<string, File | null | undefined>,
): Promise<T> {
  return api.post(`/files${path}`, toMultipart(data, files)) as Promise<T>
}

export function patchMultipart<T>(
  path: string,
  data: unknown,
  files: Record<string, File | null | undefined>,
): Promise<T> {
  return api.patch(`/files${path}`, toMultipart(data, files)) as Promise<T>
}

/** Lo que devuelve `POST /files/view-token/{id}`. */
export interface ArchivoViewToken {
  token: string
  /** Ruta ya lista para un `<img src>`: `/api/files/view/<id>?token=...` */
  url: string
}

/**
 * Acuña un token de vista para un archivo. El token vale para ESE archivo y
 * dura pocos minutos, así que la URL no se puede cachear indefinidamente —
 * ver `useArchivoViewUrl`, que la revalida antes de que expire.
 *
 * La `url` que vuelve es absoluta desde la raíz (`/api/...`), no relativa al
 * `baseURL` del cliente: va directo al `src` de la imagen, sin concatenar.
 */
export function fetchArchivoViewUrl(archivoId: number): Promise<ArchivoViewToken> {
  return api.post(`/files/view-token/${archivoId}`) as Promise<ArchivoViewToken>
}
