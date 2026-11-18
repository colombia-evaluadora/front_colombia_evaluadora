import { Button } from "@/components/ui/button"
import { TrashIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface Props {
  /** Lo que hace el botón, p. ej. «Quitar a Luis Pérez»: va en el tooltip y para lectores de pantalla. */
  label: string
  onClick: () => void
  className?: string
  disabled?: boolean
}

/**
 * Quitar una fila de un constructor repetible (estudiantes, involucrados, cargos,
 * pruebas…): el ícono de eliminar del proyecto, en rojo y con su tooltip, igual
 * que las acciones de las tablas.
 */
export function BotonQuitar({ label, onClick, className, disabled }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color="destructive"
            size="icon-sm"
            aria-label={label}
            className={className}
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        <TrashIcon />
      </TooltipTrigger>
      {/* El tooltip dice qué se quita (p. ej. «Quitar a Luis Pérez», «Retirar acta.pdf»). */}
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
