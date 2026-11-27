import { coberturaComplementariaRoute } from "@/router"

import { useEstablecimientosComplementariaQuery } from "@/features/coverage/matricula-complementaria/api/establecimientos"

/**
 * Establecimiento de la vista (común a las 3 pestañas, en la URL). Con uno solo
 * no se manda nada; con más de uno (rol territorial, solo lectura) se manda el
 * elegido o, si no hay, el primero (el back pide uno en convenios y convocatorias).
 */
export function useEstablecimiento() {
  const { establecimiento } = coberturaComplementariaRoute.useSearch()
  const navigate = coberturaComplementariaRoute.useNavigate()
  const { data: establecimientos = [], isPending } = useEstablecimientosComplementariaQuery()
  const territorial = establecimientos.length > 1
  const elegido = establecimientos.find((e) => e.id === establecimiento)?.id
  const establecimientoId = territorial ? (elegido ?? establecimientos[0].id) : undefined

  // Al cambiarlo se limpian los filtros que dependen del establecimiento.
  const setEstablecimiento = (id: number) =>
    navigate({
      search: (prev) => ({ ...prev, establecimiento: id, convocatoria: undefined, q: undefined, grado: undefined, page: 0 }),
      replace: true,
    })

  return { establecimientos, territorial, establecimientoId, setEstablecimiento, cargando: isPending }
}
