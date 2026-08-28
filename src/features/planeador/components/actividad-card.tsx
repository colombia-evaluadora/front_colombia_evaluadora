import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FileDownloadOutlinedIcon,
  PencilIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import {
  STATUS_ACCENT,
  STATUS_ICON,
  STATUS_RING,
} from "@/features/planeador/api/ui-mappings"
import type {
  Actividad,
  ExportFormat,
} from "@/features/planeador/api/types/actividad"
import { EXPORT_FORMAT_LABELS } from "@/features/planeador/api/types/actividad"

import { DialogDeleteActividad } from "@/features/planeador/components/dialogs/dialog-delete-actividad"

interface Accion {
  label: string
  Icon: React.ComponentType<{ className?: string }>
  /** Si está definido, este botón tiene handler propio y no se renderiza
   * `disabled`. Sirve para distinguir visualmente las acciones vivas de
   * las que siguen siendo read-only visual. */
  onClick?: () => void
}

interface ActividadCardProps {
  actividad: Actividad
  /** Cuando true, la card se renderiza con el fondo de seleccionada. */
  selected?: boolean
  /** Abre esta actividad en el panel de detalle (vista informativa). */
  onSelect?: () => void
  /** Navega a la pantalla de edición de la actividad. Se dispara desde el
   * lápiz (Editar) de la card. */
  onEdit?: () => void
  /** Exporta esta actividad en el formato elegido. Lo dispara el menú
   * "Descargar" de la card (PDF / Excel). El toast sale del mutation
   * que la página conecte — la card solo delega. */
  onExport?: (format: ExportFormat) => void
  /** Hook opcional: se ejecuta cuando termina OK el `DialogDeleteActividad`
   * (típicamente, limpiar la selección / cerrar el panel). */
  onDeleted?: () => void
}

const ACCIONES_BASE: readonly Omit<Accion, "onClick">[] = [
  { label: "Editar", Icon: PencilIcon },
  { label: "Descargar", Icon: FileDownloadOutlinedIcon },
] as const

/**
 * Card vertical del listado del Planeador. Click → abre el detalle en el
 * panel de la derecha de la misma pantalla.
 *
 * El status se lee por color en dos lugares: la barra vertical del borde
 * izquierdo y el círculo del ícono, que va en trazo (no relleno) para no
 * competir con el título. El avance de evaluación cierra la card con el
 * porcentaje en ese mismo color.
 *
 * Las acciones viven en una barra flotante sobre la esquina inferior derecha:
 * la columna es angosta y no hay ancho para ponerlas en línea sin aplastar el
 * título.
 *
 * Tres acciones viven en la card:
 * - **Editar**: navega a la pantalla de edición (`onEdit`).
 * - **Descargar**: popover con dos opciones (PDF / Excel) → `onExport(format)`.
 *   Mismo shape que el diálogo de export masivo del toolbar, pero sin
 *   diálogo — la card es angosta y un popover cabe mejor.
 * - **Eliminar**: dispara el `DialogDeleteActividad`, que es un `AlertDialog`
 *   con confirmación. El trigger del AlertDialog reemplaza al botón de la
 *   barra de acciones (mismo color/tamaño que los otros), así se ve parejo.
 *
 * "Marcar" (calificaciones) y "Aprobar" (aprobación bulk) viven en el
 * header del panel de detalle, no acá — la card solo abre el detalle.
 */
