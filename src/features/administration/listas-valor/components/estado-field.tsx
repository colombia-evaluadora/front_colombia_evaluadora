import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface EstadoFieldProps {
  id: string
  /** "valor" o "lista": cambia el texto, no el comportamiento. */
  de: "valor" | "lista"
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Por qué no se puede cambiar (p. ej. valor del sistema). Reemplaza la explicación. */
  bloqueo?: string
  className?: string
}

/**
 * Activo/inactivo dentro de los diálogos de edición. Inactivar no borra nada: solo
 * lo saca de los selectores; los registros que ya lo usan lo conservan (V101).
 */
export function EstadoField({
  id,
  de,
  checked,
  onChange,
  disabled,
  bloqueo,
  className,
}: EstadoFieldProps) {
  const titulo =
    de === "valor"
      ? checked
        ? "Valor activo"
        : "Valor inactivo"
      : checked
        ? "Lista activa"
        : "Lista inactiva"
  const explicacion =
    de === "valor"
      ? checked
        ? "Aparece como opción en los formularios. Si lo inactivas, deja de aparecer, pero los registros que ya lo tienen lo conservan."
        : "No aparece como opción en los formularios. Los registros que ya lo tienen lo conservan."
      : checked
        ? "Sus valores aparecen como opción en los formularios. Si la inactivas, dejan de aparecer, pero los registros que ya los tienen los conservan."
        : "Sus valores no aparecen como opción en los formularios. Los registros que ya los tienen los conservan."

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-3 rounded-md border px-3 py-2.5",
        checked ? "border-border" : "border-dashed border-border bg-muted/40",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      <Switch
        id={id}
        size="sm"
        round
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        // El label también alterna el switch: se ignora si está bloqueado.
        onCheckedChange={(next) => !disabled && onChange(next)}
      />
      <span className="flex flex-col gap-0.5 text-sm">
        <span className={cn("font-medium", !checked && "text-muted-foreground")}>{titulo}</span>
        <span className="text-xs text-muted-foreground">{bloqueo ?? explicacion}</span>
      </span>
    </label>
  )
}
