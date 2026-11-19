import { TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import type { SenalSMDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BotonVolver } from "@/features/gestion-estudiantil/prevencion/components/boton-volver"
import { BadgeEstadoSenal } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/badges-senal"
import { accionesSenal } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/acciones-senal"
import type { useSenalDetalle } from "@/features/gestion-estudiantil/prevencion/hooks/use-senal-detalle"

interface Props {
  senal: SenalSMDetalle
  d: ReturnType<typeof useSenalDetalle>
}

/**
 * Encabezado de la señal (G.8.SAL.4-6): título con estado; Cancelar/Guardar mientras se puede valorar y, ya
 * valorada, el ⋮ con Registrar atención y Cerrar.
 */
export function EncabezadoSenal({ senal: s, d }: Props) {
  const menu = accionesSenal(s, `Acciones de la señal de ${s.estudiante_nombre}`, (accion) => {
    if (accion === "atencion") d.abrirAtencion()
    else if (accion === "cerrar") d.abrirCierre()
  })
  const acciones = menu.acciones.filter((a) => a.id === "atencion" || a.id === "cerrar")

  return (
    <TableScreenHeader>
      <TableScreenTitle
        action={
          <div className="flex shrink-0 items-center gap-2">
            {s.puede_valorar && (
              <>
                <Button size="sm" type="button" variant="outline" color="neutral" disabled={d.pending} onClick={d.volver}>
                  Cancelar
                </Button>
                <Button size="sm" type="button" disabled={d.pending} onClick={d.guardar}>
                  <IconoCarga cargando={d.pending}>
                    <FloppyDiskIcon data-icon="inline-start" />
                  </IconoCarga>
                  Guardar
                </Button>
              </>
            )}
            {s.ve_sensible && s.estado !== "POR_VALORAR" && (
              <AccionesFila modo="menu" etiqueta={menu.etiqueta} acciones={acciones} />
            )}
          </div>
        }
        description={<BotonVolver onClick={d.volver} />}
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-normal">
          Prevención › Señal de salud mental · {s.estudiante_nombre} · {s.grado_grupo}
          <BadgeEstadoSenal estado={s.estado} nombre={s.estado_nombre} />
        </span>
      </TableScreenTitle>
      <NoticeOutlet className="mx-(--screen-spacing) my-4" />
    </TableScreenHeader>
  )
}
