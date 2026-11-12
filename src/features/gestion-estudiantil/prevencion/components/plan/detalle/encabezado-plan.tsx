import { TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, GavelIcon, ControlPointIcon, PencilIcon, PencilSimpleIcon, ProhibitIcon, XCircleIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import type { PlanDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { ESTADO_PLAN_COLOR, ESTADO_PLAN_ETIQUETA } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import { BotonVolver } from "@/features/gestion-estudiantil/prevencion/components/boton-volver"
import type { usePlanDetalle } from "@/features/gestion-estudiantil/prevencion/hooks/use-plan-detalle"

interface Props {
  plan: PlanDetalle
  d: ReturnType<typeof usePlanDetalle>
}

/** Encabezado del plan (G.8.VAL.5): título con el estado, Marcar Superado / Incumplido y el ⋮ con sus operaciones. */
export function EncabezadoPlan({ plan: p, d }: Props) {
  return (
    <TableScreenHeader>
      <TableScreenTitle
        action={
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" type="button" variant="outline" disabled={!p.puede_marcar} onClick={() => d.marcar("SUPERADO")}>
              <CheckCircleIcon data-icon="inline-start" />
              Marcar Superado
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              color="destructive"
              disabled={!p.puede_marcar}
              onClick={() => d.marcar("INCUMPLIDO")}
            >
              <XCircleIcon data-icon="inline-start" />
              Marcar Incumplido
            </Button>
            <AccionesFila
              modo="menu"
              etiqueta={`Acciones del plan de ${d.estudiante}`}
              acciones={[
                {
                  id: "avance",
                  label: "Registrar avance",
                  icon: <ControlPointIcon />,
                  disabled: !d.hayAvanzable,
                  onSelect: () => d.registrarAvance(),
                },
                {
                  id: "aceptacion",
                  label: "Registrar aceptación presencial",
                  icon: <PencilIcon />,
                  disabled: !p.puede_aceptar_presencial,
                  onSelect: d.aceptarPresencial,
                },
                {
                  id: "modificar",
                  label: "Modificar plan",
                  icon: <PencilSimpleIcon />,
                  disabled: !p.puede_modificar,
                  onSelect: d.modificar,
                },
                {
                  id: "caso",
                  label: "Abrir caso de convivencia",
                  icon: <GavelIcon />,
                  disabled: p.caso_convivencia != null || p.estado === "ANULADO",
                  onSelect: d.abrirCaso,
                },
                {
                  id: "anular",
                  label: "Anular plan",
                  icon: <ProhibitIcon />,
                  disabled: !p.puede_anular,
                  onSelect: d.anular,
                },
              ]}
            />
          </div>
        }
        description={<BotonVolver onClick={d.volver} />}
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-normal">
          Prevención › Plan de acompañamiento · {d.estudiante} · {p.grado_grupo}
          <Badge variant="soft" color={ESTADO_PLAN_COLOR[p.estado]}>
            <span>{ESTADO_PLAN_ETIQUETA[p.estado]}</span>
          </Badge>
        </span>
      </TableScreenTitle>
      <NoticeOutlet className="mx-(--screen-spacing) my-4" />
    </TableScreenHeader>
  )
}
