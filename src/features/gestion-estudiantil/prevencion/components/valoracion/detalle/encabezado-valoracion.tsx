import { TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EyeIcon, ProhibitIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { ValoracionDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { NIVEL_COLOR } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import { BotonVolver } from "@/features/gestion-estudiantil/prevencion/components/boton-volver"
import type { useValoracionDetalle } from "@/features/gestion-estudiantil/prevencion/hooks/use-valoracion-detalle"

interface Props {
  valoracion: ValoracionDetalle
  d: ReturnType<typeof useValoracionDetalle>
}

/** Encabezado de la valoración: título con nivel y estado, Ver plan y el ⋮ con Anular valoración. */
export function EncabezadoValoracion({ valoracion: v, d }: Props) {
  return (
    <TableScreenHeader>
      <TableScreenTitle
        action={
          <div className="flex shrink-0 items-center gap-2">
            {v.fk_tprevencion_plan != null && (
              <Button size="sm" type="button" variant="outline" onClick={d.verPlan}>
                <EyeIcon data-icon="inline-start" />
                Ver plan
              </Button>
            )}
            <AccionesFila
              modo="menu"
              etiqueta={`Acciones de la valoración de ${v.estudiante_nombre}`}
              acciones={[
                { id: "anular", label: "Anular valoración", icon: <ProhibitIcon />, disabled: v.anulada, onSelect: d.anular },
              ]}
            />
          </div>
        }
        description={<BotonVolver onClick={d.volver} />}
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-normal">
          Prevención › Valoración · {v.estudiante_nombre} · {v.grado_grupo}
          <Badge variant="soft" color={NIVEL_COLOR[v.nivel_valor]}>
            <span>{v.nivel_nombre}</span>
          </Badge>
          {v.anulada && (
            <Badge variant="soft" color="muted">
              <span>Anulada</span>
            </Badge>
          )}
        </span>
      </TableScreenTitle>
      <NoticeOutlet className="mx-(--screen-spacing) my-4" />
    </TableScreenHeader>
  )
}
