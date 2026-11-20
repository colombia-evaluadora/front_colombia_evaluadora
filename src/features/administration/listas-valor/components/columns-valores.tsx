"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { TituloConAyuda } from "@/components/titulo-con-ayuda"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CheckCircleIcon,
  DotsSixVerticalIcon,
  LockIcon,
  PencilIcon,
  ProhibitIcon,
  StarFillIcon,
  StarIcon,
  TrashIcon,
} from "@/components/ui/icons"

import {
  MARCAS_LISTA,
  type Categoria,
  type ListaValor,
} from "@/features/administration/listas-valor/api/types/lista-valor"
import { AccionFila } from "@/features/administration/listas-valor/components/accion-fila"
import { AVISO_VALOR_SISTEMA } from "@/features/administration/listas-valor/components/dialog-save-valor"

interface CreateColumnsOptions {
  categoria: Categoria
  /** Algún valor de la lista tiene etiqueta: si ninguno, la columna no se muestra. */
  conEtiqueta: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
  /** pk del valor cuya acción (estado o predeterminado) está en curso. */
  pendiente: number | null
  onIrALista: (categoria: string) => void
  onModificar: (valor: ListaValor) => void
  /** true = marcar, false = quitar (la lista queda sin predeterminado). */
  onPredeterminado: (valor: ListaValor, predeterminado: boolean) => void
  onEstado: (valor: ListaValor, habilitado: boolean) => void
  /** Abre la confirmación. */
  onEliminar: (valor: ListaValor) => void
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

const siNo = (si: boolean) => <span className="block text-center">{si ? "Sí" : "No"}</span>

/**
 * Valores de una lista (S.1.VAL.LST.1): Orden · Valor · Código · (Valor padre) · Etiqueta · Predet. ·
 * Usado por el sistema · (marca de la lista) · Estado · menú ⁞ (LST.2 / LST.2a).
 */
export function createValoresColumns({
  categoria,
  conEtiqueta,
  puedeEditar,
  puedeEliminar,
  pendiente,
  onIrALista,
  onModificar,
  onPredeterminado,
  onEstado,
  onEliminar,
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
      header: ({ column }) => (
        <TituloConAyuda
          titulo="Orden"
          ayuda="Arrastre el ícono para cambiar el orden: es el de los selectores y el de las reglas, de menor a mayor."
        >
          <DataTableColumnHeader column={column} title="Orden" />
        </TituloConAyuda>
      ),
      cell: ({ row }) => {
        const v = row.original
        if (!ordenable) return <span className="pl-7 tabular-nums">{v.orden}</span>
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
            <span className="tabular-nums">{posicion}</span>
          </span>
        )
      },
      size: 72,
    },
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Valor", className: "min-w-32 whitespace-normal" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Valor" />,
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.nombre}
        </span>
      ),
    },
    {
      id: "valor",
      accessorKey: "valor",
      meta: { label: "Código" },
      header: ({ column }) => (
        <TituloConAyuda
          titulo="Código"
          ayuda="Código interno: identifica el valor aunque cambie su nombre; no se modifica después de crearlo."
        >
          <DataTableColumnHeader column={column} title="Código" />
        </TituloConAyuda>
      ),
      cell: ({ row }) => <span className="font-mono text-[0.8125rem]">{row.original.valor}</span>,
    },
  ]

  if (categoria.categoriaPadre) {
    columns.push({
      id: "padre",
      accessorFn: (row) => row.padre?.nombre ?? "",
      meta: { label: "Valor padre", className: "whitespace-normal" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Valor padre" />,
      cell: ({ row }) => {
        const padre = row.original.padre
        if (!padre) return <span className="text-muted-foreground">—</span>
        return (
          <button
            type="button"
            title={`Ir a la lista ${padre.categoria}`}
            onClick={() => onIrALista(padre.categoria)}
            className="rounded underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {padre.nombre}
          </button>
        )
      },
    })
  }

  // Sin ninguna etiqueta en la lista la columna solo ocupa ancho: el nombre se partía en 3 líneas.
  if (conEtiqueta) {
    columns.push({
      id: "etiqueta",
      accessorKey: "etiqueta",
      meta: { label: "Etiqueta" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Etiqueta" />,
      cell: ({ row }) => row.original.etiqueta ?? "",
    })
  }

  columns.push(
    {
      id: "predeterminado",
      accessorFn: (row) => (row.predeterminado ? "Sí" : ""),
      meta: { label: "Predeterminado" },
      enableSorting: false,
      header: () => <span className="block text-center">Predet.</span>,
      cell: ({ row }) =>
        row.original.predeterminado ? (
          <span className="block text-center">Sí</span>
        ) : null,
    },
    {
      id: "sistema",
      accessorFn: (row) => (row.esSistema ? "Sí" : "No"),
      meta: { label: "Usado por el sistema", className: "min-w-20 whitespace-normal" },
      enableSorting: false,
      header: () => <span className="block text-center">Usado por el sistema</span>,
      cell: ({ row }) => siNo(row.original.esSistema),
    },
  )

  const marca = categoria.marca
  if (marca) {
    columns.push({
      id: "marca",
      accessorFn: (row) =>
        marca === "ESTAMENTO" ? (row.estamento ?? "") : (marca === "SIMPADE" ? row.delSimpade : row.disparaPiar) ? "Sí" : "No",
      meta: { label: MARCAS_LISTA[marca].columna, className: "min-w-24 whitespace-normal" },
      enableSorting: false,
      header: () => (
        <div className={marca === "ESTAMENTO" ? undefined : "flex justify-center text-center"}>
          <TituloConAyuda titulo={MARCAS_LISTA[marca].columna} ayuda={MARCAS_LISTA[marca].ayuda} />
        </div>
      ),
      cell: ({ row }) =>
        marca === "ESTAMENTO"
          ? (row.original.estamento ?? "—")
          : siNo(Boolean(marca === "SIMPADE" ? row.original.delSimpade : row.original.disparaPiar)),
    })
  }

  columns.push({
    id: "habilitado",
    accessorFn: (row) => (row.habilitado ? "Activo" : "Inactivo"),
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) =>
      row.original.habilitado ? (
        <Badge variant="soft" color="success">
          Activo
        </Badge>
      ) : (
        <Badge variant="soft" color="neutral">
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
        const ocupado = pendiente === v.pkListaValor
        // Usado por el sistema: solo Modificar y predeterminado (LST.2a); el candado explica por qué.
        // Eliminar solo si ningún registro lo usa (LST.2); sin el dato (back real) se ofrece y el back responde 409.
        const puedeInactivar = puedeEditar && !v.esSistema
        const puedeBorrar = puedeEliminar && !v.esSistema && v.enUso !== true
        return (
          <div className="flex items-center justify-end gap-1">
            {puedeEditar && (
              <AccionFila label="Modificar" onClick={() => onModificar(v)} disabled={ocupado}>
                <PencilIcon />
              </AccionFila>
            )}
            {/* Un inactivo no puede ser predeterminado (V101). */}
            {puedeEditar && v.habilitado && (
              <AccionFila
                label={v.predeterminado ? "Quitar predeterminado" : "Marcar como predeterminado"}
                onClick={() => onPredeterminado(v, !v.predeterminado)}
                disabled={ocupado}
              >
                {v.predeterminado ? <StarFillIcon className="text-primary" /> : <StarIcon />}
              </AccionFila>
            )}
            {puedeInactivar && (
              <AccionFila
                label={v.habilitado ? "Inactivar" : "Activar"}
                onClick={() => onEstado(v, !v.habilitado)}
                disabled={ocupado}
              >
                {v.habilitado ? <ProhibitIcon /> : <CheckCircleIcon />}
              </AccionFila>
            )}
            {puedeBorrar && (
              <AccionFila label="Eliminar" destructivo onClick={() => onEliminar(v)} disabled={ocupado}>
                <TrashIcon />
              </AccionFila>
            )}
            {v.esSistema && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      tabIndex={0}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    />
                  }
                >
                  <LockIcon className="size-4" />
                  <span className="sr-only">Valor del sistema</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-64">{AVISO_VALOR_SISTEMA}</TooltipContent>
              </Tooltip>
            )}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
      // Hasta 4 botones de 32px + separación: el respiro de DataTable reserva este ancho.
      size: 164,
    })
  }

  return columns
}
