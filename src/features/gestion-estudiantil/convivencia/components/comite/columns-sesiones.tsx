import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"

import type { SesionFila } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { BadgeQuorum } from "@/features/gestion-estudiantil/convivencia/components/comite/badge-quorum"
import { MenuAccionesSesion, type AccionSesion } from "@/features/gestion-estudiantil/convivencia/components/comite/menu-acciones-sesion"
import { textoAsistentes } from "@/features/gestion-estudiantil/convivencia/utils/comite"

interface Opciones {
  puedeModificar: boolean
  onAccion: (sesion: SesionFila, accion: AccionSesion) => void
}

/** Columnas de «Sesiones» (G.2.COM.SES.1): Fecha, Tipo, Asistentes, Quórum y Casos tratados. */
export function buildColumnsSesiones({ puedeModificar, onAccion }: Opciones): ColumnDef<SesionFila>[] {
  return [
    {
      id: "fecha",
      accessorKey: "fecha",
      enableSorting: false,
      enableHiding: false,
      meta: { label: "Fecha" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => (
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">{formatFecha(row.original.fecha)}</span>
        </span>
      ),
    },
    {
      id: "tipo",
      accessorKey: "tipo_nombre",
      enableSorting: false,
      meta: { label: "Tipo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    },
    {
      id: "asistentes",
      accessorKey: "asistentes",
      enableSorting: false,
      meta: { label: "Asistentes" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Asistentes" />,
      cell: ({ row }) => textoAsistentes(row.original.asistentes, row.original.integrantes_vigentes),
    },
    {
      id: "quorum",
      accessorKey: "con_quorum",
      enableSorting: false,
      meta: { label: "Quórum" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Quórum" />,
      cell: ({ row }) => <BadgeQuorum conQuorum={row.original.con_quorum} />,
    },
    {
      id: "casos",
      accessorKey: "casos_tratados",
      enableSorting: false,
      meta: { label: "Casos tratados" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Casos tratados" />,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: 48,
      cell: ({ row }) => (
        <MenuAccionesSesion
          numero={row.original.numero}
          puedeModificar={puedeModificar}
          onAccion={(accion) => onAccion(row.original, accion)}
        />
      ),
    },
  ]
}
