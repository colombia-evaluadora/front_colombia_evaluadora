import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import type { ActividadRow } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { ESTADO_ACTIVIDAD_COLOR } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/ui-mappings"
import {
  ACCIONES_ACTIVIDAD,
  MenuAccionesActividad,
  type AccionActividad,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/components/menu-acciones-actividad"

interface ColumnasOpciones {
  onAccion: (fila: ActividadRow, accion: AccionActividad) => void
}

// Todas las columnas (menos Acciones) llevan accessorKey/accessorFn y `meta.label`: así «Columnas visibles» las lista.
const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/** Columnas del listado (G.5.ACT.LIS): Nombre · Tipo · Responsable · Grados · Inscritos · Fechas · Estado; Sede y Jornada ocultas. */
export function buildColumnsActividades({ onAccion }: ColumnasOpciones): ColumnDef<ActividadRow>[] {
  return [
    {
      ...columna("nombre", "Nombre"),
      accessorKey: "nombre",
      cell: ({ row }) => (
        <Button variant="link" size="sm" onClick={() => onAccion(row.original, "ver")}>
          {row.original.nombre}
        </Button>
      ),
    },
    { ...columna("tipo", "Tipo"), accessorKey: "tipo_nombre" },
    { ...columna("responsable", "Responsable"), accessorFn: (f) => abreviarPersona(f.responsable_nombre) },
    { ...columna("grados", "Grados"), accessorFn: (f) => f.grados_texto ?? "" },
    {
      ...columna("inscritos", "Inscritos"),
      accessorFn: (f) => (f.cupo != null ? `${f.inscritos} de ${f.cupo}` : String(f.inscritos)),
    },
    {
      ...columna("fechas", "Fechas"),
      accessorFn: (f) => `${formatFecha(f.fecha_inicio)} a ${formatFecha(f.fecha_fin)}`,
    },
    {
      ...columna("estado", "Estado"),
      accessorFn: (f) => (f.esta_activa ? "Activa" : "Inactiva"),
      cell: ({ row }) => (
        <Badge variant="soft" color={ESTADO_ACTIVIDAD_COLOR[row.original.esta_activa ? "ACTIVA" : "INACTIVA"]}>
          <span>{row.original.esta_activa ? "Activa" : "Inactiva"}</span>
        </Badge>
      ),
    },
    { ...columna("sede", "Sede"), accessorKey: "sede_nombre" },
    { ...columna("jornada", "Jornada"), accessorKey: "jornada_nombre" },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_ACTIVIDAD),
      cell: ({ row }) => (
        <MenuAccionesActividad fila={row.original} onAccion={(accion) => onAccion(row.original, accion)} />
      ),
    },
  ]
}
