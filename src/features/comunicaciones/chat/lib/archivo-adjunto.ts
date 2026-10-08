import type { FormatoArchivo } from "@/features/comunicaciones/chat/api/types"

export const ACEPTA_DOCUMENTOS = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
export const ACEPTA_MULTIMEDIA = "image/*,video/*"

export function formatoDeArchivo(archivo: { name: string; type: string }): FormatoArchivo {
  if (archivo.type.startsWith("image/")) return "IMAGEN"
  if (archivo.type.startsWith("video/")) return "VIDEO"
  const ext = archivo.name.split(".").pop()?.toLowerCase()
  if (ext === "pdf") return "PDF"
  if (ext === "doc" || ext === "docx") return "WORD"
  return "OTRO"
}
