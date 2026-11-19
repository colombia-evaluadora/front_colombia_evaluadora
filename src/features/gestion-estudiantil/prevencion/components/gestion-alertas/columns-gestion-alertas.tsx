import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { GestionAlertaRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import { ESTADO_GESTION_COLOR, UMBRAL_GESTION_COLOR } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import { MarcasGestion } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/marcas-gestion"
import {
  ACCIONES_GESTION,
  accionesGestion,
  type AccionGestion,
} from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/acciones-gestion"

const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/** Responsable abreviado; si no hay persona, su rol; Sin responsable va como marca. */
const responsable = (f: GestionAlertaRow) =>
  f.sin_responsable ? "Sin responsable" : abreviarPersona(f.responsable_nombre) || f.responsable_rol_nombre || "—"

/**
 * Columnas de Gestión de alertas (G.8.GAL.1): Estudiante · Grado/Grupo · Umbral · Responsable · Plazo · Estado ·
 * Marcas. Las filas con `resaltar` llevan el indicador al borde (junto al estudiante).
 */
export function buildColumnsGestionAlertas(
  onAccion: (fila: GestionAlertaRow, accion: AccionGestion) => void,
): ColumnDef<GestionAlertaRow>[] {
  return [
    {
      ...columna("estudiante", "Estudiante"),
      accessorKey: "estudiante_nombre",
      cell: ({ row }) => (
        <span
          className={row.original.resaltar ? "-ml-2 flex border-l-4 border-red pl-1" : "flex"}
          title={row.original.resaltar ? "Requiere su atención" : undefined}
        >
          <Button variant="link" size="sm" onClick={() => onAccion(row.original, "ver")}>
            {row.original.estudiante_nombre}
          </Button>
        </span>
      ),
    },
    { ...columna("grado_grupo", "Grado/Grupo"), accessorKey: "grado_grupo" },
    {
      ...columna("umbral", "Umbral"),
      accessorKey: "umbral_nombre",
      cell: ({ row }) => (
        <Badge variant="soft" color={UMBRAL_GESTION_COLOR[row.original.umbral]}>
          <span>{row.original.umbral_nombre}</span>
        </Badge>
      ),
    },
    { ...columna("responsable", "Responsable"), accessorFn: responsable },
    {
      ...columna("plazo", "Plazo"),
      accessorKey: "plazo",
      cell: ({ row }) => formatFecha(row.original.plazo) || "—",
    },
    {
      ...columna("estado", "Estado"),
      accessorKey: "estado_nombre",
      cell: ({ row }) => (
        <Badge variant="soft" color={ESTADO_GESTION_COLOR[row.original.estado]}>
          <span>{row.original.estado_nombre}</span>
        </Badge>
      ),
    },
    {
      ...columna("marcas", "Marcas"),
      accessorFn: (f) =>
        [f.vencida && "Vencida", f.sin_responsable && "Sin responsable", f.reincidente && "Reincidente", f.seguimiento_reforzado && "Seguimiento reforzado"]
          .filter(Boolean)
          .join(", "),
      cell: ({ row }) => <MarcasGestion f={row.original} />,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_GESTION),
      cell: ({ row }) => (
        <AccionesFila
          etiqueta={`Acciones de la gestión de ${row.original.estudiante_nombre}`}
          acciones={accionesGestion(row.original, (accion) => onAccion(row.original, accion))}
        />
      ),
    },
  ]
}
