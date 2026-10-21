"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DotsSixVerticalIcon,
  LockIcon,
  StarFillIcon,
  StarIcon,
  TrashIcon,
} from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type {
  Categoria,
  ListaValor,
} from "@/features/administration/listas-valor/api/types/lista-valor"
import { DialogSaveValor } from "@/features/administration/listas-valor/components/dialog-save-valor"

interface CreateColumnsOptions {
  categoria: Categoria
  puedeEditar: boolean
  puedeEliminar: boolean
  /** Devuelve false si falló, para dejar abierta la confirmación. */
  onEliminar: (valor: ListaValor) => Promise<boolean>
  /** pk del valor cuya acción (estado o predeterminado) está en curso. */
  pendiente: number | null
  onIrALista: (categoria: string) => void
  /** true = marcar, false = quitar (la lista queda sin predeterminado). */
  onPredeterminado: (valor: ListaValor, predeterminado: boolean) => void
  /** Se arrastra solo sin búsqueda ni otro orden: así la tabla es la lista real. */
  ordenable: boolean
  /** Posición del primer valor de la página, para numerar mientras se arrastra. */
  offset: number
  /** Handlers de puntero del asa (useArrastrarFilas). */
  asa: Pick<
    React.HTMLAttributes<HTMLElement>,
    "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel"
  >
  onMover: (valor: ListaValor, delta: number) => void
  onSoltar: () => void
}

export function createValoresColumns({
  categoria,
  puedeEditar,
  puedeEliminar,
  onEliminar,
  pendiente,
  onIrALista,
  onPredeterminado,
  ordenable,
  offset,
  asa,
  onMover,
  onSoltar,
}: CreateColumnsOptions): ColumnDef<ListaValor>[] {
  const columns: ColumnDef<ListaValor>[] = [
    {
      id: "orden",
      accessorKey: "orden",
      meta: { label: "Orden" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
      cell: ({ row }) => {
        const v = row.original
        if (!ordenable)
          return <span className="pl-7 text-muted-foreground tabular-nums">{v.orden}</span>
        const posicion = offset + row.index + 1
        return (
          <span className="flex items-center gap-1">
            <button
              type="button"
              data-orden-asa={v.pkListaValor}
              aria-label={`Mover ${v.nombre}, posición ${posicion}. Usa las flechas arriba y abajo`}
              {...asa}
              onKeyDown={(e) => {
                const delta = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0
                if (!delta) return
                e.preventDefault()
                onMover(v, delta)
              }}
              // Con teclado se guarda al salir del asa: no un PUT por cada flecha.
              onBlur={onSoltar}
              className="cursor-grab touch-none rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 active:cursor-grabbing"
            >
              <DotsSixVerticalIcon className="size-5" />
            </button>
            <span className="text-muted-foreground tabular-nums">{posicion}</span>
          </span>
        )
      },
      size: 72,
    },
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Nombre" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => {
        const v = row.original
        return (
          <span className="flex items-center gap-1.5 font-medium">
            <span className={v.habilitado ? undefined : "text-muted-foreground"}>{v.nombre}</span>
            {v.esSistema && (
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex text-muted-foreground" />}>
                  <LockIcon className="size-3.5" />
                  <span className="sr-only">Valor del sistema</span>
                </TooltipTrigger>
                <TooltipContent>
                  Valor del sistema: se puede renombrar y reordenar, pero no inactivar.
                </TooltipContent>
              </Tooltip>
            )}
            {v.predeterminado && (
              <Badge variant="soft" color="primary">
                Predeterminado
              </Badge>
            )}
          </span>
        )
      },
    },
    {
      id: "etiqueta",
      accessorKey: "etiqueta",
      meta: { label: "Etiqueta" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Etiqueta" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.etiqueta ?? "—"}</span>
      ),
    },
    {
      id: "valor",
      accessorKey: "valor",
      meta: { label: "Código" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Código" />,
      cell: ({ row }) => <span className="font-mono text-[0.8125rem]">{row.original.valor}</span>,
    },
  ]

  if (categoria.categoriaPadre) {
    columns.push({
      id: "padre",
      accessorFn: (row) => row.padre?.nombre ?? "",
      meta: { label: "Depende de" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Depende de" />,
      cell: ({ row }) => {
        const padre = row.original.padre
        if (!padre) return <span className="text-muted-foreground">—</span>
        return (
          <Badge
            variant="soft"
            color="neutral"
            render={
              <button
                type="button"
                title={`Ir a ${padre.categoria}`}
                onClick={() => onIrALista(padre.categoria)}
              />
            }
          >
            {padre.nombre}
          </Badge>
        )
      },
    })
  }

  columns.push({
    id: "habilitado",
    accessorFn: (row) => (row.habilitado ? "Activo" : "Inactivo"),
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    // Se cambia desde "Editar valor".
    cell: ({ row }) =>
      row.original.habilitado ? (
        <Badge variant="soft" color="success">
          Activo
        </Badge>
      ) : (
        <Badge variant="outline" color="neutral">
          Inactivo
        </Badge>
      ),
  })

  if (puedeEditar || puedeEliminar) {
    columns.push({
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const v = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            {/* Inactivo no puede ser predeterminado (V101). */}
            {puedeEditar && v.habilitado && !v.predeterminado && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      color="neutral"
                      size="icon-sm"
                      disabled={pendiente === v.pkListaValor}
                      onClick={() => onPredeterminado(v, true)}
                    />
                  }
                >
                  <span className="sr-only">Marcar {v.nombre} como predeterminado</span>
                  <StarIcon />
                </TooltipTrigger>
                <TooltipContent>Marcar como predeterminado</TooltipContent>
              </Tooltip>
            )}
            {puedeEditar && v.predeterminado && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      color="primary"
                      size="icon-sm"
                      disabled={pendiente === v.pkListaValor}
                      onClick={() => onPredeterminado(v, false)}
                    />
                  }
                >
                  <span className="sr-only">Quitar {v.nombre} como predeterminado</span>
                  <StarFillIcon />
                </TooltipTrigger>
                <TooltipContent>Quitar predeterminado</TooltipContent>
              </Tooltip>
            )}
            {puedeEditar && (
              <DialogSaveValor
                key={`${v.pkListaValor}-${v.nombre}-${v.etiqueta}-${v.padre?.pkListaValor}`}
                categoria={categoria}
                valor={v}
              />
            )}
            {/* Los del sistema no se eliminan (V101): el botón queda visible pero bloqueado,
                para que se sepa que la opción existe. */}
            {puedeEliminar && v.esSistema && (
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>
                  <Button variant="ghost" color="neutral" size="icon-sm" disabled>
                    <span className="sr-only">Eliminar {v.nombre} (no disponible)</span>
                    <TrashIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Valor del sistema: no se puede eliminar</TooltipContent>
              </Tooltip>
            )}
            {puedeEliminar && !v.esSistema && (
              <ConfirmRemoveButton
                label={`Eliminar ${v.nombre}`}
                title="Eliminar valor"
                description={`Se eliminará «${v.nombre}» de la lista. No se puede si está en uso o si tiene valores hijos activos; en esos casos, inactívelo.`}
                onConfirm={() => onEliminar(v)}
              />
            )}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 144,
    })
  }

  return columns
}
