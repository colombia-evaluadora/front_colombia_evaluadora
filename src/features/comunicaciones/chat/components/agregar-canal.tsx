import { useState } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PlusIcon } from "@/components/ui/icons"
import type { CategoriaCanal } from "@/features/comunicaciones/chat/api/types"
import { ICONO_CATEGORIA, TIPOS_CANAL } from "@/features/comunicaciones/chat/api/ui-mappings"
import { CrearChatDialog } from "@/features/comunicaciones/chat/components/crear-chat-dialog"
import { CrearComunicadoDialog } from "@/features/comunicaciones/chat/components/crear-comunicado-dialog"
import { CrearEleccionDialog } from "@/features/comunicaciones/chat/components/crear-eleccion-dialog"
import { CrearEncuestaDialog } from "@/features/comunicaciones/chat/components/crear-encuesta-dialog"
import { CrearEvaluacionDialog } from "@/features/comunicaciones/chat/components/crear-evaluacion-dialog"

const ITEM =
  "gap-3 border-b py-2.5 text-sm font-normal tracking-normal normal-case last:border-b-0 [&_svg]:size-5!"

// "Agregar canales": cada tipo de canal abre su propio asistente.
// `icono`: "+" junto al título de Canales; `fila`: el acceso al final de la lista.
export function AgregarCanal({
  onCreado,
  variante = "fila",
}: {
  onCreado: (id: number) => void
  variante?: "fila" | "icono"
}) {
  const [abierto, setAbierto] = useState<CategoriaCanal | null>(null)
  const cerrar = () => setAbierto(null)

  return (
    <>
      <DropdownMenu>
        {variante === "icono" ? (
          <DropdownMenuTrigger
            aria-label="Agregar canal"
            title="Agregar canal"
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none data-popup-open:bg-muted/50 data-popup-open:text-foreground"
          >
            <PlusIcon className="size-5" />
          </DropdownMenuTrigger>
        ) : (
          <DropdownMenuTrigger className="flex h-9 w-full items-center gap-3 rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none data-popup-open:bg-muted/50 data-popup-open:text-foreground">
            <span className="grid size-5 place-items-center rounded bg-muted/60">
              <PlusIcon className="size-3.5" aria-hidden />
            </span>
            Agregar canales
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent side="right" align="start" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-3 pt-2 pb-1.5 text-sm font-semibold tracking-normal text-foreground normal-case">
              Selecciona el tipo de canal:
            </DropdownMenuLabel>
            {TIPOS_CANAL.map((t) => {
              const Icono = ICONO_CATEGORIA[t.categoria]
              return (
                <DropdownMenuItem key={t.categoria} className={ITEM} onClick={() => setAbierto(t.categoria)}>
                  <Icono className="text-muted-foreground" />
                  {t.etiqueta}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <CrearChatDialog open={abierto === "GENERAL"} onClose={cerrar} onCreado={onCreado} />
      <CrearEleccionDialog open={abierto === "VOTACION"} onClose={cerrar} onCreada={onCreado} />
      <CrearEncuestaDialog open={abierto === "ENCUESTA"} onClose={cerrar} onCreada={onCreado} />
      <CrearEvaluacionDialog open={abierto === "EXAMEN"} onClose={cerrar} onCreada={onCreado} />
      <CrearComunicadoDialog open={abierto === "ANUNCIO"} onClose={cerrar} onCreado={onCreado} />
    </>
  )
}
