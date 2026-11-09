import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClipboardAddIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  FileTextIcon,
  GavelIcon,
  PencilIcon,
  ProhibitIcon,
  UserSwitchIcon,
} from "@/components/ui/icons"

import type { ProcesoAcciones } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"

export type AccionProceso =
  | "ver"
  | "descargos"
  | "decision"
  | "notificar"
  | "recurso"
  | "resolver"
  | "ajustar"
  | "cumplimiento"
  | "anular"

interface Props {
  numero: string
  acciones: ProcesoAcciones
  onAccion: (accion: AccionProceso) => void
  /** En el detalle ya se está viendo el proceso: se omite «Ver detalle». */
  sinVerDetalle?: boolean
  /** Contenido extra al final del menú (p. ej. documentos). */
  children?: ReactNode
}

/** Menú ⋮ del proceso (G.2.PRD.LIS.3): todas las acciones visibles; las que el backend niega, deshabilitadas. */
export function MenuAccionesProceso({ numero, acciones, onAccion, sinVerDetalle, children }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones del proceso ${numero}`} />}
      >
        <DotsThreeVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!sinVerDetalle && (
          <DropdownMenuItem disabled={!acciones.puede_ver_detalle} onClick={() => onAccion("ver")}>
            <EyeIcon />
            Ver detalle
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled={!acciones.puede_descargos} onClick={() => onAccion("descargos")}>
          <ClipboardAddIcon />
          Registrar descargos
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!acciones.puede_decidir} onClick={() => onAccion("decision")}>
          <GavelIcon />
          Registrar decisión
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!acciones.puede_notificar} onClick={() => onAccion("notificar")}>
          <UserSwitchIcon />
          Notificación presencial
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!acciones.puede_recurso} onClick={() => onAccion("recurso")}>
          <FileTextIcon />
          Registrar recurso
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!acciones.puede_resolver} onClick={() => onAccion("resolver")}>
          <PencilIcon />
          Resolver recurso
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!acciones.puede_ajustar} onClick={() => onAccion("ajustar")}>
          <CalendarBlankIcon />
          Ajustar fechas
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!acciones.puede_cumplimiento} onClick={() => onAccion("cumplimiento")}>
          <CheckCircleIcon />
          Registrar cumplimiento
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!acciones.puede_anular} onClick={() => onAccion("anular")}>
          <ProhibitIcon />
          Anular
        </DropdownMenuItem>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
