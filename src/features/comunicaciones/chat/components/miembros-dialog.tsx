import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PlusIcon, ProhibitIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { Conversacion, Miembro, Persona } from "@/features/comunicaciones/chat/api/types"
import { useMiembrosQuery } from "@/features/comunicaciones/chat/api/query/use-miembros-query"
import { usePersonasQuery } from "@/features/comunicaciones/chat/api/query/use-personas-query"
import {
  useAgregarMiembros,
  useBloquearMiembro,
  useEliminarMiembro,
} from "@/features/comunicaciones/chat/api/mutations/use-acciones-miembro"
import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"
import { iniciales } from "@/features/comunicaciones/chat/lib/chat-format"

const POR_PAGINA = 6

const ACCION =
  "grid size-8 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"

// Miembros del canal: el buscador añade personas; en la lista se bloquea (no puede escribir) o se elimina.
export function MiembrosDialog({
  conversacion: c,
  open,
  onClose,
}: {
  conversacion: Conversacion
  open: boolean
  onClose: () => void
}) {
  const [seleccion, setSeleccion] = useState<Persona[]>([])
  const [porEliminar, setPorEliminar] = useState<Miembro | null>(null)
  const [pagina, setPagina] = useState(0)
  const miembros = useMiembrosQuery(open ? c.id : undefined)
  const personas = usePersonasQuery(open)
  const agregar = useAgregarMiembros(c.id)
  const bloquear = useBloquearMiembro(c.id)
  const eliminar = useEliminarMiembro(c.id)
  const error = agregar.error ?? bloquear.error ?? eliminar.error

  const todos = miembros.data ?? []
  const lista = todos
  const enGrupo = new Set(todos.map((m) => m.id))
  // El buscador sugiere a todo el colegio e indica quién ya está en el canal.
  const sugerencias: Persona[] = [
    ...(personas.data ?? []),
    ...todos
      .filter((m) => !personas.data?.some((p) => p.id === m.id))
      .map((m) => ({ id: m.id, nombre: m.nombre, correo: "" })),
  ]
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const actual = Math.min(pagina, paginas - 1)
  const visibles = lista.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA)

  const cerrar = () => {
    setSeleccion([])
    setPagina(0)
    onClose()
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">Añadir personas a {c.nombre}</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute -top-2.5 left-3 z-10 bg-popover px-1 text-sm font-medium">
              Buscar
            </span>
            <SelectorChips
              items={sugerencias}
              value={seleccion}
              onChange={setSeleccion}
              getId={(p) => p.id}
              getLabel={(p) => p.nombre}
              filtrar={(p, t) => p.nombre.toLowerCase().includes(t) || p.correo.toLowerCase().includes(t)}
              cargando={personas.isPending}
              autoFocus
              ariaLabel="Buscar personas para añadir"
              placeholder="P. ej.: Natalia o pedro@iesimonbolivar.edu.co"
              vacio={null}
              soloConConsulta
              deshabilitado={(p) => enGrupo.has(p.id)}
              renderItem={(p) => (
                <span className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{p.nombre}</span>
                    {p.correo && <span className="block truncate text-xs text-muted-foreground">{p.correo}</span>}
                  </span>
                  {enGrupo.has(p.id) ? (
                    <span className="shrink-0 rounded-full bg-green-22 px-2 py-0.5 text-xs text-green">En el grupo</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">No está en el grupo</span>
                  )}
                </span>
              )}
            />
          </div>
          {seleccion.length > 0 && (
          <Button
            type="button"
            size="icon"
            aria-label="Añadir al canal"
            title="Añadir al canal"
            disabled={agregar.isPending}
            aria-busy={agregar.isPending}
            onClick={() => agregar.mutate(seleccion.map((p) => p.id), { onSuccess: () => setSeleccion([]) })}
            className="size-11 shrink-0"
          >
            <PlusIcon className="size-6" />
          </Button>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-red">
            {getErrorMessage(error)}
          </p>
        )}

        <div className="rounded-lg border">
          {miembros.isPending ? (
            <div className="space-y-2 p-3" aria-busy>
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : miembros.isError ? (
            <p className="p-4 text-sm text-muted-foreground">
              No se pudieron cargar los miembros.{" "}
              <button type="button" onClick={() => void miembros.refetch()} className="font-medium text-primary underline">
                Reintentar
              </button>
            </p>
          ) : (
            <>
              <ul className="divide-y">
                {visibles.map((m) => (
                  <FilaMiembro
                    key={m.id}
                    miembro={m}
                    ocupado={bloquear.isPending || eliminar.isPending}
                    onBloquear={() => bloquear.mutate({ id: m.id, bloqueado: !m.bloqueado })}
                    onEliminar={() => setPorEliminar(m)}
                  />
                ))}
              </ul>
              {lista.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">Aún no hay nadie en el canal.</p>
              )}
              {paginas > 1 && (
                <nav aria-label="Páginas de miembros" className="flex items-center justify-center gap-2 border-t p-3 text-sm">
                  <button
                    type="button"
                    disabled={actual === 0}
                    onClick={() => setPagina(actual - 1)}
                    className="px-2 py-1 disabled:text-muted-foreground"
                  >
                    Previo
                  </button>
                  {Array.from({ length: paginas }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-current={i === actual ? "page" : undefined}
                      onClick={() => setPagina(i)}
                      className={cn(
                        "grid size-8 place-items-center rounded-md tabular-nums",
                        i === actual ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted",
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={actual === paginas - 1}
                    onClick={() => setPagina(actual + 1)}
                    className="px-2 py-1 disabled:text-muted-foreground"
                  >
                    Próximo
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>

      <AlertDialog open={!!porEliminar} onOpenChange={(o) => !o && !eliminar.isPending && setPorEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {porEliminar?.nombre} del canal?</AlertDialogTitle>
            <AlertDialogDescription>
              Dejará de ver los mensajes de {c.nombre}. Puedes volver a añadirla desde el buscador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="fill" color="neutral" disabled={eliminar.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              color="destructive"
              disabled={eliminar.isPending}
              aria-busy={eliminar.isPending}
              onClick={() => porEliminar && eliminar.mutate(porEliminar.id, { onSuccess: () => setPorEliminar(null) })}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function FilaMiembro({
  miembro: m,
  ocupado,
  onBloquear,
  onEliminar,
}: {
  miembro: Miembro
  ocupado: boolean
  onBloquear: () => void
  onEliminar: () => void
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <span className={cn("flex min-w-0 flex-1 items-center gap-3", m.bloqueado && "opacity-45")}>
        <AvatarPersona nombre={m.nombre} enLinea={m.enLinea} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate">{m.nombre}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {m.rol}
            {m.bloqueado && " · No puede escribir"}
          </span>
        </span>
      </span>
      <button
        type="button"
        onClick={onBloquear}
        disabled={ocupado}
        aria-pressed={m.bloqueado}
        aria-label={m.bloqueado ? `Permitir escribir a ${m.nombre}` : `Bloquear a ${m.nombre}`}
        title={m.bloqueado ? "Permitir escribir" : "Bloquear: no podrá escribir"}
        className={cn(
          ACCION,
          m.bloqueado ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <ProhibitIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={onEliminar}
        disabled={ocupado}
        aria-label={`Eliminar a ${m.nombre} del canal`}
        title="Eliminar del canal"
        className={cn(ACCION, "bg-muted/60 text-muted-foreground hover:bg-red-22 hover:text-red")}
      >
        <XIcon className="size-4" />
      </button>
    </li>
  )
}

function AvatarPersona({ nombre, enLinea }: { nombre: string; enLinea?: boolean }) {
  return (
    <Avatar>
      <AvatarFallback className="bg-navy-22 text-[0.65rem] font-semibold text-navy">
        {iniciales(nombre)}
      </AvatarFallback>
      {enLinea && <AvatarBadge className="bg-green" />}
    </Avatar>
  )
}
