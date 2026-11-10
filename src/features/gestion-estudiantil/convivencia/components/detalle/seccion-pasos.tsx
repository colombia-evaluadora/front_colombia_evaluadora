import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

import { usePasosCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import type { CasoDetalle, PasoCaso } from "@/features/gestion-estudiantil/convivencia/api/types"
import { COD, esGrave } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { Seccion } from "@/features/gestion-estudiantil/commons/components/dato"
import { codigosReportados, etiquetaPasoCierre } from "@/features/gestion-estudiantil/convivencia/utils/detalle"

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
export function SeccionPasos({ caso }: { caso: CasoDetalle }) {
  const pasos = usePasosCasoQuery(caso.id)
  const grave = esGrave(caso.tipo_codigo)
  const codigos = codigosReportados(caso, COD.reporteSiuce)
  return (
    <Seccion titulo="Pasos obligatorios del protocolo">
      {pasos.isPending ? (
        <Skeleton className="h-24" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {(pasos.data ?? []).map((p) => (
            <li key={p.accion} className="flex flex-col gap-1 px-4 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>
                  {p.accion_nombre}
                  {p.condicional && <span className="text-xs text-muted-foreground"> · condicional</span>}
                  {p.de_cierre && <span className="text-xs text-muted-foreground"> · {etiquetaPasoCierre(grave)}</span>}
                </span>
                <EstadoPaso paso={p} />
              </div>
              {p.accion === COD.reporteSiuce && codigos.length > 0 && (
                <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  {codigos.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  )
}
