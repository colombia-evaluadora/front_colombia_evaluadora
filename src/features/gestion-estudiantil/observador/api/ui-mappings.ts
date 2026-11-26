/**
 * Color del tipo: Positivo verde, Negativo rojo, el resto azul. Acepta el código (POSITIVO, NEGATIVO, NEUTRO) o
 * el nombre de la lista («Negativo»): el catálogo de anotaciones solo trae `tipo_nombre` y con la comparación
 * exacta todo salía azul.
 */
export function colorDeTipo(tipo: string | null | undefined): "success" | "destructive" | "info" {
  const t = tipo?.trim().toUpperCase()
  if (t === "POSITIVO") return "success"
  if (t === "NEGATIVO") return "destructive"
  return "info"
}

export const MENSAJES = {
  creada: (n: number) => (n > 1 ? `Se guardaron ${n} anotaciones.` : "Anotación guardada."),
  modificada: "Anotación modificada.",
  anulada: "Anotación anulada.",
} as const
