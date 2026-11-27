import { Badge } from "@/components/ui/badge"

/**
 * Marca «N pendientes» junto al título de una sección de formulario de crear/agregar (CLAUDE.md §13), como en
 * Matrícula › Agregar estudiante: pastilla naranja con punto. Cuenta los campos obligatorios todavía vacíos
 * de la sección; en 0 no se muestra.
 */
export function MarcaPendientes({ pendientes }: { pendientes: number }) {
  if (pendientes <= 0) return null
  return (
    <Badge variant="outline" color="orange" className="rounded-full bg-orange-22 text-xs font-medium tracking-normal">
      <span aria-hidden className="size-1.5 rounded-full bg-orange" />
      {pendientes === 1 ? "1 pendiente" : `${pendientes} pendientes`}
    </Badge>
  )
}
