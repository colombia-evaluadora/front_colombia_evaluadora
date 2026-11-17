import { TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { BotonVolver } from "@/features/gestion-estudiantil/prevencion/components/boton-volver"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { accionesCaso, type AccionCaso } from "@/features/gestion-estudiantil/reintegracion/components/acciones-caso"
import { BadgesEstadoCaso } from "@/features/gestion-estudiantil/reintegracion/components/badges-caso"

interface Props {
  caso: CasoDetalle
  onVolver: () => void
  onAccion: (accion: AccionCaso) => void
}

/**
 * Cabecera del caso (G.9.CAS.1): «Caso · Estudiante · grado/grupo» con los badges de estado, validación y
 * alta complejidad, y un solo ⋮ con todas las acciones guiadas por las banderas del detalle.
 */
export function EncabezadoCaso({ caso: c, onVolver, onAccion }: Props) {
  const { etiqueta, acciones } = accionesCaso(
    { ...c.banderas, profesional_asignado: c.profesional != null },
    `Acciones del caso de ${c.estudiante_nombre}`,
    onAccion,
    true,
  )

  return (
    <TableScreenHeader>
      <TableScreenTitle
        action={
          <div className="flex shrink-0 items-center gap-2">
            <AccionesFila
              modo="menu"
              etiqueta={etiqueta}
              acciones={acciones.filter((a) => a.id !== "ver")}
            />
          </div>
        }
        description={<BotonVolver onClick={onVolver} />}
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-normal">
          Caso · {c.estudiante_nombre} · {c.grado_grupo}
          <BadgesEstadoCaso
            estado={c.estado}
            etiqueta={c.estado_etiqueta}
            pendienteValidacion={c.pendiente_validacion}
          />
          {c.alta_complejidad && (
            <Badge variant="soft" color="orange">
              <span>Alta complejidad</span>
            </Badge>
          )}
        </span>
      </TableScreenTitle>
      <NoticeOutlet className="mx-(--screen-spacing) my-4" />
    </TableScreenHeader>
  )
}
