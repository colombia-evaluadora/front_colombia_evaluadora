import { useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"

import { paths } from "@/config/paths"

/** Navegación entre la bandeja de Reintegración, Abrir caso y el detalle de un caso. */
export function useNavegacionReintegracion() {
  const navigate = useNavigate()

  const ir = useCallback(
    (to: string, replace?: boolean) => navigate({ to, replace } as never),
    [navigate],
  )

  const irBandeja = useCallback(() => ir(paths.app.reintegracion.getHref()), [ir])
  const irAbrirCaso = useCallback(() => ir(paths.app.reintegracionAbrir.getHref()), [ir])
  /** Con `reemplazar`, Abrir caso no queda en el historial tras guardar. */
  const irCaso = useCallback(
    (casoId: number, reemplazar = false) => ir(paths.app.reintegracionCaso.getHref(casoId), reemplazar),
    [ir],
  )
  const irAbrirConvivencia = useCallback(
    (casoId: number) => ir(paths.app.reintegracionConvivencia.getHref(casoId)),
    [ir],
  )
  /** Abre el formulario de Prevención; guardar o cancelar vuelve atrás, al caso. */
  const irActualizarCaracterizacion = useCallback(
    (matricula: number) => ir(paths.app.prevencionCaracterizacionEditar.getHref(matricula)),
    [ir],
  )
  const irCasoConvivencia = useCallback((casoId: number) => ir(paths.app.convivenciaCaso.getHref(casoId)), [ir])

  return { irBandeja, irAbrirCaso, irCaso, irAbrirConvivencia, irActualizarCaracterizacion, irCasoConvivencia }
}
