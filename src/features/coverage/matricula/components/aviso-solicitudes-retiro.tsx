import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { WarningIcon } from "@/components/ui/icons"
import { evalCol } from "@/lib/eval-col-client"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"

interface ConteoRow {
  retiros_sin_responder: number
  anulaciones_pendientes: number
}

/** Conteo de la Sección 2.2, en las Sedes y Jornadas del usuario. Cuelga de la lista: se refresca al responder. */
function useSolicitudesPendientesQuery() {
  return useQuery({
    queryKey: matriculaKeys.solicitudesPendientes(),
    queryFn: async () => {
      const row = await evalCol.getRow<ConteoRow>("/matricula/solicitudes-pendientes")
      return { retiros: row.retiros_sin_responder ?? 0, anulaciones: row.anulaciones_pendientes ?? 0 }
    },
  })
}

const estudiantes = (n: number) => `${n} ${n === 1 ? "estudiante" : "estudiantes"}`

interface Props {
  /** El filtro ya está aplicado: el enlace no se ofrece. */
  filtrando: boolean
  onFiltrar: () => void
}

/**
 * Aviso fijo sobre la lista (Sección 2.2): cuántos estudiantes tienen una
 * solicitud de retiro sin responder (origen) o una anulación pendiente
 * (destino), con un enlace que filtra la lista a ellos.
 */
export function AvisoSolicitudesRetiro({ filtrando, onFiltrar }: Props) {
  const { data } = useSolicitudesPendientesQuery()
  if (!data || (data.retiros === 0 && data.anulaciones === 0)) return null

  const partes = [
    data.retiros > 0 ? `${estudiantes(data.retiros)} con solicitud de retiro sin responder` : null,
    data.anulaciones > 0 ? `${estudiantes(data.anulaciones)} con anulación pendiente` : null,
  ].filter(Boolean)

  return (
    <div
      role="status"
      className="mx-(--screen-spacing) flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-yellow-stroke bg-yellow-22 px-4 py-2.5 text-sm"
    >
      <WarningIcon className="size-5 shrink-0 text-yellow" aria-hidden />
      <p className="min-w-0 flex-1">{partes.join(" · ")}</p>
      {!filtrando ? (
        <Button type="button" variant="link" color="primary" size="sm" className="h-auto px-0" onClick={onFiltrar}>
          Ver estudiantes
        </Button>
      ) : null}
    </div>
  )
}
