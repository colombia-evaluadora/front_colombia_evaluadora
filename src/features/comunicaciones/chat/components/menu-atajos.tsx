import type { ComponentType, SVGProps } from "react"

import { ClockIcon, FileIcon, LightningIcon, MegaphoneIcon } from "@/components/ui/icons"
import { ICONO_CATEGORIA } from "@/features/comunicaciones/chat/api/ui-mappings"
import type { AtajoComposer, IdAtajo } from "@/features/comunicaciones/chat/lib/atajos-composer"
import { cn } from "@/lib/utils"

const ICONO: Record<IdAtajo, ComponentType<SVGProps<SVGSVGElement>>> = {
  encuesta: ICONO_CATEGORIA.ENCUESTA,
  votacion: LightningIcon,
  eleccion: ICONO_CATEGORIA.VOTACION,
  comunicado: MegaphoneIcon,
  adjuntar: FileIcon,
  programar: ClockIcon,
}

/**
 * Lista de atajos "/" sobre el compositor. El foco se queda en el editor (combobox): las flechas,
 * Enter/Tab y Escape los maneja el compositor; aquí solo el ratón.
 */
export function MenuAtajos({
  id,
  atajos,
  activo,
  onActivar,
  onElegir,
  sinTexto,
}: {
  id: string
  atajos: AtajoComposer[]
  activo: number
  onActivar: (i: number) => void
  onElegir: (a: AtajoComposer) => void
  // Sin mensaje escrito, "Programar envío" pide el texto en su diálogo.
  sinTexto: boolean
}) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Atajos"
      className="absolute inset-x-3 bottom-full z-20 mb-1 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md md:inset-x-4 md:right-auto md:w-80"
    >
      <li role="presentation" className="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
        Atajos
      </li>
      {atajos.map((a, i) => {
        const Icono = ICONO[a.id]
        return (
          <li
            key={a.id}
            id={`${id}-${i}`}
            role="option"
            aria-selected={i === activo}
            // mousedown: elegir antes de que el editor pierda el foco.
            onMouseDown={(e) => {
              e.preventDefault()
              onElegir(a)
            }}
            onMouseEnter={() => onActivar(i)}
            className={cn("flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm aria-selected:bg-muted")}
          >
            <Icono aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{a.etiqueta}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {a.id === "programar" && sinTexto ? "Escribe el mensaje y elige la hora" : a.descripcion}
              </span>
            </span>
            <span aria-hidden className="shrink-0 font-mono text-xs text-muted-foreground">
              /{a.comando}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
