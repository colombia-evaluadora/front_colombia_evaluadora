/**
 * Foto del candidato como data URL JPEG reducida (lado mayor 320 px). Viaja
 * en el cuerpo de la elección y comms-service la guarda tal cual: así se ve en
 * cualquier navegador sin pasar por file-service, y pesa unas decenas de KB
 * (el backend rechaza más de ~300 KB o formatos que no sean imagen).
 */
export const LADO_MAXIMO = 320

export async function fotoComoDataUrl(archivo: File, lado = LADO_MAXIMO): Promise<string> {
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No se pudo procesar la foto del candidato.")
  // Fondo blanco: un PNG/SVG transparente quedaría negro en JPEG.
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL("image/jpeg", 0.85)
}
