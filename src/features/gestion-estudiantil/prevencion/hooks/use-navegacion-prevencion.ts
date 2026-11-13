import { useCallback } from "react"
import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router"

import { paths } from "@/config/paths"

/** Navegación entre las pantallas de Prevención (valorar, plan, historial) y de vuelta a donde se venía. */
export function useNavegacionPrevencion() {
  const navigate = useNavigate()
  const router = useRouter()
  const puedeVolver = useCanGoBack()

  const ir = useCallback(
    (to: string, search?: Record<string, unknown>, replace?: boolean) => navigate({ to, search, replace } as never),
    [navigate],
  )

  const irValorar = useCallback(
    (matricula?: number) => ir(paths.app.prevencionValorar.getHref(), { matricula }),
    [ir],
  )
  const irPlanNuevo = useCallback(
    (matricula: number, valoracion?: number) => ir(paths.app.prevencionPlanNuevo.getHref(), { matricula, valoracion }),
    [ir],
  )
  const irHistorial = useCallback(
    (matricula: number, grupo?: string) => ir(paths.app.prevencionHistorial.getHref(matricula), { grupo }),
    [ir],
  )
  const irPlan = useCallback((planId: number) => ir(paths.app.prevencionPlanDetalle.getHref(planId)), [ir])
  const irPlanEditar = useCallback((planId: number) => ir(paths.app.prevencionPlanEditar.getHref(planId)), [ir])
  const irAbrirCaso = useCallback((planId: number) => ir(paths.app.prevencionPlanCaso.getHref(planId)), [ir])
  const irCaso = useCallback((casoId: number) => ir(paths.app.convivenciaCaso.getHref(casoId)), [ir])
  const irValoracion = useCallback(
    (valoracionId: number) => ir(paths.app.prevencionValoracionDetalle.getHref(valoracionId)),
    [ir],
  )
  const irReporteSaludMental = useCallback(() => ir(paths.app.prevencionSaludMentalNuevo.getHref()), [ir])
  const irSenalSaludMental = useCallback(
    (senalId: number) => ir(paths.app.prevencionSenalSaludMental.getHref(senalId)),
    [ir],
  )
  const irEstrategiaNueva = useCallback(() => ir(paths.app.prevencionEstrategiaNueva.getHref()), [ir])
  /** Con `reemplazar`, el formulario de creación no queda en el historial (tras el primer guardado). */
  const irEstrategiaEditar = useCallback(
    (estrategiaId: number, reemplazar = false) =>
      ir(paths.app.prevencionEstrategiaEditar.getHref(estrategiaId), undefined, reemplazar),
    [ir],
  )
  const irEstrategia = useCallback(
    (estrategiaId: number) => ir(paths.app.prevencionEstrategiaDetalle.getHref(estrategiaId)),
    [ir],
  )
  const irCaracterizacion = useCallback(
    (matricula: number) => ir(paths.app.prevencionCaracterizacion.getHref(matricula)),
    [ir],
  )
  /** Desde la vista de lectura se reemplaza la entrada, para que Cancelar y Guardar vuelvan a donde se venía. */
  const irCaracterizacionEditar = useCallback(
    (matricula: number, reemplazar = false) =>
      ir(paths.app.prevencionCaracterizacionEditar.getHref(matricula), undefined, reemplazar),
    [ir],
  )
  const irHistorialAcademico = useCallback(
    (matricula: number) => ir(paths.app.prevencionHistorialAcademico.getHref(matricula)),
    [ir],
  )
  /** Atrás en el historial del navegador; sin historial, al tablero. */
  const volver = useCallback(() => {
    if (puedeVolver) router.history.back()
    else ir(paths.app.prevencionRetencion.getHref())
  }, [puedeVolver, router, ir])

  return { irValorar, irPlanNuevo, irHistorial, irPlan, irPlanEditar, irValoracion, irAbrirCaso, irCaso, irReporteSaludMental, irSenalSaludMental, irEstrategiaNueva, irEstrategiaEditar, irEstrategia, irCaracterizacion, irCaracterizacionEditar, irHistorialAcademico, volver }
}
