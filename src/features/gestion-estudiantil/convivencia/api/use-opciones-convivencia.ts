import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { convivenciaKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"

export interface Opcion {
  value: string
  label: string
}

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
 * Sede → Jornada → Grupo del período vigente, del endpoint propio de Convivencia: la cascada de
 * Informes exige el menú INFORMES, que orientación y trabajo social no tienen. Una sola consulta
 * por sesión; las tres listas se derivan de ella.
 */
export function useOpcionesConvivencia(sede: string, jornada: string) {
  const { data = [] } = useQuery({
    queryKey: [...convivenciaKeys.all, "opciones-grupos"],
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

/** Matrículas Cursando del grupo, para «Agregar estudiante». */
export function useEstudiantesGrupoQuery(grupo: string) {
  return useQuery({
    queryKey: [...convivenciaKeys.all, "opciones-estudiantes", grupo],
    queryFn: () =>
      evalCol.getRows<{ fk_matricula: number; nombre: string }>(`${BASE}/estudiantes?GRUPO=${grupo}`),
    enabled: Boolean(grupo),
    staleTime: 60_000,
  })
}
