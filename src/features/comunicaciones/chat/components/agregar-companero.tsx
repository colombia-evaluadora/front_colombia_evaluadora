import { useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PlusIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import { usePersonasQuery } from "@/features/comunicaciones/chat/api/query/use-personas-query"
import { useAbrirDirecto } from "@/features/comunicaciones/chat/api/mutations/use-acciones-miembro"
import { iniciales } from "@/features/comunicaciones/chat/lib/chat-format"

// "+" junto a "Mensajes directos": elegir a un compañero abre (o crea) el chat con él.
export function AgregarCompanero({ onCreado }: { onCreado: (id: number) => void }) {
  const [open, setOpen] = useState(false)
  const [texto, setTexto] = useState("")
  const personas = usePersonasQuery(open)
  const abrir = useAbrirDirecto()

  const t = texto.trim().toLowerCase()
  const lista = (personas.data ?? []).filter(
    (p) => !t || p.nombre.toLowerCase().includes(t) || p.correo.toLowerCase().includes(t),
  )

  const cerrar = () => {
    if (abrir.isPending) return
    setOpen(false)
    setTexto("")
    abrir.reset()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Agregar compañero"
        title="Agregar compañero"
        className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <PlusIcon className="size-5" />
      </button>

      <Dialog open={open} onOpenChange={(o) => !o && cerrar()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo mensaje directo</DialogTitle>
          </DialogHeader>

          <label className="relative block rounded-lg border px-4 pt-3.5 pb-2.5 focus-within:border-primary">
            <span className="absolute -top-2.5 left-3 bg-popover px-1 text-sm font-medium">Para</span>
            <input
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="P. ej.: Natalia o pedro@iesimonbolivar.edu.co"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>

          {abrir.isError && (
            <p role="alert" className="text-sm text-red">
              {getErrorMessage(abrir.error)}
            </p>
          )}

          <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border">
            {personas.isPending ? (
              Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="p-2">
                  <Skeleton className="h-10 w-full" />
                </li>
              ))
            ) : lista.length === 0 ? (
              <li className="p-4 text-center text-sm text-muted-foreground">Nadie coincide con la búsqueda.</li>
            ) : (
              lista.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={abrir.isPending}
                    onClick={() =>
                      abrir.mutate(p.id, {
                        onSuccess: (directo) => {
                          cerrar()
                          setOpen(false)
                          onCreado(directo.id)
                        },
                      })
                    }
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none disabled:opacity-60"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-navy-22 text-[0.65rem] font-semibold text-navy">
                        {iniciales(p.nombre)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate">{p.nombre}</span>
                      <span className="block truncate text-sm text-muted-foreground">{p.correo}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
