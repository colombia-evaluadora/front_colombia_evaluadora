import { getErrorMessage } from "@/lib/api-client"

const GENERICO = "No pudimos completar la acción. Inténtelo de nuevo en unos minutos."

function estadoDe(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status
}

/**
 * Texto para el usuario. Las reglas de negocio del backend (22023, 23505) ya vienen
 * redactadas y se muestran tal cual; lo técnico (binds, SQL, red, 5xx) nunca se muestra.
 */
export function mensajePiar(error: unknown): string {
  const estado = estadoDe(error)
  if (estado === 403) return "No tiene permiso para esta acción en este PIAR."
  if (estado === 404) return "No encontramos este PIAR. Es posible que ya no exista o haya sido anulado."
  if (estado === 413) return "El archivo supera el tamaño permitido de 10 MB."
  if (estado === 409) return mensajeNegocio(error) ?? "Este registro ya existe o cambió mientras lo editaba. Actualice la página e inténtelo de nuevo."
  if (estado != null && estado >= 500) return GENERICO
  if (estado == null && (error as { isAxiosError?: boolean })?.isAxiosError) return "No hay conexión con el servidor. Revise su internet e inténtelo de nuevo."
  return mensajeNegocio(error) ?? "Revise los datos e inténtelo de nuevo."
}

function mensajeNegocio(error: unknown): string | null {
  const m = getErrorMessage(error)
  const tecnico = !m || /BODY\.|PARAM\.|QUERY\.|parámetro|SQL|null|exception|Request failed|status code|tipo (VARCHAR|BIGINT|DATE)/i.test(m)
  return tecnico ? null : m
}
