/**
 * Descarga un valor serializable como archivo `.json`. Mismo patrón que
 * `guardar()` en `lib/report-client.ts`: el revoke del object URL va
 * DIFERIDO — `.click()` solo encola la descarga, revocar en la misma vuelta
 * del event loop le saca el contenido de abajo y la descarga se cancela en
 * silencio.
 */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
