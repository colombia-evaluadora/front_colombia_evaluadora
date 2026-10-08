import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { HashIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { iniciales } from "@/features/comunicaciones/chat/lib/chat-format"
import type { Persona } from "@/features/comunicaciones/chat/api/types"
import { useCrearCanal } from "@/features/comunicaciones/chat/api/mutations/use-acciones-conversacion"
import { usePersonasQuery } from "@/features/comunicaciones/chat/api/query/use-personas-query"
import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"

const AYUDA =
  "Los canales son el lugar donde se producen las conversaciones sobre un tema. Usa un nombre que sea fácil de encontrar y comprender."

// Nombres estilo canal: minúsculas y guiones en lugar de espacios.
const aNombreCanal = (v: string) => v.toLowerCase().replace(/\s+/g, "-").replace(/^#/, "")

// Crear un chat: primero el nombre y luego, opcional, las personas.
export function CrearChatDialog({
  open,
  onClose,
  onCreado,
}: {
  open: boolean
  onClose: () => void
  onCreado: (id: number) => void
}) {
  const { notify } = useNotify()
  const [paso, setPaso] = useState<1 | 2>(1)
  const [nombre, setNombre] = useState("")
  const [miembros, setMiembros] = useState<Persona[]>([])
  const crear = useCrearCanal()
  const personas = usePersonasQuery(open && paso === 2)
  const limpio = nombre.trim().replace(/-+$/, "")

  const cerrar = () => {
    if (crear.isPending) return
    setPaso(1)
    setNombre("")
    setMiembros([])
    crear.reset()
    onClose()
  }

  const crearChat = (conMiembros: Persona[]) =>
    crear.mutate(
      { nombre: limpio, categoria: "GENERAL", miembros: conMiembros.map((p) => p.id) },
      {
        onSuccess: (canal) => {
          notify(`Se creó #${canal.nombre}.`)
          cerrar()
          onCreado(canal.id)
        },
      },
    )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">
            {paso === 1 ? "Crear un Foro" : `Añadir personas a ${limpio}`}
          </DialogTitle>
        </DialogHeader>

        {paso === 1 ? (
          <form
            id="crear-chat"
            onSubmit={(e) => {
              e.preventDefault()
              if (limpio) setPaso(2)
            }}
            className="space-y-1.5"
          >
            <label className="relative flex items-center gap-3 rounded-lg border px-4 pt-3.5 pb-2.5 focus-within:border-primary">
              <span className="absolute -top-2.5 left-3 bg-popover px-1 text-sm font-medium">
                Nombre
              </span>
              <HashIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={nombre}
                maxLength={80}
                onChange={(e) => setNombre(aNombreCanal(e.target.value))}
                placeholder="Por ejemplo, planificacion-presupuesto"
                aria-describedby="crear-chat-ayuda"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <p id="crear-chat-ayuda" className="text-xs text-muted-foreground">
              {AYUDA}
            </p>
          </form>
        ) : (
          <div className="space-y-1.5">
            <SelectorPersonas
              personas={personas.data ?? []}
              cargando={personas.isPending}
              value={miembros}
              onChange={setMiembros}
            />
            <p className="text-xs text-muted-foreground">
              Las personas que añadas verán el historial del canal y podrán escribir en él.
            </p>
          </div>
        )}

        {crear.isError && (
          <p role="alert" className="text-sm text-red">
            {getErrorMessage(crear.error)}
          </p>
        )}

        <DialogFooter>
          {paso === 1 ? (
            <Button type="submit" form="crear-chat" disabled={!limpio}>
              Siguiente
            </Button>
          ) : miembros.length === 0 ? (
            <Button
              type="button"
              color="neutral"
              onClick={() => crearChat([])}
              disabled={crear.isPending}
              aria-busy={crear.isPending}
            >
              Omitir
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => crearChat(miembros)}
              disabled={crear.isPending}
              aria-busy={crear.isPending}
            >
              Agregar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SelectorPersonas({
  personas,
  cargando,
  value,
  onChange,
}: {
  personas: Persona[]
  cargando: boolean
  value: Persona[]
  onChange: (v: Persona[]) => void
}) {
  return (
    <SelectorChips
      items={personas}
      value={value}
      onChange={onChange}
      getId={(p) => p.id}
      getLabel={(p) => p.nombre}
      filtrar={(p, t) => p.nombre.toLowerCase().includes(t) || p.correo.toLowerCase().includes(t)}
      cargando={cargando}
      autoFocus
      ariaLabel="Buscar personas"
      placeholder="P. ej.: Natalia o pedro@iesimonbolivar.edu.co"
      vacio="Nadie coincide con la búsqueda."
      renderItem={(p) => (
        <span className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback className="bg-navy-22 text-[0.65rem] font-semibold text-navy">
              {iniciales(p.nombre)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate font-medium">{p.nombre}</span>
            <span className="block truncate text-xs text-muted-foreground">{p.correo}</span>
          </span>
        </span>
      )}
    />
  )
}
