import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EyeIcon, PencilIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"
import { paths } from "@/config/paths"

import type { CampusRow } from "@/features/establishment/campuses/api/types/campus"
import { CampusStatusBadge, PrincipalBadge } from "@/features/establishment/campuses/components/campus-badges"
import { ChangeCampusStatusDialog } from "@/features/establishment/campuses/components/dialogs/dialog-change-status"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

function ActionsCell({ campus }: { campus: CampusRow }) {
  const { puedeEditar } = useMenuPermission("SEDES_EDUCATIVAS", { onlineOnlyWrites: true })

  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              render={<Link to={paths.app.establishments.campusDetail.getHref(campus.id)} />}
              nativeButton={false}
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label="Ver detalle"
            />
          }
        >
          <EyeIcon />
        </TooltipTrigger>
        <TooltipContent>Ver detalle</TooltipContent>
      </Tooltip>
      {puedeEditar ? (
        <>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  render={<Link to={paths.app.establishments.campusEdit.getHref(campus.id)} />}
                  nativeButton={false}
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label="Modificar"
                />
              }
            >
              <PencilIcon />
            </TooltipTrigger>
            <TooltipContent>Modificar</TooltipContent>
          </Tooltip>
          <ChangeCampusStatusDialog campus={campus} />
        </>
      ) : null}
    </div>
  )
}

/** Columnas del informe de diseño, 3: consecutivo, nombre, DANE antiguo, zona, jornadas y estado. */
export const columns: ColumnDef<CampusRow>[] = [
  {
    accessorKey: "consecutive",
    id: "consecutive",
    meta: { label: "Consecutivo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Consecutivo" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.consecutive}</span>,
    size: 120,
  },
  {
    accessorKey: "name",
    id: "name",
    meta: { label: "Nombre de la sede" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre de la sede" />,
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate" title={row.original.establishmentName}>
          {row.original.name}
        </span>
        {row.original.isPrincipal ? <PrincipalBadge /> : null}
      </div>
    ),
  },
  {
    accessorKey: "dane",
    id: "dane",
    meta: { label: "Código DANE antiguo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Código DANE" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.dane}</span>,
  },
  {
    accessorKey: "zoneName",
    id: "zone",
    meta: { label: "Zona" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Zona" />,
  },
  {
    accessorKey: "workSchedules",
    id: "workSchedules",
    meta: { label: "Jornadas" },
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Jornadas" />,
    cell: ({ row }) => <div className="max-w-xs truncate">{row.original.workSchedules || "—"}</div>,
  },
  {
    accessorKey: "status",
    id: "status",
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <CampusStatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    enableHiding: false,
    enableSorting: false,
    size: 144,
    cell: ({ row }) => <ActionsCell campus={row.original} />,
  },
]
