/** Cuántas acciones caben como iconos en el hover de la fila; de ahí en adelante van al ⋮. */
export const MAX_ACCIONES_VISIBLES = 6

// Botón `icon-sm` (40px) + `gap-1` (4px) + `px-2` del overlay de DataTable (16px).
const BOTON = 40
const GAP = 4
const PADDING = 16

/**
 * Ancho de la columna `actions` para `n` acciones: con 6 o menos, un icono por acción; con más, 6 iconos
 * y el ⋮. DataTable reserva ese ancho en la columna de respiro para que el overlay no tape datos.
 */
export function anchoAccionesFila(n: number): number {
  const huecos = n <= MAX_ACCIONES_VISIBLES ? Math.max(n, 1) : MAX_ACCIONES_VISIBLES + 1
  return huecos * BOTON + (huecos - 1) * GAP + PADDING
}
