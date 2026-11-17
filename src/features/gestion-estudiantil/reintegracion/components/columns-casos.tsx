import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"

import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import type { CasoRow } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { ACCIONES_CASO, type AccionCaso } from "@/features/gestion-estudiantil/reintegracion/components/acciones-caso"
import { BadgesEstadoCaso } from "@/features/gestion-estudiantil/reintegracion/components/badges-caso"
import { MenuAccionesCaso } from "@/features/gestion-estudiantil/reintegracion/components/menu-acciones-caso"

interface ColumnasOpciones {
  onAccion: (fila: CasoRow, accion: AccionCaso) => void
}

// Todas las columnas (menos Acciones) llevan accessorKey/accessorFn y `meta.label`: así «Columnas visibles» las lista.
const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  // Encabezado plano: el backend no tiene parámetro de orden.
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/**
 * Columnas de la bandeja (G.9.BAN.1): Estudiante · Grado/Grupo · Origen · Fecha de apertura · Profesional de
 * trabajo social · Estado · Alta complejidad · Días en el estado; Sede y Jornada ocultas.
 */
export function buildColumnsCasos({ onAccion }: ColumnasOpciones): ColumnDef<CasoRow>[] {
  return [
    {
      ...columna("estudiante", "Estudiante"),
      accessorFn: (f) => f.estudiante_nombre,
      cell: ({ row }) => (
        <div className="flex flex-col items-start">
          <Button variant="link" size="sm" onClick={() => onAccion(row.original, "ver")}>
            {row.original.estudiante_nombre}
          </Button>
          <span className="px-2 text-xs text-muted-foreground">{row.original.estudiante_documento}</span>
        </div>
      ),
    },
    { ...columna("grado_grupo", "Grado/Grupo"), accessorKey: "grado_grupo" },
    { ...columna("sede", "Sede"), accessorKey: "sede_nombre" },
    { ...columna("jornada", "Jornada"), accessorKey: "jornada_nombre" },
    { ...columna("origen", "Origen"), accessorKey: "origen_nombre" },
    {
      ...columna("fecha_apertura", "Fecha de apertura"),
      accessorKey: "fecha_apertura",
      cell: ({ row }) => formatFecha(row.original.fecha_apertura),
    },
    {
      ...columna("profesional", "Profesional de trabajo social"),
      accessorFn: (f) => (f.profesional_nombre ? abreviarPersona(f.profesional_nombre) : "Sin asignar"),
    },
    {
      ...columna("estado", "Estado"),
      accessorKey: "estado_etiqueta",
      cell: ({ row }) => (
        <BadgesEstadoCaso
          estado={row.original.estado}
          etiqueta={row.original.estado_etiqueta}
          pendienteValidacion={row.original.pendiente_validacion}
        />
      ),
    },
    {
      ...columna("alta_complejidad", "Alta complejidad"),
      accessorFn: (f) => (f.alta_complejidad ? "Sí" : "No"),
    },
    { ...columna("dias_en_estado", "Días en el estado"), accessorKey: "dias_en_estado" },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_CASO),
      cell: ({ row }) => <MenuAccionesCaso fila={row.original} onAccion={(accion) => onAccion(row.original, accion)} />,
    },
  ]
}
