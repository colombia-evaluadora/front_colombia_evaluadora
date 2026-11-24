import { evalCol } from "@/lib/eval-col-client"

interface ConteoRow {
  retiros_sin_responder: number
  anulaciones_pendientes: number
}

/** Fuera del componente del aviso: también lo pide Preparar sin conexión. */
export async function fetchSolicitudesPendientes() {
  const row = await evalCol.getRow<ConteoRow>("/matricula/solicitudes-pendientes")
  return { retiros: row.retiros_sin_responder ?? 0, anulaciones: row.anulaciones_pendientes ?? 0 }
}
