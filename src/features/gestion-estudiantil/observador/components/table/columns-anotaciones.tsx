import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  BrainIcon,
  CalendarBlankIcon,
  ClipboardAddIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  GavelIcon,
  PencilIcon,
  PersonIcon,
  ProhibitIcon,
} from "@/components/ui/icons"

const ACCIONES_PROXIMAS = [
  { label: "Reportar salud mental", Icono: BrainIcon },
  { label: "Abrir proceso disciplinario", Icono: GavelIcon },
]

import { colorDeTipo, formatFecha } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import type { AnotacionRow } from "@/features/gestion-estudiantil/observador/api/types"

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
      size: 48,
      cell: ({ row }) => {
        const a = row.original
        const vigente = !a.anulada
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={`Acciones de la anotación de ${a.estudiante_nombre}`}
                />
              }
            >
              <DotsThreeVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 *:whitespace-nowrap">
              <DropdownMenuItem onClick={() => onVer(a)}>
                <EyeIcon />
                Ver detalle
              </DropdownMenuItem>
              {/* Las acciones se ven siempre; se deshabilitan si no aplican. Modifica solo quien la registró. */}
              <DropdownMenuItem disabled={!(puedeEditar && vigente && a.es_propia)} onClick={() => onModificar(a)}>
                <PencilIcon />
                Modificar
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!(puedeAnular && vigente)} onClick={() => onAnular(a)}>
                <ProhibitIcon />
                Anular
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!puedeRemitir} onClick={() => onRemitir(a)}>
                <PersonIcon />
                Remitir a orientación
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!vigente || !puedeCitar} onClick={() => onCitar(a)}>
                <CalendarBlankIcon />
                Citar al acudiente
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!vigente || !puedeCitar} onClick={() => onCompromiso(a)}>
                <ClipboardAddIcon />
                Crear compromiso
              </DropdownMenuItem>
              {/* Sección 9.6 y convivencia: aún sin backend. */}
              {ACCIONES_PROXIMAS.map(({ label, Icono }) => (
                <DropdownMenuItem key={label} disabled>
                  <Icono />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
