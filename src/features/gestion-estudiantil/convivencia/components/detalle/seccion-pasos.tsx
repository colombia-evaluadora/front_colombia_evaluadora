import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

import { usePasosCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import type { PasoCaso } from "@/features/gestion-estudiantil/convivencia/api/types"
import { Seccion } from "@/features/gestion-estudiantil/convivencia/components/detalle/dato"

function EstadoPaso({ paso }: { paso: PasoCaso }) {
  if (paso.no_aplica)
    return (
      <Badge variant="soft" color="muted">
        No aplica
      </Badge>
    )
  return paso.registrado ? (
    <Badge variant="soft" color="success">
      Registrado
    </Badge>
  ) : (
    <Badge variant="soft" color="warning">
      Pendiente
    </Badge>
  )
}

/** «Pasos obligatorios del protocolo» con su estado. */
export function SeccionPasos({ casoId }: { casoId: number }) {
  const pasos = usePasosCasoQuery(casoId)
  return (
    <Seccion titulo="Pasos obligatorios del protocolo">
      {pasos.isPending ? (
        <Skeleton className="h-24" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {(pasos.data ?? []).map((p) => (
            <li key={p.accion} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <span>
                {p.accion_nombre}
                {p.condicional && <span className="text-xs text-muted-foreground"> · condicional</span>}
                {p.de_cierre && <span className="text-xs text-muted-foreground"> · de cierre</span>}
              </span>
              <EstadoPaso paso={p} />
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  )
}
