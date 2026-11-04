import type { ReactElement } from "react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  ArrowsDownUpIcon,
  CheckCircleIcon,
  ClipboardAddIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  PencilIcon,
  ProhibitIcon,
  UserSwitchIcon,
} from "@/components/ui/icons"

import type { ConvivenciaAccess } from "@/features/gestion-estudiantil/convivencia/api/use-convivencia-access"
import { esFinal } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { EstadoCasoCodigo } from "@/features/gestion-estudiantil/convivencia/api/types"

export type AccionCaso = "ver" | "modificar" | "accion" | "gestor" | "tipo" | "cerrar" | "anular"

export interface CasoMenuInfo {
  numero: string | number
  estado_codigo: EstadoCasoCodigo
  sinGestor: boolean
}

interface MenuAccionesCasoProps {
  caso: CasoMenuInfo
  access: ConvivenciaAccess
  onAccion: (accion: AccionCaso) => void
  /** En el detalle no se repite "Ver detalle". */
  conVer?: boolean
  trigger?: ReactElement
}

/** Menú ⋮ del caso (G.2.CAS.LIS.3): todas las acciones visibles; las que no aplican, deshabilitadas. */
export function MenuAccionesCaso({ caso, access, onAccion, conVer = true, trigger }: MenuAccionesCasoProps) {
  const abierto = !esFinal(caso.estado_codigo)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          trigger ?? (
            <Button variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones del caso ${caso.numero}`} />
          )
        }
      >
        <DotsThreeVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 *:whitespace-nowrap">
        {conVer && (
          <DropdownMenuItem onClick={() => onAccion("ver")}>
            <EyeIcon />
            Ver detalle
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled={!(abierto && access.puedeGestionar)} onClick={() => onAccion("modificar")}>
          <PencilIcon />
          Modificar o corregir fechas
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!(abierto && access.puedeGestionar)} onClick={() => onAccion("accion")}>
          <ClipboardAddIcon />
          Registrar acción
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!(abierto && access.puedeSupervisar)} onClick={() => onAccion("gestor")}>
          <UserSwitchIcon />
          {caso.sinGestor ? "Asignar gestor" : "Reasignar gestor"}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!(abierto && access.puedeSupervisar)} onClick={() => onAccion("tipo")}>
          <ArrowsDownUpIcon />
          Cambiar tipo
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!(abierto && access.puedeSupervisar)} onClick={() => onAccion("cerrar")}>
          <CheckCircleIcon />
          Cerrar
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!(abierto && access.puedeSupervisar)} onClick={() => onAccion("anular")}>
          <ProhibitIcon />
          Anular
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
