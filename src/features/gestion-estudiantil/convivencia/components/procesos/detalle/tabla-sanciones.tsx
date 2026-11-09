import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useDataTable } from "@/hooks/use-data-table"

import type { SancionDTO } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { abreviarPersona } from "@/features/gestion-estudiantil/convivencia/utils/proceso-detalle"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"

const texto = (v: string | null | undefined) => v || "—"

// Columnas estáticas: se definen una vez fuera del componente.
const COLUMNAS: ColumnDef<SancionDTO>[] = [
  { id: "nombre", accessorKey: "nombre", enableSorting: false, meta: { label: "Sanción" }, header: "Sanción" },
  { id: "efecto", enableSorting: false, meta: { label: "Efecto" }, header: "Efecto", accessorFn: (s) => s.efecto.nombre },
  {
    id: "inicio",
    enableSorting: false,
    meta: { label: "Inicio" },
    header: "Inicio",
    accessorFn: (s) => formatFecha(s.fecha_inicio),
    cell: ({ row }) => texto(formatFecha(row.original.fecha_inicio)),
  },
  {
    id: "fin",
    enableSorting: false,
    meta: { label: "Fin" },
    header: "Fin",
    accessorFn: (s) => formatFecha(s.fecha_fin),
    cell: ({ row }) => texto(formatFecha(row.original.fecha_fin)),
  },
  { id: "detalle", enableSorting: false, meta: { label: "Detalle" }, header: "Detalle", accessorFn: (s) => s.detalle ?? "", cell: ({ row }) => texto(row.original.detalle) },
  {
    id: "estado",
    enableSorting: false,
    meta: { label: "Estado" },
    header: "Estado",
    accessorFn: (s) => s.estado.nombre,
    cell: ({ row }) => (
      <Badge variant="soft" color="muted">
        {row.original.estado.nombre}
      </Badge>
    ),
  },
  {
    id: "cumplimiento",
    enableSorting: false,
    meta: { label: "Cumplimiento" },
    header: "Cumplimiento",
    accessorFn: (s) => s.cumplimiento?.resultado ?? "",
    cell: ({ row }) => {
      const c = row.original.cumplimiento
      if (!c) return "—"
      return (
        <div className="flex flex-col">
          <span>{`${formatFecha(c.fecha)} · ${abreviarPersona(c.por)}`}</span>
          {c.observacion && <span className="text-xs whitespace-normal text-muted-foreground">{c.observacion}</span>}
        </div>
      )
    },
  },
]

const noop = () => {}
const idDe = (s: SancionDTO) => String(s.id)

/** Sanciones con el DataTable del proyecto (sin paginación: caben todas); «—» cuando no hay fechas ni detalle. */
export function TablaSanciones({ sanciones }: { sanciones: SancionDTO[] }) {
  const { table } = useDataTable({
    columns: COLUMNAS,
    data: sanciones,
    pageCount: 1,
    getRowId: idDe,
    pageIndex: 0,
    pageSize: Math.max(sanciones.length, 1),
    goToPage: noop,
    setPageSize: noop,
    sorting: [],
    setSorting: noop,
  })
  return <DataTable table={table} isPending={false} isError={false} onRetry={noop} emptyMessage="Sin sanciones." />
}
