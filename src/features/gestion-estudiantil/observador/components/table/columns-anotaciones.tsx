import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import {
  BrainIcon,
  EyeIcon,
  GavelIcon,
  PencilIcon,
  PersonIcon,
  ProhibitIcon,
} from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { colorDeTipo } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { AnotacionRow } from "@/features/gestion-estudiantil/observador/api/types"

/** Ver, Modificar, Anular, Reportar salud mental, Remitir y Abrir proceso disciplinario (orden de la guía de diseño). */
const ACCIONES_ANOTACION = 6

interface ColumnasOpciones {
  onVer: (row: AnotacionRow) => void
  onModificar: (row: AnotacionRow) => void
  onAnular: (row: AnotacionRow) => void
  puedeEditar: boolean
  puedeAnular: boolean
  puedeRemitir: boolean
  onRemitir: (row: AnotacionRow) => void
  /** Sección 9.6: abre el reporte de Prevención con el estudiante de la fila. */
  onReportarSaludMental: (row: AnotacionRow) => void
}

export function buildColumnsAnotaciones({
  onVer,
  onModificar,
  onAnular,
  puedeEditar,
  puedeAnular,
  puedeRemitir,
  onRemitir,
  onReportarSaludMental,
}: ColumnasOpciones): ColumnDef<AnotacionRow>[] {
  return [
    {
      id: "fecha",
      accessorKey: "fecha",
      enableSorting: false,
      enableHiding: false,
      meta: { label: "Fecha" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => formatFecha(row.original.fecha),
    },
    {
      id: "estudiante",
      accessorKey: "estudiante_nombre",
      enableSorting: false,
      enableHiding: false,
      meta: { label: "Estudiante" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
      cell: ({ row }) => (
<span className="font-medium">{row.original.estudiante_nombre}</span>
      ),
    },
    {
      id: "grupo",
      accessorKey: "grado_grupo",
      enableSorting: false,
      meta: { label: "Grado/Grupo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grado/Grupo" />,
    },
    {
      id: "tipo",
      accessorKey: "tipo_nombre",
      enableSorting: false,
      meta: { label: "Tipo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => (
        <Badge variant="soft" color={colorDeTipo(row.original.tipo_nombre)}>
          {row.original.tipo_nombre}
        </Badge>
      ),
    },
    {
      id: "codigo",
      accessorKey: "codigo",
      enableSorting: false,
      enableHiding: false,
      meta: { label: "Código y descripción" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Código y descripción" />,
      cell: ({ row }) => (
        // `min-w-64`: la columna ya no absorbe el sobrante de la tabla, y sin un mínimo cortaba
        // en la primera palabra posible. Código y descripción van en una línea; solo una descripción
        // larga pasa a la siguiente (hasta `max-w-md`). El código y el «·» no se separan.
        <span className="flex max-w-md min-w-64 flex-col gap-0.5 whitespace-normal">
          <span>
            <span className="whitespace-nowrap">
              <span className="font-semibold">{row.original.codigo}</span> ·
            </span>{" "}
            {row.original.descripcion}
          </span>
          {row.original.situacion_nombre && (
            <span className="text-xs text-muted-foreground">Situación {row.original.situacion_nombre}</span>
          )}
        </span>
      ),
    },
    {
      id: "responsable",
      accessorKey: "responsable_nombre",
      enableSorting: false,
      meta: { label: "Responsable de enseñanza" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Responsable de enseñanza" />,
    },
    {
      id: "estado",
      accessorKey: "anulada",
      enableSorting: false,
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      // Solo cuando aplica: una anotación vigente no lleva estado (G.1.LIS.1).
      cell: ({ row }) =>
        row.original.anulada ? (
          <Badge variant="soft" color="muted">
            Anulada
          </Badge>
        ) : null,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_ANOTACION),
      cell: ({ row }) => {
        const a = row.original
        const vigente = !a.anulada
        // Las acciones se ven siempre; se deshabilitan si no aplican. Modifica solo quien la registró.
        return (
          <AccionesFila
            etiqueta={`Acciones de la anotación de ${a.estudiante_nombre}`}
            acciones={[
              { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => onVer(a) },
              {
                id: "modificar",
                label: "Modificar",
                icon: <PencilIcon />,
                disabled: !(puedeEditar && vigente && a.es_propia),
                onSelect: () => onModificar(a),
              },
              { id: "anular", label: "Anular", icon: <ProhibitIcon />, disabled: !(puedeAnular && vigente), onSelect: () => onAnular(a) },
              // Salud mental abre el reporte de Prevención (§9.6; el backend decide el alcance). Proceso disciplinario: aún sin backend.
              { id: "salud", label: "Reportar salud mental", icon: <BrainIcon />, onSelect: () => onReportarSaludMental(a) },
              { id: "remitir", label: "Remitir a orientación", icon: <PersonIcon />, disabled: !puedeRemitir, onSelect: () => onRemitir(a) },
              { id: "disciplinario", label: "Abrir proceso disciplinario", icon: <GavelIcon />, disabled: true, onSelect: () => {} },
            ]}
          />
        )
      },
    },
  ]
}
