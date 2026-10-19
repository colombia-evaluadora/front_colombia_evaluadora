import { cn } from "@/lib/utils"

/*
 * Columna de acciones de las tablas armadas a mano, con el diseño de `DataTable`.
 * La celda es sticky y de 1px (los botones son absolutos); el `spacer` que va
 * justo antes le reserva el ancho.
 */
export const ACTIONS_CELL_CLASS = "sticky right-0 z-10 w-px"

const ACTIONS_SPACER_WIDTH = 96

export const actionsSpacerCell = (
  <td aria-hidden className="p-0">
    <div style={{ width: ACTIONS_SPACER_WIDTH }} />
  </td>
)

export const actionsSpacerHeadCell = (
  <th aria-hidden className="p-0">
    <div style={{ width: ACTIONS_SPACER_WIDTH }} />
  </th>
)

/**
 * Bloque de botones contra el borde derecho; aparece con el hover de la fila
 * (que lleva `group/row`). El fondo es opaco porque tapa las columnas al hacer
 * scroll, mezclado con la superficie donde vive la tabla: el Dialog
 * (`popover`) o un panel de pestaña (`background`).
 *
 * `active` lo deja fijo (fila en edición). Con teclado se revela por
 * `:focus-visible` y no `focus-within`, que lo dejaba pegado tras un click.
 */
export const actionsOverlayClass = (active = false, surface: "popover" | "background" = "popover") =>
  cn(
    "absolute inset-y-0 right-0 z-10 flex items-center gap-1 px-2 transition-opacity",
    surface === "popover"
      ? "bg-[color-mix(in_srgb,var(--muted)_28%,var(--popover))]"
      : "bg-[color-mix(in_srgb,var(--muted)_28%,var(--background))]",
    active
      ? "opacity-100"
      : "opacity-0 group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100",
  )
