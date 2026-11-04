/** Positivo en éxito y Negativo en error, como en la vista Observador (G.1.LIS.1). */
export function colorDeTipo(tipo: string | null | undefined): "success" | "destructive" {
  return tipo?.toLowerCase().startsWith("positivo") ? "success" : "destructive"
}

/** `2026-10-28T00:00:00.000Z` → `28/10/2026` sin pasar por zona horaria (es un DATE). */
export function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return ""
  const [anio, mes, dia] = fecha.slice(0, 10).split("-")
  return `${dia}/${mes}/${anio}`
}

export const MENSAJES = {
  creada: (n: number) => (n > 1 ? `Se guardaron ${n} anotaciones.` : "Anotación guardada."),
  modificada: "Anotación modificada.",
  anulada: "Anotación anulada.",
} as const
