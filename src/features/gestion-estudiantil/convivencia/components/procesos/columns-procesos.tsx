import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { paths } from "@/config/paths"

import type { ProcesoRow } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { COLOR_ESTADO_PROCESO } from "@/features/gestion-estudiantil/convivencia/api/procesos-ui"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { CeldaVencimiento } from "@/features/gestion-estudiantil/convivencia/components/procesos/celda-vencimiento"
import { abreviarPersona } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { ACCIONES_PROCESO, MenuAccionesProceso, type AccionProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/menu-acciones-proceso"

interface ColumnasOpciones {
  onAccion: (proceso: ProcesoRow, accion: AccionProceso) => void
}

/** Columnas del listado de procesos (G.2.PRD.LIS.1). */
export function buildColumnsProcesos({ onAccion }: ColumnasOpciones): ColumnDef<ProcesoRow>[] {
  return [
    {
      id: "fecha_apertura",
      accessorKey: "fecha_apertura",
      enableSorting: false,
      meta: { label: "Fecha de apertura" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de apertura" />,
      cell: ({ row }) => formatFecha(row.original.fecha_apertura),
    },
    {
      id: "estudiante",
      accessorKey: "estudiante_nombre",
      enableSorting: false,
      meta: { label: "Estudiante" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
      cell: ({ row }) => (
        <span className="flex flex-col gap-0.5">
          <Link
            to={paths.app.convivenciaProceso.getHref(row.original.id)}
            className="font-medium text-primary hover:underline"
          >
            {row.original.estudiante_nombre}
          </Link>
          <span className="text-xs text-muted-foreground">Proceso {row.original.numero}</span>
        </span>
      ),
    },
    {
      id: "grado_grupo",
      accessorKey: "grado_grupo",
      enableSorting: false,
      meta: { label: "Grado/Grupo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grado/Grupo" />,
      cell: ({ row }) => row.original.grado_grupo ?? "—",
    },
    {
      id: "sede",
      accessorKey: "sede_nombre",
      enableSorting: false,
      meta: { label: "Sede" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sede" />,
    },
    {
      id: "jornada",
      accessorKey: "jornada_nombre",
      enableSorting: false,
      meta: { label: "Jornada" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
    },
    {
      id: "cargos",
      accessorKey: "cargos",
      enableSorting: false,
      meta: { label: "Cargos" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cargos" />,
    },
    {
      id: "responsable",
      accessorKey: "responsable_nombre",
      enableSorting: false,
      meta: { label: "Responsable" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Responsable" />,
      cell: ({ row }) => abreviarPersona(row.original.responsable_nombre) || "—",
    },
    {
      id: "estado",
      accessorKey: "estado_nombre",
      enableSorting: false,
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => (
        <Badge variant="soft" color={COLOR_ESTADO_PROCESO[row.original.estado_codigo] ?? "muted"}>
          <span>{row.original.estado_nombre}</span>
        </Badge>
      ),
    },
    {
      id: "proximo_vencimiento",
      accessorKey: "proximo_vencimiento",
      enableSorting: false,
      meta: { label: "Próximo vencimiento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Próximo vencimiento" />,
      cell: ({ row }) => <CeldaVencimiento proceso={row.original} />,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_PROCESO),
      cell: ({ row }) => (
        <MenuAccionesProceso
          numero={row.original.numero}
          acciones={row.original}
          onAccion={(accion) => onAccion(row.original, accion)}
        />
      ),
    },
  ]
}
