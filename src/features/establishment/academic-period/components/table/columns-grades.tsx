"use no memo"

import type { ColumnDef, Table } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { EyeIcon, PencilIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { Grade } from "@/features/establishment/academic-period/api/types/grade"
import { DeleteGradeDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-grade"

interface GradeColumnsOptions {
  onOpen: (grade: Grade) => void
  // Período Cerrado o "Ver": el grado se abre para consultar, sin eliminar.
  readOnly?: boolean
}

const centered = (value: number | undefined) => (
  <span className="block text-center tabular-nums">{value ?? 0}</span>
)

// Listado de grados (Sección 5.3): Grupos y Cupo total los calcula el sistema
// con los grupos del grado.
export function createGradeColumns({ onOpen, readOnly = false }: GradeColumnsOptions): ColumnDef<Grade>[] {
  return [
    {
      id: "teachingLevelName",
      accessorKey: "teachingLevelName",
      meta: { label: "Nivel de enseñanza" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel de enseñanza" />,
      cell: ({ row }) => <span>{row.original.teachingLevelName}</span>,
    },
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Grado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grado" />,
      cell: ({ row }) => <span>{row.original.nombre}</span>,
    },
    {
      id: "gradoSiguienteName",
      accessorKey: "gradoSiguienteName",
      meta: { label: "Grado siguiente" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grado siguiente" />,
      cell: ({ row }) => (
        <span>{row.original.tieneGradoSiguiente ? (row.original.gradoSiguienteName ?? "—") : "—"}</span>
      ),
    },
    {
      id: "jornadasContinuidad",
      meta: { label: "Jornadas de continuidad" },
      header: () => <span>Jornadas de continuidad</span>,
      cell: ({ row }) => {
        const jornadas = row.original.jornadasContinuidad ?? []
        return <span>{jornadas.length ? jornadas.map((j) => j.name).join(", ") : "—"}</span>
      },
      enableSorting: false,
    },
    {
      id: "gruposCount",
      accessorKey: "gruposCount",
      meta: { label: "Grupos" },
      header: () => <span className="block text-center">Grupos</span>,
      cell: ({ row }) => centered(row.original.gruposCount),
    },
    {
      id: "cupoTotal",
      accessorKey: "cupoTotal",
      meta: { label: "Cupo total" },
      header: () => <span className="block text-center">Cupo total</span>,
      cell: ({ row }) => centered(row.original.cupoTotal),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpen(row.original)
                  }}
                />
              }
            >
              <span className="sr-only">
                {readOnly ? "Ver" : "Modificar"} {row.original.nombre}
              </span>
              {readOnly ? <EyeIcon /> : <PencilIcon />}
            </TooltipTrigger>
            <TooltipContent>{readOnly ? "Ver" : "Modificar"}</TooltipContent>
          </Tooltip>
          {!readOnly && <DeleteGradeDialog grade={row.original} />}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 96,
    },
  ]
}

export type GradeTable = Table<Grade>
