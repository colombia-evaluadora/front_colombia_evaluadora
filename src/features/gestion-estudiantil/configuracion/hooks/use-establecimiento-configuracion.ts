import { useMemo, useState } from "react"

import { useSedesGeQuery } from "@/features/gestion-estudiantil/commons/api/use-opciones-ge"

/**
 * El catálogo (y toda Configuración) es de un establecimiento: con uno solo se usa ese; con varios se elige.
 * Salen de las sedes al alcance de quien consulta (`/gestion-estudiantil/opciones/sedes`), no de
 * `/establecimientos/opciones`, que no lo ven todos los roles.
 */
export function useEstablecimientoConfiguracion() {
  const sedesQ = useSedesGeQuery()
  const [elegido, setElegido] = useState("")

  const opciones = useMemo(() => {
    const porId = new Map((sedesQ.data ?? []).map((s) => [s.establecimientoId, s.establecimientoNombre]))
    return [...porId.entries()].map(([id, nombre]) => ({ value: String(id), label: nombre }))
  }, [sedesQ.data])

  const actual = elegido || opciones[0]?.value || ""
  return {
    opciones,
    valor: actual,
    id: actual ? Number(actual) : null,
    elegir: setElegido,
    cargando: sedesQ.isPending,
  }
}
