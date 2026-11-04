import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"

import type { ConvivenciaAccess } from "@/features/gestion-estudiantil/convivencia/api/use-convivencia-access"
import { COLOR_ESTADO, esFinal, fechaHechosTexto, formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CasoRow } from "@/features/gestion-estudiantil/convivencia/api/types"
import { MenuAccionesCaso, type AccionCaso } from "@/features/gestion-estudiantil/convivencia/components/menu-acciones-caso"

const SIN_ACCESO: ConvivenciaAccess = { puedeCrear: false, puedeGestionar: false, puedeSupervisar: false }

interface ColumnasOpciones {
  access: ConvivenciaAccess
  onAccion: (caso: CasoRow, accion: AccionCaso) => void
}

/** Columnas del listado de casos (G.2.CAS.LIS.1). */
export function buildColumnsCasos({ access, onAccion }: ColumnasOpciones): ColumnDef<CasoRow>[] {
  return [
    {
      id: "fecha_hechos",
      accessorKey: "fecha_hechos",
      enableSorting: false,
      enableHiding: false,
      meta: { label: "Fecha de los hechos" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de los hechos" />,
      cell: ({ row }) => {
        const { fecha, hora } = fechaHechosTexto(row.original)
        return (
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">{fecha}</span>
            {hora && <span className="text-xs text-muted-foreground">{hora}</span>}
          </span>
        )
      },
    },
    {
      id: "fecha_conocimiento",
      accessorKey: "fecha_conocimiento",
      enableSorting: false,
      meta: { label: "Fecha de conocimiento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de conocimiento" />,
      cell: ({ row }) => formatFecha(row.original.fecha_conocimiento),
    },
    {
      id: "tipo",
      accessorKey: "tipo_nombre",
      enableSorting: false,
      meta: { label: "Tipo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => (
        <span className="flex flex-col gap-0.5">
          <span>{row.original.tipo_nombre}</span>
          <span className="text-xs text-muted-foreground">Caso {row.original.numero}</span>
        </span>
      ),
    },
    {
      id: "manifestacion",
      accessorKey: "manifestacion_nombre",
      enableSorting: false,
      meta: { label: "Manifestación" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Manifestación" />,
      cell: ({ row }) => <span className="whitespace-normal">{row.original.manifestacion_nombre ?? "—"}</span>,
    },
    {
      id: "estudiantes",
      accessorKey: "estudiantes",
      enableSorting: false,
      meta: { label: "Estudiantes" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiantes" />,
    },
    {
      id: "gestor",
      accessorKey: "gestor_nombre",
      enableSorting: false,
      meta: { label: "Gestor" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Gestor" />,
      cell: ({ row }) =>
        row.original.fk_tfuncionario_gestor ? (
          row.original.gestor_nombre
        ) : (
          <Badge variant="soft" color="warning">
            Sin gestor
          </Badge>
        ),
    },
    {
      id: "estado",
      accessorKey: "estado_nombre",
      enableSorting: false,
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      // "Vencido" depende del seguimiento que fija el Comité (3.3); el listado aún no lo trae.
      cell: ({ row }) => (
        <Badge variant="soft" color={COLOR_ESTADO[row.original.estado_codigo] ?? "muted"}>
          {row.original.estado_nombre}
        </Badge>
      ),
    },
    {
      id: "pasos",
      accessorKey: "pasos_pendientes",
      enableSorting: false,
      meta: { label: "Pasos pendientes" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Pasos pendientes" />,
      cell: ({ row }) => {
        // Un caso Cerrado o Anulado ya no tiene pasos por hacer, aunque le falten.
        const n = esFinal(row.original.estado_codigo) ? 0 : (row.original.pasos_pendientes ?? 0)
        return n > 0 ? `${n} ${n === 1 ? "pendiente" : "pendientes"}` : "—"
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: 48,
      cell: ({ row }) => (
        <MenuAccionesCaso
          caso={{
            numero: row.original.numero,
            estado_codigo: row.original.estado_codigo,
            sinGestor: !row.original.fk_tfuncionario_gestor,
          }}
          // Caso Tipo II/III visto por quien solo lo reportó (Regla 1): solo Ver detalle; el backend negaría el resto.
          access={row.original.confidencial ? SIN_ACCESO : access}
          onAccion={(accion) => onAccion(row.original, accion)}
        />
      ),
    },
  ]
}
