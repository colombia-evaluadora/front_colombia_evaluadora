import { TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarPlusIcon, CheckCircleIcon, PencilIcon, PersonAddIcon, ProhibitIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { BotonVolver } from "@/features/gestion-estudiantil/prevencion/components/boton-volver"
import type { ActividadDetalle } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { ESTADO_ACTIVIDAD_COLOR } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/ui-mappings"

export type PestanaActividad = "participantes" | "sesiones"

interface Props {
  actividad: ActividadDetalle
  pestana: PestanaActividad
  onVolver: () => void
  onModificar: () => void
  onInscribir: () => void
  onNuevaSesion: () => void
  onEstado: () => void
}

/**
 * Cabecera de la actividad (G.5.ACT.DET.1): nombre con badges de tipo y estado, Modificar, la acción de la
 * pestaña (Inscribir estudiante / Nueva sesión) y un ⋮ con Inactivar o Activar.
 */
export function EncabezadoActividad({ actividad: a, pestana, onVolver, onModificar, onInscribir, onNuevaSesion, onEstado }: Props) {
  const enSesiones = pestana === "sesiones" && a.registra_asistencia
  return (
    <TableScreenHeader>
      <TableScreenTitle
        action={
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" type="button" variant="outline" disabled={!a.puede_editar} onClick={onModificar}>
              <PencilIcon data-icon="inline-start" />
              Modificar
            </Button>
            {/* Inscribir y registrar sesiones comparten gate (puede_inscribir) y piden la actividad Activa. */}
            <Button
              size="sm"
              type="button"
              disabled={!a.puede_inscribir || !a.esta_activa}
              onClick={enSesiones ? onNuevaSesion : onInscribir}
            >
              {enSesiones ? <CalendarPlusIcon data-icon="inline-start" /> : <PersonAddIcon data-icon="inline-start" />}
              {enSesiones ? "Nueva sesión" : "Inscribir estudiante"}
            </Button>
            <AccionesFila
              modo="menu"
              etiqueta={`Acciones de la actividad ${a.nombre}`}
              acciones={[
                {
                  id: "estado",
                  label: a.esta_activa ? "Inactivar" : "Activar",
                  icon: a.esta_activa ? <ProhibitIcon /> : <CheckCircleIcon />,
                  disabled: !a.puede_editar,
                  onSelect: onEstado,
                },
              ]}
            />
          </div>
        }
        description={<BotonVolver onClick={onVolver} />}
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-normal">
          Actividades › {a.nombre}
          <Badge variant="soft" color="primary">
            <span>{a.tipo_nombre}</span>
          </Badge>
          <Badge variant="soft" color={ESTADO_ACTIVIDAD_COLOR[a.esta_activa ? "ACTIVA" : "INACTIVA"]}>
            <span>{a.esta_activa ? "Activa" : "Inactiva"}</span>
          </Badge>
        </span>
      </TableScreenTitle>
      <NoticeOutlet className="mx-(--screen-spacing) my-4" />
    </TableScreenHeader>
  )
}
