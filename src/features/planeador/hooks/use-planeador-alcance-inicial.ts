import { useEffect, useRef } from "react"

import {
  defaultsDeSede,
  usePlaneadorFiltroPeriodosQuery,
  usePlaneadorFiltroSedesQuery,
} from "@/features/planeador/api/query/use-planeador-filtros-query"
import {
  usePlaneadorDocenteScope,
  type PlaneadorAlcanceSearch,
} from "@/features/planeador/hooks/use-planeador-docente-scope"

/**
 * Valores por defecto al entrar sin nada en la URL, como Informes: si el
 * usuario alcanza una sola sede, se elige esa con el año del periodo
 * académico abierto y su jornada. Una sola vez por montaje, para que
 * "Limpiar todo" no lo vuelva a imponer.
 */
export function usePlaneadorAlcanceInicial(onChange: (next: PlaneadorAlcanceSearch) => void) {
  const scope = usePlaneadorDocenteScope()
  const habilitado = scope.enVistaConSelector && scope.puedeElegirDocente
  const sedes = usePlaneadorFiltroSedesQuery(habilitado)
  const unica = sedes.data?.length === 1 ? sedes.data[0] : undefined
  const periodos = usePlaneadorFiltroPeriodosQuery(unica?.id, habilitado && scope.sedeId == null)
  const hecho = useRef(false)
  const latest = useRef({ onChange, funcionario: scope.funcionario })
  latest.current = { onChange, funcionario: scope.funcionario }

  useEffect(() => {
    if (hecho.current || !habilitado || !sedes.data) return
    if (scope.sedeId != null || !unica) {
      hecho.current = true
      return
    }
    if (!periodos.data) return
    hecho.current = true
    latest.current.onChange({
      sede: unica.id,
      ...defaultsDeSede(periodos.data),
      docente: latest.current.funcionario,
    })
  }, [habilitado, sedes.data, unica, periodos.data, scope.sedeId])
}

