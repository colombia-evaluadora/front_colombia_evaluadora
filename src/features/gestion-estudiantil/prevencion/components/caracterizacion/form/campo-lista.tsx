import type { OpcionCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"

interface Props {
  id: string
  label: string
  opciones: OpcionCatalogo[] | undefined
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
  disabled?: boolean
  /** Layout de la celda del grid (p. ej. ancho doble para una etiqueta larga). */
  className?: string
}

/**
 * Combo de una lista de la caracterización. Las opciones salen de `/opciones/caracterizacion` (etiqueta, nunca código).
 * Una lista aún por definir (sin opciones) no bloquea el formulario: el combo queda inactivo y lo dice.
 */
export function CampoLista({ id, label, opciones, value, onChange, required, error, disabled, className }: Props) {
  const vacia = (opciones?.length ?? 0) === 0
  return (
    <ComboOpciones
      id={id}
      label={label}
      required={required}
      size="default"
      // Obligatorio: sin «vacío» (no hay predeterminado y se elige explícitamente); opcional: se puede dejar sin responder.
      todos={required ? false : "Sin responder"}
      placeholder={vacia ? "Opciones por definir" : "Seleccione"}
      disabled={disabled || vacia}
      value={value}
      options={opciones ?? []}
      error={error}
      className={className}
      onChange={onChange}
    />
  )
}
