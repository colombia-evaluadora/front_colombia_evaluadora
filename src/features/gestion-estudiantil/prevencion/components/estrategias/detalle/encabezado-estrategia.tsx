import { TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, CopyIcon, PencilIcon, ControlPointIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { EstrategiaDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BotonVolver } from "@/features/gestion-estudiantil/prevencion/components/boton-volver"
import { BadgeEstadoEstrategia } from "@/features/gestion-estudiantil/prevencion/components/estrategias/badge-estado-estrategia"
import type { useEstrategiaDetalle } from "@/features/gestion-estudiantil/prevencion/hooks/use-estrategia-detalle"

interface Props {
  estrategia: EstrategiaDetalle
  d: ReturnType<typeof useEstrategiaDetalle>
}

/** Encabezado de la estrategia (G.8.EST.7): título con estado; Agregar beneficiarios, Modificar y el ⋮ con Copiar y Finalizar. */
export function EncabezadoEstrategia({ estrategia: e, d }: Props) {
  return (
    <TableScreenHeader>
      <TableScreenTitle
        action={
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" type="button" variant="outline" disabled={!e.puede_agregar_beneficiarios} onClick={d.abrirAgregar}>
              <ControlPointIcon data-icon="inline-start" />
              Agregar beneficiarios
            </Button>
            <Button size="sm" type="button" variant="outline" disabled={!e.puede_modificar} onClick={d.modificar}>
              <PencilIcon data-icon="inline-start" />
              Modificar
            </Button>
            <AccionesFila
              modo="menu"
              etiqueta={`Acciones de la estrategia ${e.nombre}`}
              acciones={[
                {
                  id: "copiar",
                  label: "Copiar estrategia",
                  icon: <CopyIcon />,
                  disabled: !e.puede_copiar,
                  onSelect: d.abrirCopiar,
                },
                {
                  id: "finalizar",
                  label: "Finalizar",
                  icon: <CheckCircleIcon />,
                  disabled: !e.puede_finalizar,
                  onSelect: d.abrirFinalizar,
                },
              ]}
            />
          </div>
        }
        description={<BotonVolver onClick={d.volver} />}
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-normal">
          Prevención › Estrategia · {e.nombre}
          <BadgeEstadoEstrategia estado={e.estado} nombre={e.estado_nombre} />
        </span>
      </TableScreenTitle>
      <NoticeOutlet className="mx-(--screen-spacing) my-4" />
    </TableScreenHeader>
  )
}
