import { api } from "@/lib/api-client"
import type { SedeFuncionario } from "@/features/establishment/academic-period/api/query/use-sede-funcionarios"

interface SedeFuncionariosResponse {
  rows: SedeFuncionario[]
}

// `fn_grupo_crear`/`fn_grupo_actualizar` piden `FK_FUNCIONARIO`, pero el
// selector de "director de grupo" trabaja por nombre (ver
// use-sede-funcionarios.ts). Se re-resuelve justo antes de guardar, mismo
// patrón que los demás resolve-*.ts.
export async function resolveDirectorId(
  sedeId: string | undefined,
  nombre: string | undefined
): Promise<number | null> {
  if (!sedeId || !nombre) return null
  const raw: SedeFuncionariosResponse = await api.get(
    `/eval-col/sedes/${sedeId}/funcionarios`
  )
  const match = (raw.rows ?? []).find((row) => row.nombre === nombre)
  return match ? match.id : null
}
