import { useNavigate } from "@tanstack/react-router"

import { paths } from "@/config/paths"

type Navegar = (opts: { to: string; search?: Record<string, unknown>; replace?: boolean }) => void

/** Destinos del Comité. El id o el período viajan por la ruta; la pestaña, por el search de Convivencia. */
export function useComiteNavegacion() {
  const navigate = useNavigate() as unknown as Navegar
  return {
    aPestana: (periodo?: number) =>
      navigate({ to: paths.app.convivencia.getHref(), search: { tab: "comite", ...(periodo != null && { periodo }) } }),
    aIntegrantes: (periodo?: number) =>
      navigate({ to: paths.app.convivenciaComiteIntegrantes.getHref(), search: periodo != null ? { periodo } : {} }),
    aSesionNueva: (periodo?: number) =>
      navigate({ to: paths.app.convivenciaSesionNueva.getHref(), search: periodo != null ? { periodo } : {} }),
    aSesion: (id: number) => navigate({ to: paths.app.convivenciaSesion.getHref(id) }),
    aSesionEditar: (id: number) => navigate({ to: paths.app.convivenciaSesionEditar.getHref(id) }),
    cambiarPeriodoIntegrantes: (periodo: number) =>
      navigate({ to: paths.app.convivenciaComiteIntegrantes.getHref(), search: { periodo }, replace: true }),
  }
}
