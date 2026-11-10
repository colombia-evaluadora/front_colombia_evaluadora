/** Positivo en éxito y Negativo en error, como en la vista Observador (G.1.LIS.1). */
export function colorDeTipo(tipo: string | null | undefined): "success" | "destructive" {
  return tipo?.toLowerCase().startsWith("positivo") ? "success" : "destructive"
}

export const MENSAJES = {
  creada: (n: number) => (n > 1 ? `Se guardaron ${n} anotaciones.` : "Anotación guardada."),
  modificada: "Anotación modificada.",
  anulada: "Anotación anulada.",
} as const
