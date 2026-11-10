import { useQuery, type QueryKey } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"

interface GrupoOpcion {
  fk_tsede: number
  sede_nombre: string
  fk_tlv_jornada: number
  jornada_nombre: string
  fk_tgrupo: number
  grupo_etiqueta: string
}

const BASE = "/gestion-estudiantil/convivencia/opciones"

const unicas = (pares: Array<[number, string]>): Opcion[] =>
  [...new Map(pares).entries()].map(([id, label]) => ({ value: String(id), label }))

/**
 * Sede → Jornada → Grupo del período vigente. La cascada de Informes exige el menú INFORMES, que
 * orientación y trabajo social no tienen, así que se usa el endpoint de opciones de Convivencia.
 * Sin estado compartido: cada módulo pasa su propia raíz de query-key (`claveModulo`), de modo que
 * cada uno tiene su caché y no se mezcla con la de otro.
 */
export function useOpcionesGrupos(claveModulo: QueryKey, sede: string, jornada: string) {
  const { data = [] } = useQuery({
    queryKey: [...claveModulo, "opciones-grupos"],
    queryFn: () => evalCol.getRows<GrupoOpcion>(`${BASE}/grupos`),
    staleTime: 5 * 60_000,
  })
  const enSede = sede ? data.filter((g) => String(g.fk_tsede) === sede) : []
  const enJornada = jornada ? enSede.filter((g) => String(g.fk_tlv_jornada) === jornada) : []
  return {
    sedeOpciones: unicas(data.map((g) => [g.fk_tsede, g.sede_nombre])),
    jornadaOpciones: unicas(enSede.map((g) => [g.fk_tlv_jornada, g.jornada_nombre])),
    grupoOpciones: enJornada.map((g) => ({ value: String(g.fk_tgrupo), label: g.grupo_etiqueta })),
  }
}
