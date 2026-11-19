import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"

/** Registro de estudiante que se puede elegir para unificar (Regla 72). */
export interface EstudianteUnificable {
  id: number
  tipoDocumento: string
  documento: string
  nombre: string
  /** Matrícula Cursando, si tiene: decide el bloqueo «ambos en el mismo período». */
  cursando: { periodoId: number; periodo: string; establecimiento: string; grupo: string } | null
  /** Lo que pasaría al que se conserva si este fuera el duplicado. */
  matriculas: number
  reservas: number
  /** Establecimientos con matrícula del estudiante: a ellos se les avisa. */
  establecimientos: string[]
}

interface EstudianteRow {
  pk_testudiante: number
  tipo_documento: string
  identificacion: string
  nombre: string
  cursando_periodo_id: number | null
  cursando_periodo: string | null
  cursando_establecimiento: string | null
  cursando_grupo: string | null
  matriculas: number
  reservas: number
  establecimientos: string[] | null
}

const toEstudiante = (row: EstudianteRow): EstudianteUnificable => ({
  id: row.pk_testudiante,
  tipoDocumento: row.tipo_documento,
  documento: row.identificacion,
  nombre: row.nombre,
  cursando:
    row.cursando_periodo_id != null
      ? {
          periodoId: row.cursando_periodo_id,
          periodo: row.cursando_periodo ?? "",
          establecimiento: row.cursando_establecimiento ?? "",
          grupo: row.cursando_grupo ?? "",
        }
      : null,
  matriculas: row.matriculas ?? 0,
  reservas: row.reservas ?? 0,
  establecimientos: row.establecimientos ?? [],
})

const MIN_BUSQUEDA = 3

function useDebounced(valor: string, ms = 300) {
  const [debounced, setDebounced] = useState(valor)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), ms)
    return () => clearTimeout(id)
  }, [valor, ms])
  return debounced
}

/** Busca por documento o nombre; excluye los registros ya unificados. */
export function useBuscarEstudiantesQuery(texto: string) {
  const q = useDebounced(texto.trim())
  return useQuery({
    queryKey: matriculaKeys.buscarEstudiantes(q),
    queryFn: async () => {
      const rows = await evalCol.getRows<EstudianteRow>(
        `/cobertura-academica/estudiantes/buscar?Q=${encodeURIComponent(q)}`,
      )
      return rows.map(toEstudiante)
    },
    enabled: q.length >= MIN_BUSQUEDA,
  })
}
