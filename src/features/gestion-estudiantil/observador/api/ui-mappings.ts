/** Color del tipo por su código (POSITIVO, NEGATIVO, NEUTRO), no por la etiqueta de la lista. */
export function colorDeTipo(tipoCodigo: string | null | undefined): "success" | "destructive" | "info" {
  if (tipoCodigo === "POSITIVO") return "success"
  if (tipoCodigo === "NEGATIVO") return "destructive"
  return "info"
}

export const MENSAJES = {
  creada: (n: number) => (n > 1 ? `Se guardaron ${n} anotaciones.` : "Anotación guardada."),
  modificada: "Anotación modificada.",
  anulada: "Anotación anulada.",
} as const
