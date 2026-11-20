"use no memo"

import type { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { DataTableColumnHeader } from "@/components/data-table"

import type { BitacoraEvento } from "@/features/bitacora/api/types/bitacora"

const texto = (v: string | null | undefined) => v || <span className="text-muted-foreground">—</span>

/**
 * Tabla de accesos de Administración del Sistema (B.7.LIS.1): Fecha y hora · Número de documento · Tipo de
 * cuenta · Evento · Dirección IP · Navegador. Sin fila expandible: un acceso no tiene campos ni se restaura.
 */
export function createAccesoColumns(): ColumnDef<BitacoraEvento>[] {
  return [
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
    },
    {
      id: "documento",
      meta: { label: "Número de documento" },
      header: "Número de documento",
      cell: ({ row }) => <span className="tabular-nums">{texto(row.original.acceso?.documento)}</span>,
      enableSorting: false,
    },
    {
      id: "tipoCuenta",
      meta: { label: "Tipo de cuenta" },
      header: "Tipo de cuenta",
      cell: ({ row }) => texto(row.original.acceso?.tipoCuenta),
      enableSorting: false,
    },
    {
      id: "evento",
      // Ancho mínimo: si no, Navegador (la última columna) se lleva el sobrante y el evento se parte en muchas líneas.
      meta: { label: "Evento", className: "min-w-64 whitespace-normal" },
      header: "Evento",
      cell: ({ row }) => texto(row.original.acceso?.evento ?? row.original.descripcion),
      enableSorting: false,
    },
    {
      id: "ip",
      meta: { label: "Dirección IP" },
      header: "Dirección IP",
      cell: ({ row }) => <span className="tabular-nums">{texto(row.original.acceso?.ip)}</span>,
      enableSorting: false,
    },
    {
      id: "navegador",
      meta: { label: "Navegador" },
      header: "Navegador",
      cell: ({ row }) => texto(row.original.acceso?.navegador),
      enableSorting: false,
    },
  ]
}
