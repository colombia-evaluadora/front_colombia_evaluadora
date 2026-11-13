import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import {
  BrainIcon,
  CalendarBlankIcon,
  ClipboardAddIcon,
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

/** Ver, Modificar, Anular, Remitir, Citar, Crear compromiso y Reportar salud mental y la que aún no tiene backend. */
const ACCIONES_ANOTACION = 8

interface ColumnasOpciones {
  onVer: (row: AnotacionRow) => void
  onModificar: (row: AnotacionRow) => void
  onAnular: (row: AnotacionRow) => void
  puedeEditar: boolean
  puedeAnular: boolean
  puedeRemitir: boolean
  onRemitir: (row: AnotacionRow) => void
  puedeCitar: boolean
  onCitar: (row: AnotacionRow) => void
  onCompromiso: (row: AnotacionRow) => void
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
  puedeCitar,
  onCitar,
  onCompromiso,
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
        <span className="flex flex-col gap-0.5 whitespace-normal">
          <span>
            <span className="font-semibold">{row.original.codigo}</span> · {row.original.descripcion}
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
              { id: "remitir", label: "Remitir a orientación", icon: <PersonIcon />, disabled: !puedeRemitir, onSelect: () => onRemitir(a) },
              {
                id: "citar",
                label: "Citar al acudiente",
                icon: <CalendarBlankIcon />,
                disabled: !vigente || !puedeCitar,
                onSelect: () => onCitar(a),
              },
              {
                id: "compromiso",
                label: "Crear compromiso",
                icon: <ClipboardAddIcon />,
                disabled: !vigente || !puedeCitar,
                onSelect: () => onCompromiso(a),
              },
              // Sección 9.6: abre el reporte de Prevención con el estudiante de la fila. El backend decide el alcance.
              { id: "salud", label: "Reportar salud mental", icon: <BrainIcon />, onSelect: () => onReportarSaludMental(a) },
              // Convivencia: aún sin backend.
              { id: "disciplinario", label: "Abrir proceso disciplinario", icon: <GavelIcon />, disabled: true, onSelect: () => {} },
            ]}
          />
        )
      },
    },
  ]
}
