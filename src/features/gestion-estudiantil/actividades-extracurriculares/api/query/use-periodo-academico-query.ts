import { useMemo } from "react"

import { useAniosGeQuery, useJornadasGeQuery } from "@/features/gestion-estudiantil/commons/api/use-opciones-ge"

/**
 * Período Académico de una Sede y Jornada, para el formulario de la actividad. La actividad pertenece a un
 * período académico (no de evaluación); la cascada de GE ya lo trae por jornada del año en curso
 * (`/gestion-estudiantil/opciones/jornadas` → `fk_tperiodo_academico`), así que el usuario no lo elige: sale de Sede + Jornada.
 */
export function usePeriodoAcademicoDeJornada(sede: string, jornada: string) {
  const sedeId = sede ? Number(sede) : null
  const anios = useAniosGeQuery(sedeId)
  const anio = anios.data?.find((a) => a.esActual)?.anio ?? anios.data?.[0]?.anio ?? null
  const jornadas = useJornadasGeQuery(sedeId, anio)

  return useMemo(() => {
    const j = (jornadas.data ?? []).find((x) => String(x.id) === jornada)
    return {
      id: j?.periodoAcademicoId ?? null,
      nombre: j?.periodoAcademicoNombre ?? null,
      fechaInicio: j?.fechaInicio ?? null,
      fechaFin: j?.fechaFin ?? null,
    }
  }, [jornadas.data, jornada])
}
