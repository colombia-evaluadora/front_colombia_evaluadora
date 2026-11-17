import { useMemo, useState } from "react"

import { useSedesInformeQuery } from "@/features/academic-management/reports/api/query/use-cascada-query"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"

/**
 * El catálogo (y toda Configuración) es de un establecimiento: con uno solo se usa ese; con varios se elige.
 * `/establecimientos/opciones` no lo ven todos los roles (el Supervisor de sede recibe 403): entonces salen
 * de las sedes al alcance de quien consulta (cascada de Informes, fn_usuario_sedes_lectura).
 */
export function useEstablecimientoConfiguracion() {
  const establecimientosQ = useEstablishmentsOptionsQuery()
  const usarSedes = establecimientosQ.isError
  const sedesQ = useSedesInformeQuery()
  const [elegido, setElegido] = useState("")

  const opciones = useMemo(() => {
    if (!usarSedes) return (establecimientosQ.data ?? []).map((e) => ({ value: String(e.id), label: e.name }))
    const porId = new Map((sedesQ.data ?? []).map((s) => [s.establecimientoId, s.establecimientoNombre]))
    return [...porId.entries()].map(([id, nombre]) => ({ value: String(id), label: nombre }))
  }, [usarSedes, establecimientosQ.data, sedesQ.data])

  const actual = elegido || opciones[0]?.value || ""
  return {
    opciones,
    valor: actual,
    id: actual ? Number(actual) : null,
    elegir: setElegido,
    cargando: establecimientosQ.isPending || (usarSedes && sedesQ.isPending),
  }
}
