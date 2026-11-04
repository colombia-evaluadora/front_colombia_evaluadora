import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DotsThreeVerticalIcon, EyeIcon, PencilIcon } from "@/components/ui/icons"

export type AccionSesion = "ver" | "modificar"

interface Props {
  numero: string | number
  /** Sin permiso de escribir el Comité, Modificar no se ofrece: queda la consulta. */
  puedeModificar: boolean
  onAccion: (accion: AccionSesion) => void
}

/** Menú ⋮ de una sesión (G.2.COM.SES.2): Ver detalle y Modificar. */
export function MenuAccionesSesion({ numero, puedeModificar, onAccion }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones de la sesión ${numero}`} />}
      >
        <DotsThreeVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 *:whitespace-nowrap">
        <DropdownMenuItem onClick={() => onAccion("ver")}>
          <EyeIcon />
          Ver detalle
        </DropdownMenuItem>
        {puedeModificar && (
          <DropdownMenuItem onClick={() => onAccion("modificar")}>
            <PencilIcon />
            Modificar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
