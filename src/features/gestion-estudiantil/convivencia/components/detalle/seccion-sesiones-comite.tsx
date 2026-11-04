import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { paths } from "@/config/paths"

import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"

/** «Sesiones del Comité» que trataron el caso, con su decisión y el seguimiento fijado. */
export function SeccionSesionesComite({ caso }: { caso: CasoDetalle }) {
  const sesiones = caso.sesiones_comite ?? []
  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      defaultAbierta={sesiones.length > 0}
      titulo={`Sesiones del Comité (${sesiones.length})`}
      contentClassName="flex flex-col gap-3 px-4 py-4"
    >
      {sesiones.length === 0 ? (
        <p className="text-sm text-muted-foreground">El caso aún no se ha tratado en una sesión del Comité.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {sesiones.map((s) => (
            <li key={s.fk_sesion} className="flex flex-col gap-1 rounded-lg border border-border px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={paths.app.convivenciaSesion.getHref(s.fk_sesion)} className="font-medium text-primary hover:underline">
                  Sesión {s.numero}
                </Link>
                <span className="text-muted-foreground">{formatFecha(s.fecha)}</span>
                <Badge variant="soft" color={s.con_quorum ? "success" : "warning"}>
                  {s.con_quorum ? "Con quórum" : "Sin quórum"}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap text-muted-foreground">{s.decision}</p>
              {(s.responsable_seguimiento || s.fecha_seguimiento) && (
                <p className="text-xs text-muted-foreground">
                  Seguimiento: {s.responsable_seguimiento}
                  {s.fecha_seguimiento && ` · ${formatFecha(s.fecha_seguimiento)}`}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </SeccionPlegable>
  )
}
