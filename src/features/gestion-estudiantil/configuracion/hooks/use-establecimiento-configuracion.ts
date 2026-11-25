import { useMemo, useState } from "react"

import { useEstablecimientosGeQuery } from "@/features/gestion-estudiantil/commons/api/use-opciones-ge"

/**
 * El catálogo (y toda Configuración) es de un establecimiento: con uno solo se usa ese; con varios se elige.
 * Salen de `/gestion-estudiantil/opciones/establecimientos`, que no exige período académico: un establecimiento
 * recién creado también se configura. `/opciones/sedes` solo trae sedes con período activo.
 */
export function useEstablecimientoConfiguracion() {
  const establecimientosQ = useEstablecimientosGeQuery()
  const [elegido, setElegido] = useState("")

  const opciones = useMemo(
    () => (establecimientosQ.data ?? []).map((e) => ({ value: String(e.id), label: e.nombre })),
    [establecimientosQ.data],
  )

  const actual = elegido || opciones[0]?.value || ""
  return {
    opciones,
    valor: actual,
    id: actual ? Number(actual) : null,
    elegir: setElegido,
    cargando: establecimientosQ.isPending,
    error: establecimientosQ.error,
  }
}
