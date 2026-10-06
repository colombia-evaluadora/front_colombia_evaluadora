import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PlusIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import type { CategoriaCanal } from "@/features/comunicaciones/chat/api/types"
import { ICONO_CATEGORIA, TIPOS_CANAL } from "@/features/comunicaciones/chat/api/ui-mappings"
import { useCrearCanal } from "@/features/comunicaciones/chat/api/mutations/use-acciones-conversacion"
import { CrearEleccionDialog } from "@/features/comunicaciones/chat/components/crear-eleccion-dialog"

const ITEM =
  "gap-3 border-b py-2.5 text-sm font-normal tracking-normal normal-case last:border-b-0 [&_svg]:size-5!"

// "Agregar canales": elige el tipo y luego el nombre.
export function AgregarCanal({ onCreado }: { onCreado: (id: number) => void }) {
  const { notify } = useNotify()
  const [tipo, setTipo] = useState<CategoriaCanal | null>(null)
  const [nombre, setNombre] = useState("")
  const [eleccion, setEleccion] = useState(false)
  const crear = useCrearCanal()
  const actual = TIPOS_CANAL.find((t) => t.categoria === tipo)

  const cerrar = () => {
    if (crear.isPending) return
    setTipo(null)
    setNombre("")
    crear.reset()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-9 w-full items-center gap-3 rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none data-popup-open:bg-muted/50 data-popup-open:text-foreground">
          <span className="grid size-5 place-items-center rounded bg-muted/60">
            <PlusIcon className="size-3.5" aria-hidden />
          </span>
          Agregar canales
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-3 pt-2 pb-1.5 text-sm font-semibold tracking-normal text-foreground normal-case">
              Selecciona el tipo de canal:
            </DropdownMenuLabel>
            {TIPOS_CANAL.map((t) => {
              const Icono = ICONO_CATEGORIA[t.categoria]
              return (
                <DropdownMenuItem key={t.categoria} className={ITEM} onClick={() => (t.categoria === "VOTACION" ? setEleccion(true) : setTipo(t.categoria))}>
                  <Icono className="text-muted-foreground" />
                  {t.etiqueta}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <CrearEleccionDialog
        open={eleccion}
        onClose={() => setEleccion(false)}
        onCreada={onCreado}
      />

      <Dialog open={!!tipo} onOpenChange={(open) => !open && cerrar()}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const limpio = nombre.trim()
              if (!limpio || !tipo || crear.isPending) return
              crear.mutate(
                { nombre: limpio, categoria: tipo },
                {
                  onSuccess: (canal) => {
                    notify(`Se creó ${canal.nombre}.`)
                    cerrar()
                    onCreado(canal.id)
                  },
                },
              )
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>{actual?.titulo}</DialogTitle>
              <DialogDescription>
                Quedarás como administrador y podrás agregar miembros después.
              </DialogDescription>
            </DialogHeader>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Nombre del canal</span>
              <Input
                autoFocus
                value={nombre}
                maxLength={80}
                aria-invalid={crear.isError || undefined}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Por ejemplo, 04-ciencias-naturales"
              />
            </label>
            {crear.isError && (
              <p role="alert" className="text-sm text-red">
                {getErrorMessage(crear.error)}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="fill" color="neutral" onClick={cerrar} disabled={crear.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!nombre.trim() || crear.isPending} aria-busy={crear.isPending}>
                Crear canal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