export function ActividadCard({
  actividad,
  selected = false,
  onSelect,
  onEdit,
  onExport,
  onDeleted,
}: ActividadCardProps) {
  const StatusIcon = STATUS_ICON[actividad.status]
  const accent = STATUS_ACCENT[actividad.status]

  // Sólo "Editar" se monta como botón plano — Descargar y Eliminar tienen
  // sus propios widgets (Popover y AlertDialog) que también renderean el
  // botón del trigger, así que se excluyen de este loop para no duplicar
  // el control visual.
  const acciones: Accion[] = ACCIONES_BASE.map((accion) =>
    accion.label === "Editar" && onEdit
      ? { ...accion, onClick: onEdit }
      : accion,
  )

  // Sin estudiantes asignados el porcentaje no significa nada: se omite en
  // vez de mostrar un 0% que se leería como "nadie evaluado".
  const porcentaje =
    actividad.totalEstudiantes > 0
      ? Math.round((actividad.evaluados / actividad.totalEstudiantes) * 100)
      : null

  return (
    <article
      className={cn(
        // `overflow-hidden` para que la barra de status se recorte contra el
        // radio de la card en vez de asomar en las esquinas.
        "group/actividad relative flex flex-col gap-1 overflow-hidden rounded-sm border bg-card py-3 pr-3 pl-4 transition-colors",
        // Seleccionada: soft primary —el mismo par fondo/borde que usa la
        // variante soft del design system— en vez del gris de hover.
        selected ? "border-primary bg-primary-22" : "hover:bg-muted-22",
      )}
    >
      {/* Barra de status del borde izquierdo. */}
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1", STATUS_RING[actividad.status])}
      />

      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
            accent,
          )}
        >
          <StatusIcon className="size-3.5" />
        </span>
        <h3 className="min-w-0 text-xs leading-snug font-bold break-words">
          {actividad.nombre}
        </h3>
      </div>

      <p className="text-muted-foreground text-[0.625rem] leading-snug">
        {actividad.asignatura} {actividad.grado} {actividad.grupo}
      </p>
      <p className="text-muted-foreground text-[0.625rem] leading-snug">
        {actividad.evaluados}/{actividad.totalEstudiantes} estudiantes evaluados
      </p>
      {porcentaje !== null && (
        <p className={cn("text-xs font-bold", accent)}>{porcentaje}%</p>
      )}

      {/* Acciones: barra flotante anclada ABAJO —arriba tapaba el título,
          que es lo primero que se lee—. Fondo con el mismo token sólido que
          la card en hover: uno con alfa se compondría dos veces al
          superponerse y se recortaría contra la card. */}
      <div
        className={cn(
          // `z-10` y no más: sólo tiene que quedar por encima del overlay
          // del link (`z-0`) de su propia card. Con `z-20` empataba con el
          // encabezado sticky de la pantalla y, al ir después en el DOM,
          // ganaba el desempate y la barra se dibujaba sobre el buscador.
          "absolute right-1 bottom-1 z-10 flex items-center gap-0 px-0.5 transition-opacity",
          // Los tokens `-22` llevan alfa (`--primary-22` ~8%, `--muted-22`
          // ~28%): superponerlos sobre una card que ya los tiene los
          // compondría dos veces y la barra se recortaría más oscura. Cada
          // `color-mix` es el equivalente opaco del fondo que le toca.
          selected
            ? "bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))]"
            : "bg-[color-mix(in_srgb,var(--muted)_28%,var(--card))]",
          "pointer-events-none opacity-0",
          "group-hover/actividad:pointer-events-auto group-hover/actividad:opacity-100",
          "group-focus-within/actividad:pointer-events-auto group-focus-within/actividad:opacity-100",
        )}
      >
        {acciones.map(({ label, Icon, onClick }) => (
          <Button
            key={label}
            variant="ghost"
            color="neutral"
            size="icon-sm"
            disabled={!onClick}
            aria-label={label}
            className="size-6"
            // `stopPropagation` para que el click del action no se propague
            // al `<button>` invisible que cubre toda la card y termine
            // disparando `onSelect` (selección de la actividad).
            onClick={(e) => {
              e.stopPropagation()
              onClick?.()
            }}
          >
            <Icon />
          </Button>
        ))}

        {/* Descargar: popover con PDF / Excel. Sólo se monta si la página
            le pasó `onExport` — sin handler el botón queda `disabled`, igual
            que en la versión anterior, así el "ver cómo se ve" sin wiring
            sigue funcionando. */}
        {onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={`Descargar ${actividad.nombre}`}
                  className="size-6"
                  onClick={(e) => e.stopPropagation()}
                />
              }
            >
              <FileDownloadOutlinedIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(EXPORT_FORMAT_LABELS) as ExportFormat[]).map((format) => (
                <DropdownMenuItem
                  key={format}
                  onClick={() => onExport(format)}
                >
                  {EXPORT_FORMAT_LABELS[format]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Eliminar: el `AlertDialog` del delete vive acá adentro. El
            trigger hereda el `variant/color/size` del resto de la barra
            (ghost/neutral/icon-sm) para que se vea parejo con Editar. */}
        <DialogDeleteActividad
          actividad={actividad}
          onDeleted={onDeleted}
          triggerProps={{ className: "size-6" }}
        />
      </div>

      {/* Botón invisible que cubre toda la card: el click entero abre el
          detalle en el panel de la derecha. `aria-pressed` porque es un
          toggle de selección, no un enlace a otro documento. */}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Ver detalle de ${actividad.nombre}`}
        className="focus-visible:outline-ring absolute inset-0 z-0 rounded-sm focus-visible:outline-2"
      />
    </article>
  )
}
