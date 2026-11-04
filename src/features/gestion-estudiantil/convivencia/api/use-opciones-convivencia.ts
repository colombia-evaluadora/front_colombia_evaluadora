import {
  useAniosInformeQuery,
  useJornadasInformeQuery,
  useSedesInformeQuery,
} from "@/features/academic-management/reports/api/query/use-cascada-query"
import { useGruposPeriodoQuery } from "@/features/academic-management/reports/api/query/use-grupos-periodo-query"

export interface Opcion {
  value: string
  label: string
}

/**
 * Sede → Jornada → Grado/Grupo del año en curso, desde la cascada de Informes
 * (ya acotada al alcance de quien pregunta), igual que el Observador.
 */
export function useOpcionesConvivencia(sede: string, jornada: string) {
  const sedeId = sede ? Number(sede) : null
  const jornadaId = jornada ? Number(jornada) : null

  const sedes = useSedesInformeQuery()
  const anios = useAniosInformeQuery(sedeId)
  const anio = anios.data?.find((a) => a.esActual)?.anio ?? anios.data?.[0]?.anio ?? null
  const jornadas = useJornadasInformeQuery(sedeId, anio)
  const grupos = useGruposPeriodoQuery({ sedeId, anio, jornadaId })

  const sedeOpciones: Opcion[] = (sedes.data ?? []).map((s) => ({ value: String(s.id), label: s.nombre }))
  // Una jornada puede llegar repetida si la sede tiene dos períodos académicos en el año.
  const jornadaOpciones: Opcion[] = [
    ...new Map((jornadas.data ?? []).map((j) => [j.id, { value: String(j.id), label: j.nombre }])).values(),
  ]
  const grupoOpciones: Opcion[] = (grupos.data ?? []).map((g) => ({
    value: String(g.grupoId),
    label: `${g.gradoNombre} · ${g.grupoEtiqueta}`,
  }))

  return { sedeOpciones, jornadaOpciones, grupoOpciones }
}
