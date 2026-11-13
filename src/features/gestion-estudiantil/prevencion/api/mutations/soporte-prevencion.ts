import { postMultipart } from "@/lib/files"

import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"

/**
 * `POST /prevencion/soporte` (file-service, campo `SOPORTE`, PDF o imagen hasta 10 MB): la misma llamada
 * reserva el TARCHIVO y responde su pk, que va en `FK_SOPORTE` de la aceptación presencial.
 */
export async function subirSoportePrevencion(file: File): Promise<number> {
  const raw = await postMultipart<{ rows?: Record<string, unknown>[] } | Record<string, unknown>>(
    `/eval-col${BASE_PREVENCION}/soporte`,
    {},
    { SOPORTE: file },
  )
  const fila = (raw && "rows" in raw && Array.isArray(raw.rows) ? raw.rows[0] : raw) as Record<string, unknown>
  const pk = fila?.pk_tarchivo ?? Object.values(fila ?? {}).find((v) => typeof v === "number")
  if (typeof pk !== "number") throw new Error("No se pudo cargar el soporte.")
  return pk
}
