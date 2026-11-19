import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import type { CaracterizacionRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BadgeEstadoCaracterizacion } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/badge-estado-caracterizacion"
import {
  ACCIONES_CARACTERIZACION,
  MenuAccionesCaracterizacion,
  type AccionCaracterizacion,
} from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/menu-acciones-caracterizacion"

interface ColumnasOpciones {
  /** Nombre de la sede y de la jornada por pk (la fila solo trae los ids). */
  sedePorId: ReadonlyMap<number, string>
  jornadaPorId: ReadonlyMap<number, string>
  onAccion: (fila: CaracterizacionRow, accion: AccionCaracterizacion) => void
}

// Todas las columnas (menos Acciones) llevan accessorKey/accessorFn y `meta.label`: así «Columnas visibles» las lista.
const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  // Encabezado plano: el backend no tiene parámetro de orden.
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/** Columnas de Caracterización (G.8.CAR.1): Estudiante · Grado/Grupo · Personas · Estado · Fecha · Confirmada por; Sede y Jornada ocultas. */
export function buildColumnsCaracterizaciones({
  sedePorId,
  jornadaPorId,
  onAccion,
}: ColumnasOpciones): ColumnDef<CaracterizacionRow>[] {
  return [
    {
      ...columna("estudiante", "Estudiante"),
      accessorFn: (f) => `${f.estudiante_nombre} ${f.estudiante_documento ?? ""}`.trim(),
      cell: ({ row }) => (
        <div className="flex flex-col items-start">
          <Button variant="link" size="sm" onClick={() => onAccion(row.original, "ver")}>
            {row.original.estudiante_nombre}
          </Button>
          {row.original.estudiante_documento && (
            <span className="px-3 text-xs text-muted-foreground">{row.original.estudiante_documento}</span>
          )}
        </div>
      ),
    },
    { ...columna("grupo", "Grado/Grupo"), accessorKey: "grado_grupo" },
    { ...columna("sede", "Sede"), accessorFn: (f) => sedePorId.get(f.fk_tsede) ?? "—" },
    { ...columna("jornada", "Jornada"), accessorFn: (f) => jornadaPorId.get(f.fk_tlv_jornada) ?? "—" },
    {
      ...columna("personas", "Personas en el hogar"),
      accessorFn: (f) => f.personas_hogar ?? "—",
      cell: ({ row }) => <span className="tabular-nums">{row.original.personas_hogar ?? "—"}</span>,
    },
    {
      ...columna("estado", "Estado"),
      accessorKey: "estado_nombre",
      cell: ({ row }) => <BadgeEstadoCaracterizacion estado={row.original.estado} nombre={row.original.estado_nombre} />,
    },
    {
      ...columna("fecha", "Fecha de confirmación"),
      accessorFn: (f) => formatFecha(f.fecha_confirmacion) || "—",
    },
    { ...columna("confirmada_por", "Confirmada por"), accessorFn: (f) => f.confirmada_por ?? "—" },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_CARACTERIZACION),
      cell: ({ row }) => (
        <MenuAccionesCaracterizacion fila={row.original} onAccion={(accion) => onAccion(row.original, accion)} />
      ),
    },
  ]
}
