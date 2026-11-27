import { Navigate } from "@tanstack/react-router"

import { paths } from "@/config/paths"
import { observadorEditarRoute } from "@/router"

/**
 * Nueva y Modificar anotación ahora son un modal sobre el listado (`DialogAnotacion`). Estas rutas quedan para
 * los enlaces directos: llevan al Observador con el modal abierto.
 */
export function NuevaAnotacionPage() {
  return <Navigate to={paths.app.observador.getHref()} search={{ nueva: true }} replace />
}

export function EditarAnotacionPage() {
  const { anotacionId } = observadorEditarRoute.useParams()
  return <Navigate to={paths.app.observador.getHref()} search={{ editar: Number(anotacionId) }} replace />
}
