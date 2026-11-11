import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { EyeIcon, FileUploadOutlinedIcon, LockIcon, PencilIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import type { PiarRow } from "@/features/gestion-estudiantil/inclusion/piar/api/types"
import { COLOR_ESTADO, esEditable } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"

interface Opciones {
  access: { puedeGestionar: boolean; veAvisoSinPiar: boolean }
  prefetch: (id: number) => void
  irFicha: (row: PiarRow, accion?: "acta" | "cerrar") => void
}

export function buildColumnasPiar({ access, prefetch, irFicha }: Opciones): ColumnDef<PiarRow>[] {
  const columnas: ColumnDef<PiarRow>[] = [
    {
      id: "estudiante",
      accessorKey: "estudiante_nombre",
      enableSorting: false,
      header: "Estudiante",
      cell: ({ row }) => (
        <Link className="text-primary hover:underline" to={paths.app.piarFicha.getHref(row.original.id)} onMouseEnter={() => prefetch(row.original.id)}>
          {row.original.estudiante_nombre}
        </Link>
      ),
    },
    { id: "grado_grupo", accessorKey: "grado_grupo", enableSorting: false, header: "Grado/Grupo" },
    {
      id: "condicion",
      accessorKey: "condicion",
      enableSorting: false,
      header: "Condición",
      cell: ({ row }) => row.original.condicion ?? "—",
    },
    {
      id: "estado",
      accessorKey: "estado_nombre",
      enableSorting: false,
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant="soft" color={COLOR_ESTADO[row.original.estado_codigo] ?? "muted"}>
          <span>{row.original.estado_nombre}</span>
        </Badge>
      ),
    },
    {
      id: "ajustes",
      accessorKey: "ajustes",
      enableSorting: false,
      header: "Ajustes",
      cell: ({ row }) => <span className="block text-right tabular-nums">{row.original.ajustes}</span>,
    },
    {
      id: "pendientes",
      accessorKey: "seguimientos_pendientes",
      enableSorting: false,
      header: "Seguimientos pendientes",
      cell: ({ row }) => <span className="block text-right tabular-nums">{row.original.seguimientos_pendientes}</span>,
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => null,
      size: anchoAccionesFila(4),
      cell: ({ row }) => {
        const r = row.original
        const editable = access.puedeGestionar && esEditable(r.estado_codigo)
        return (
          <AccionesFila
            etiqueta={`Acciones de ${r.estudiante_nombre}`}
            acciones={[
              { id: "ver", label: "Ver detalle", icon: <EyeIcon />, onSelect: () => irFicha(r) },
              { id: "modificar", label: "Modificar", icon: <PencilIcon />, disabled: !editable, onSelect: () => irFicha(r) },
              {
                id: "acta",
                label: "Cargar acta",
                icon: <FileUploadOutlinedIcon />,
                disabled: !(access.puedeGestionar && r.estado_codigo === "BORRADOR"),
                onSelect: () => irFicha(r, "acta"),
              },
              { id: "cerrar", label: "Cerrar", icon: <LockIcon />, disabled: !editable, onSelect: () => irFicha(r, "cerrar") },
            ]}
          />
        )
      },
    },
  ]
  // Las cifras cuentan todo el PIAR y el docente solo ve lo de sus asignaturas (Regla 1).
  return access.veAvisoSinPiar ? columnas : columnas.filter((c) => c.id !== "ajustes" && c.id !== "pendientes")
}
