import { postMultipart } from "@/lib/files"

import { BASE_RECONOCIMIENTOS } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-reconocimientos-query"

/**
 * `POST /reconocimientos/soporte` (file-service, campo `SOPORTE`, imagen o PDF hasta 10 MB): como el
 * soporte de compromisos, la misma llamada reserva el TARCHIVO y responde `{ pk_tarchivo }`, que va en
 * `FK_SOPORTE` de crear, modificar u otorgar.
 */
export async function subirSoporteReconocimiento(file: File): Promise<number> {
  const raw = await postMultipart<{ rows?: Record<string, unknown>[] } | Record<string, unknown>>(
    `/eval-col${BASE_RECONOCIMIENTOS}/soporte`,
    {},
    { SOPORTE: file },
  )
  const fila = (raw && "rows" in raw && Array.isArray(raw.rows) ? raw.rows[0] : raw) as Record<string, unknown>
  const pk = fila?.pk_tarchivo ?? Object.values(fila ?? {}).find((v) => typeof v === "number")
  if (typeof pk !== "number") throw new Error("No se pudo cargar el soporte.")
  return pk
}
