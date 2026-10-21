"use no memo"

import type { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { DataTableColumnHeader } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { CaretDownIcon, CaretRightIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { BitacoraCambio, BitacoraEstado, BitacoraEvento } from "@/features/bitacora/api/types/bitacora"
import { AccionBadge } from "@/features/bitacora/components/accion-badge"

export function createBitacoraColumns({
  conSedeJornada,
  expandidoId,
  estados,
  onToggle,
}: {
  /** Administración del Sistema es global: no tiene sede ni jornada. */
  conSedeJornada: boolean
  expandidoId: string | null
  /** Campos legibles de cada evento; mientras cargan se muestran los nombres crudos. */
  estados: Map<string, BitacoraEstado> | undefined
  onToggle: (evento: BitacoraEvento) => void
}): ColumnDef<BitacoraEvento>[] {
  const columnas: ColumnDef<BitacoraEvento>[] = [
    {
      id: "expand",
      header: () => <span className="sr-only">Ver detalle</span>,
      cell: ({ row }) => {
        const abierto = expandidoId === row.original.id
        const label = abierto ? "Ocultar detalle" : "Ver detalle"
        return (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={label}
                  aria-expanded={abierto}
                  onClick={() => onToggle(row.original)}
                />
              }
            >
              {abierto ? <CaretDownIcon weight="bold" /> : <CaretRightIcon weight="bold" />}
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      id: "fecha",
      accessorFn: (e) => e.fecha.getTime(),
      meta: { label: "Fecha y hora" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha y hora" />,
      cell: ({ row }) => (
        <span className="flex flex-col tabular-nums">
          <span>{format(row.original.fecha, "d MMM yyyy", { locale: es })}</span>
          <span className="text-xs text-muted-foreground">{format(row.original.fecha, "h:mm a")}</span>
        </span>
      ),
      size: 120,
    },
    {
      id: "usuario",
      accessorFn: (e) => e.usuario.nombre,
      meta: { label: "Usuario y rol" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Usuario y rol" />,
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span className="font-medium">{row.original.usuario.nombre}</span>
          {row.original.usuario.rol && (
            <span className="text-xs text-muted-foreground">{row.original.usuario.rol}</span>
          )}
        </span>
      ),
    },
  ]

  if (conSedeJornada)
    columnas.push({
      id: "sede",
      accessorFn: (e) => `${e.sede} ${e.jornada}`,
      meta: { label: "Sede y jornada" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sede y jornada" />,
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span>{row.original.sede ?? "Todas"}</span>
          <span className="text-xs text-muted-foreground">{row.original.jornada ?? "—"}</span>
        </span>
      ),
    })

  columnas.push(
    {
      id: "entidad",
      accessorFn: (e) => e.entidad,
      meta: { label: "Entidad y registro" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Entidad y registro" />,
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span>{row.original.entidad}</span>
          <span className="text-xs text-muted-foreground">{row.original.registro}</span>
        </span>
      ),
    },
    {
      id: "accion",
      accessorFn: (e) => e.accion,
      meta: { label: "Acción" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Acción" />,
      cell: ({ row }) => <AccionBadge accion={row.original.accion} />,
      size: 140,
    },
    {
      id: "cambio",
      meta: { label: "Cambio" },
      header: () => "Cambio",
      cell: ({ row }) => {
        const cambios = estados?.get(row.original.id)?.cambios
        if (!cambios) return <span className="text-muted-foreground">{row.original.campos.join(", ") || "—"}</span>
        const [primero, ...resto] = cambios
        if (!primero) return "—"
        return (
          <span className="block max-w-80 whitespace-normal">
            {cambioTexto(primero, row.original)}
            {resto.length > 0 && (
              <span className="text-muted-foreground">
                {" "}
                y {resto.length} {resto.length === 1 ? "campo más" : "campos más"}
              </span>
            )}
          </span>
        )
      },
      enableSorting: false,
      size: 320,
    },
  )

  return columnas
}

/** Resumen de un campo: "Teléfono: 607 634 5210 → 607 634 5299". */
function cambioTexto(c: BitacoraCambio, e: BitacoraEvento) {
  if (e.accion === "ELIMINAR") return "Registro eliminado (copia guardada)"
  if (c.anterior == null) return `${c.campo}: ${c.nuevo}`
  if (c.nuevo == null) return `${c.campo}: ${c.anterior} → sin valor`
  return `${c.campo}: ${c.anterior} → ${c.nuevo}`
}
