import { Badge } from "@/components/ui/badge"

import { nombreDe, useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { formatFechaHora } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { Seccion } from "@/features/gestion-estudiantil/convivencia/components/detalle/dato"
import { nombreAfectado } from "@/features/gestion-estudiantil/convivencia/utils/detalle"

/** «Historial de acciones» del protocolo. */
export function SeccionHistorial({ caso }: { caso: CasoDetalle }) {
  const entidades = useCatalogo("ENTIDAD_CONCERNIDA_CONVIVENCIA")
  return (
    <Seccion titulo={`Historial de acciones (${caso.acciones?.length ?? 0})`}>
      {caso.acciones?.length ? (
        <ol className="flex flex-col gap-3">
          {caso.acciones.map((a) => (
            <li key={a.id} className="flex flex-col gap-1 rounded-lg border border-border px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{a.accion_nombre}</span>
                {a.no_aplica && (
                  <Badge variant="soft" color="muted">
                    No aplica
                  </Badge>
                )}
                {a.resultado_nombre && (
                  <Badge variant="soft" color="info">
                    {a.resultado_nombre}
                  </Badge>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatFechaHora(a.fecha_hora)} · {a.responsable_nombre}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-muted-foreground">{a.descripcion}</p>
              {(a.fk_tlv_entidad || a.soportes.length > 0 || a.codigos_siuce.length > 0) && (
                <p className="text-xs text-muted-foreground">
                  {a.fk_tlv_entidad && `Entidad: ${nombreDe(entidades, a.fk_tlv_entidad) ?? ""}. `}
                  {a.soportes.length > 0 && `${a.soportes.length} soporte(s). `}
                  {a.codigos_siuce.length > 0 &&
                    `SIUCE: ${a.codigos_siuce.map((c) => `${nombreAfectado(caso, c) ?? "afectado"} ${c.codigo}`).join(", ")}.`}
                </p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Aún no hay acciones registradas.</p>
      )}
    </Seccion>
  )
}
