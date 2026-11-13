import { useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"

import { paths } from "@/config/paths"

/** Navegación entre el listado, la actividad (nueva, detalle, edición) y el servicio social de un estudiante. */
export function useNavegacionActividades() {
  const navigate = useNavigate()

  const ir = useCallback((to: string, search?: Record<string, string>) => navigate({ to, search } as never), [navigate])

  const irListado = useCallback(
    (tab?: "servicio-social") => ir(paths.app.actividadesExtracurriculares.getHref(), tab ? { tab } : undefined),
    [ir],
  )
  const irNueva = useCallback(() => ir(paths.app.actividadNueva.getHref()), [ir])
  const irActividad = useCallback((id: number) => ir(paths.app.actividadDetalle.getHref(id)), [ir])
  const irEditar = useCallback((id: number) => ir(paths.app.actividadEditar.getHref(id)), [ir])
  const irServicioSocial = useCallback(
    (matricula: number) => ir(paths.app.servicioSocialEstudiante.getHref(matricula)),
    [ir],
  )

  return { irListado, irNueva, irActividad, irEditar, irServicioSocial }
}
