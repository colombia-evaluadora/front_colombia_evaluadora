import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EyeIcon, PencilIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"
import { toSentenceCase } from "@/lib/utils"
import { paths } from "@/config/paths"

import type { Establishment } from "@/features/establishment/institution/api/types/establishment"
import { DeleteEstablishmentDialog } from "@/features/establishment/institution/components/dialogs/dialog-delete"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

function ActionsCell({ establishment }: { establishment: Establishment }) {
  const { puedeVer, puedeEditar } = useMenuPermission("ESTABLECIMIENTO", { onlineOnlyWrites: true })

  return (
    <div className="flex items-center justify-end gap-1">
      {puedeVer ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="icon-sm"
                aria-label={`Ver detalle de ${establishment.name}`}
                render={<Link to={paths.app.establishments.detail.getHref(establishment.id)} search={(prev) => prev} />}
                nativeButton={false}
              />
            }
          >
            <EyeIcon />
          </TooltipTrigger>
          <TooltipContent>{`Ver detalle de ${establishment.name}`}</TooltipContent>
        </Tooltip>
      ) : null}
      {puedeEditar ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="icon-sm"
                aria-label={`Editar ${establishment.name}`}
                render={<Link to={paths.app.establishments.edit.getHref(establishment.id)} search={(prev) => prev} />}
                nativeButton={false}
              />
            }
          >
            <PencilIcon />
          </TooltipTrigger>
          <TooltipContent>{`Editar ${establishment.name}`}</TooltipContent>
        </Tooltip>
      ) : null}
      <DeleteEstablishmentDialog establishment={establishment} />
    </div>
  )
}

export const columns: ColumnDef<Establishment>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        aria-label="Seleccionar página"
        className="translate-y-0.5"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={
          !table.getIsAllPageRowsSelected() &&
          table.getIsSomePageRowsSelected()
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Seleccionar ${row.original.name}`}
        className="translate-y-0.5"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  },
  // Columnas del informe de diseño, 2: nombre, DANE, NIT, municipio, sector y rector.
  {
    accessorKey: "name",
    id: "name",
    meta: { label: "Nombre del establecimiento" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre del establecimiento" />
    ),
    cell: ({ row }) => (
      <p className="font-bold">{toSentenceCase(row.original.name)}</p>
    ),
  },
  {
    accessorKey: "dane",
    id: "dane",
    meta: { label: "Código DANE" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Código DANE" />
    ),
  },
  {
    accessorKey: "nit",
    id: "nit",
    meta: { label: "NIT" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="NIT" />
    ),
  },
  {
    accessorKey: "municipality",
    id: "municipality",
    meta: { label: "Municipio" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Municipio" />
    ),
    cell: ({ row }) => (
      <div className="max-w-xs truncate" title={`${row.original.municipality} (${row.original.department})`}>
        {toSentenceCase(row.original.municipality)}
      </div>
    ),
  },
  {
    accessorKey: "sector",
    id: "sector",
    meta: { label: "Sector" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sector" />
    ),
    cell: ({ row }) =>
      row.original.sector ? (
        <Badge variant="soft" color={row.original.sector === "Oficial" ? "info" : "neutral"}>
          {row.original.sector}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "rector",
    id: "rector",
    meta: { label: "Rector" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rector" />
    ),
    cell: ({ row }) =>
      row.original.rector ? (
        <div className="max-w-xs truncate">{toSentenceCase(row.original.rector)}</div>
      ) : (
        <span className="text-muted-foreground">Sin rector</span>
      ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => <ActionsCell establishment={row.original} />,
    enableSorting: false,
    enableHiding: false,
    size: 144,
  },
]
