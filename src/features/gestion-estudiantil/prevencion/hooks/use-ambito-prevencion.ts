import { useMemo } from "react"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { useOpcionesSedesJornadasQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-opciones-prevencion-query"

/**
 * Establecimiento, sedes y jornadas al alcance de quien consulta, desde `/opciones/sedes-jornadas`
 * (sin pasar por Informes, que Orientación no ve). El establecimiento es el de la sede elegida o, con uno
 * solo en el alcance, ese; null mientras carga o si hay varios y no se eligió sede.
 */
export function useAmbitoPrevencion(sede: string) {
  const q = useOpcionesSedesJornadasQuery()
  const filas = q.data

  return useMemo(() => {
    const lista = filas ?? []
    const sedeOpciones: Opcion[] = [...new Map(lista.map((r) => [r.fk_tsede, r.sede_nombre])).entries()].map(
      ([id, nombre]) => ({ value: String(id), label: nombre }),
    )
    const jornadaOpciones: Opcion[] = sede
      ? [
          ...new Map(
            lista.filter((r) => String(r.fk_tsede) === sede).map((r) => [r.fk_tlv_jornada, r.jornada_nombre]),
          ).entries(),
        ].map(([id, nombre]) => ({ value: String(id), label: nombre }))
      : []
    const establecimientos = new Set(lista.map((r) => r.fk_testablecimiento))
    const establecimientoId =
      lista.find((r) => String(r.fk_tsede) === sede)?.fk_testablecimiento ??
      (establecimientos.size === 1 ? [...establecimientos][0] : null)
    return {
      sedeOpciones,
      jornadaOpciones,
      establecimientoId,
      /** Ya se sabe que no hay sedes en el alcance. */
      sinSedes: q.isSuccess && lista.length === 0,
    }
  }, [filas, sede, q.isSuccess])
}
