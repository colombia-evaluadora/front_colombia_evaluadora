import { Navigate, useParams } from "@tanstack/react-router"

import { paths } from "@/config/paths"

/**
 * Nueva postulación y Cambiar cupo ahora son un modal sobre la pestaña Postulaciones
 * (`DialogPostulacion`). Estas rutas quedan para los enlaces directos: llevan a la lista con el modal abierto.
 */
export function PostulacionFormPage() {
  const { postulacionId } = useParams({ strict: false }) as { postulacionId?: string }
  return (
    <Navigate
      to={paths.app.coberturaComplementaria.getHref()}
      search={postulacionId ? { tab: "postulaciones", cambiarCupo: Number(postulacionId) } : { tab: "postulaciones", postular: true }}
      replace
    />
  )
}
