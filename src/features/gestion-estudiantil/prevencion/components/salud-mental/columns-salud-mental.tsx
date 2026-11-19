import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import type { SenalSMRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BadgeEstadoSenal, BadgeSeveridad } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/badges-senal"
import {
  ACCIONES_SALUD_MENTAL,
  type AccionSenalSM,
} from "@/features/gestion-estudiantil/prevencion/components/salud-mental/acciones-senal"
import { MenuAccionesSaludMental } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/menu-acciones-salud-mental"

interface ColumnasOpciones {
  /** Nombre de la sede por pk (la fila solo trae `fk_tsede`). */
  sedePorId: ReadonlyMap<number, string>
  onAccion: (fila: SenalSMRow, accion: AccionSenalSM) => void
}

// Todas las columnas (menos Acciones) llevan accessorKey/accessorFn y `meta.label`: así «Columnas visibles» las lista.
const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  // Encabezado plano: el backend no tiene parámetro de orden.
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/** Columnas de Salud mental (G.8.SAL.1): Fecha · Estudiante · Tipo de señal · Severidad · Estado; Sede y Grado/Grupo ocultas. */
export function buildColumnsSaludMental({ sedePorId, onAccion }: ColumnasOpciones): ColumnDef<SenalSMRow>[] {
  return [
    {
      ...columna("fecha", "Fecha"),
      accessorKey: "fecha",
      cell: ({ row }) => formatFecha(row.original.fecha),
    },
    {
      ...columna("estudiante", "Estudiante"),
      accessorKey: "estudiante_nombre",
      cell: ({ row }) => (
        <Button variant="link" size="sm" onClick={() => onAccion(row.original, "ver")}>
          {row.original.estudiante_nombre}
        </Button>
      ),
    },
    { ...columna("grado_grupo", "Grado/Grupo"), accessorKey: "grado_grupo" },
    {
      ...columna("sede", "Sede"),
      accessorFn: (f) => sedePorId.get(f.fk_tsede) ?? "—",
    },
    { ...columna("tipo", "Tipo de señal"), accessorKey: "tipo_nombre" },
    {
      ...columna("severidad", "Severidad"),
      accessorFn: (f) => f.severidad_nombre ?? "—",
      cell: ({ row }) => (
        <BadgeSeveridad valor={row.original.severidad_valor} nombre={row.original.severidad_nombre} />
      ),
    },
    {
      ...columna("estado", "Estado"),
      accessorKey: "estado_nombre",
      cell: ({ row }) => <BadgeEstadoSenal estado={row.original.estado} nombre={row.original.estado_nombre} />,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_SALUD_MENTAL),
      cell: ({ row }) => (
        <MenuAccionesSaludMental fila={row.original} onAccion={(accion) => onAccion(row.original, accion)} />
      ),
    },
  ]
}
