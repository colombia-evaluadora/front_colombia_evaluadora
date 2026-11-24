import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, ControlPointIcon, DotsThreeVerticalIcon, InfoIcon, PencilIcon, ProhibitIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import {
  useDeleteIcono,
  useEstadoIcono,
  useOrdenarIconos,
} from "@/features/administration/listas-valor/api/mutations/iconos"
import { useIconosQuery } from "@/features/administration/listas-valor/api/query/use-iconos-query"
import type { Icono } from "@/features/administration/listas-valor/api/types/icono"
import { DialogSaveIcono } from "@/features/administration/listas-valor/components/dialog-save-icono"
import { IconoGuardado } from "@/features/administration/listas-valor/components/icono-imagen"

const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

interface IconografiaPanelProps {
  puedeEditar: boolean
  puedeEliminar: boolean
  puedeCrear: boolean
}

/** Pestaña Iconografía: cuadrícula de íconos con menú ⁞ (Administración §2.3). */
export function IconografiaPanel({
  puedeEditar,
  puedeEliminar,
  puedeCrear,
}: IconografiaPanelProps) {
  const { notify } = useNotify()
  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [editando, setEditando] = useState<Icono | null>(null)
  const [eliminando, setEliminando] = useState<Icono | null>(null)
  const { data: iconos = [], isPending, isError, error } = useIconosQuery()
  const estado = useEstadoIcono()
  const eliminar = useDeleteIcono()
  const ordenar = useOrdenarIconos()
  const [arrastrado, setArrastrado] = useState<number | null>(null)

  const filtrados = iconos.filter((i) => normalizar(i.nombre).includes(normalizar(busqueda)))
  // Con búsqueda la fila no es la lista completa: no se reordena.
  const ordenable = puedeEditar && !busqueda && iconos.length > 1

  function mover(pk: number, destino: number) {
    const desde = iconos.findIndex((i) => i.pkIcono === pk)
    if (desde < 0 || destino < 0 || destino >= iconos.length || desde === destino) return
    const lista = iconos.map((i) => i.pkIcono)
    lista.splice(destino, 0, ...lista.splice(desde, 1))
    ordenar.mutate(
      { orden: lista },
      {
        onSuccess: () => notify("El orden de los íconos se actualizó."),
        onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
      },
    )
  }

  async function cambiarEstado(icono: Icono) {
    try {
      await estado.mutateAsync({ id: icono.pkIcono, habilitado: !icono.habilitado })
      notify(icono.habilitado ? "Ícono inactivado." : "Ícono activado.")
    } catch (e) {
      notify(getErrorMessage(e), { variant: "error" })
    }
  }

  async function confirmarEliminar() {
    if (!eliminando) return
    try {
      await eliminar.mutateAsync({ id: eliminando.pkIcono })
      notify("Ícono eliminado.")
    } catch (e) {
      notify(getErrorMessage(e), { variant: "error" })
    } finally {
      setEliminando(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Como en las demás vistas: buscador a la izquierda y la acción principal a la derecha, en la misma línea. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SearchQueryBar
          id="iconos-search"
          placeholder="Buscar ícono"
          value={busqueda}
          onValueChange={setBusqueda}
          onClearAll={() => setBusqueda("")}
          activeFilterCount={busqueda ? 1 : 0}
        />
        {puedeCrear && (
          <Button size="sm" color="primary" onClick={() => setNuevoAbierto(true)}>
            <ControlPointIcon data-icon="inline-start" />
            Nuevo ícono
          </Button>
        )}
      </div>

      {isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No se pudo cargar la iconografía</EmptyTitle>
            <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : isPending ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[5.5rem]" />
          ))}
        </ul>
      ) : filtrados.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">
          {iconos.length === 0
            ? "Aún no hay íconos. Use «Nuevo ícono» para cargar el primero."
            : "Ningún ícono coincide con la búsqueda."}
        </p>
      ) : (
        <>
        {ordenable && (
          <p className="text-xs text-muted-foreground">
            Arrastre un ícono para cambiar el orden en que se muestra.
          </p>
        )}
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-3">
          {filtrados.map((icono, posicion) => (
            <li
              key={icono.pkIcono}
              draggable={ordenable}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move"
                setArrastrado(icono.pkIcono)
              }}
              onDragOver={(e) => {
                if (arrastrado != null) e.preventDefault()
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (arrastrado != null) mover(arrastrado, posicion)
                setArrastrado(null)
              }}
              onDragEnd={() => setArrastrado(null)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-2 pt-4 pb-3",
                !icono.habilitado && "border-border/60",
                ordenable && "cursor-grab active:cursor-grabbing",
                arrastrado === icono.pkIcono && "opacity-40",
              )}
            >
              {(puedeEditar || puedeEliminar) && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        color="neutral"
                        size="icon-sm"
                        className="absolute top-1 right-1"
                        aria-label={`Acciones de ${icono.nombre}`}
                      />
                    }
                  >
                    <DotsThreeVerticalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {puedeEditar && (
                      <DropdownMenuItem onClick={() => setEditando(icono)}>
                        <PencilIcon />
                        Modificar
                      </DropdownMenuItem>
                    )}
                    {puedeEditar && (
                      <DropdownMenuItem onClick={() => void cambiarEstado(icono)}>
                        {icono.habilitado ? <ProhibitIcon /> : <CheckCircleIcon />}
                        {icono.habilitado ? "Inactivar" : "Activar"}
                      </DropdownMenuItem>
                    )}
                    {ordenable && (
                      <>
                        <DropdownMenuItem
                          disabled={posicion === 0}
                          onClick={() => mover(icono.pkIcono, posicion - 1)}
                        >
                          <ArrowLeftIcon />
                          Mover antes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={posicion === filtrados.length - 1}
                          onClick={() => mover(icono.pkIcono, posicion + 1)}
                        >
                          <ArrowRightIcon />
                          Mover después
                        </DropdownMenuItem>
                      </>
                    )}
                    {puedeEliminar && (
                      <>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={icono.enUso}
                          onClick={() => setEliminando(icono)}
                        >
                          <TrashIcon />
                          Eliminar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <p className="flex gap-1.5 px-2 py-1.5 text-xs text-muted-foreground">
                          <InfoIcon aria-hidden className="mt-px size-3.5 shrink-0" />
                          {icono.enUso
                            ? "Una valoración usa el ícono: inactívelo en lugar de eliminarlo."
                            : "Eliminar solo si ninguna valoración usa el ícono."}
                        </p>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {/* Inactivo: la tarjeta al 55%; el menú ⁞ queda al 100%. */}
              <div className={cn("flex w-full flex-col items-center gap-2", !icono.habilitado && "opacity-55")}>
                <IconoGuardado icono={icono} className="size-7 text-foreground" />
                <span className="max-w-full truncate text-sm">{icono.nombre}</span>
                <Badge variant="soft" color={icono.habilitado ? "success" : "neutral"}>
                  {icono.habilitado ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
        </>
      )}

      {/* Una instancia por apertura: el estado del formulario arranca limpio. */}
      {nuevoAbierto && <DialogSaveIcono open onOpenChange={setNuevoAbierto} />}
      {editando && (
        <DialogSaveIcono
          key={editando.pkIcono}
          open
          icono={editando}
          onOpenChange={(open) => !open && setEditando(null)}
        />
      )}

      <AlertDialog open={eliminando != null} onOpenChange={(open) => !open && setEliminando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ícono</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el ícono «{eliminando?.nombre}»? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" color="neutral"><XIcon data-icon="inline-start" />Cancelar</AlertDialogCancel>
            <AlertDialogAction
              color="destructive"
              disabled={eliminar.isPending}
              onClick={() => void confirmarEliminar()}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
