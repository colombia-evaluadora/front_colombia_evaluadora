import { postMultipart } from "@/lib/files"

import { BASE_COMPROMISOS } from "@/features/gestion-estudiantil/citaciones/api/query/use-compromisos-query"

/**
 * `POST /compromisos/soporte` (file-service, campo `SOPORTE`, PDF/JPG/PNG hasta 10 MB): igual que el
 * soporte de Convivencia, la misma llamada reserva el TARCHIVO y ejecuta `fn_compromiso_soporte_registrar`,
 * que responde `{ pk_tarchivo }`. Ese pk va en `FK_ARCHIVO` de «Crear compromiso» o de
 * «Aceptación presencial».
 */
export async function subirSoporteCompromiso(file: File): Promise<number> {
  const raw = await postMultipart<{ rows?: Record<string, unknown>[] } | Record<string, unknown>>(
    `/eval-col${BASE_COMPROMISOS}/soporte`,
    {},
    { SOPORTE: file },
  )
  const fila = (raw && "rows" in raw && Array.isArray(raw.rows) ? raw.rows[0] : raw) as Record<string, unknown>
  const pk = fila?.pk_tarchivo ?? Object.values(fila ?? {}).find((v) => typeof v === "number")
  if (typeof pk !== "number") throw new Error("No se pudo cargar el soporte.")
  return pk
}
