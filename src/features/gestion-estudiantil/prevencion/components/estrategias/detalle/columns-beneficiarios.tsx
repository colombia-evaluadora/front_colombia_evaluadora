import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PersonRemoveIcon } from "@/components/ui/icons"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import type { BeneficiarioEstrategia } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BadgeMatricula } from "@/features/gestion-estudiantil/prevencion/components/estrategias/badge-estado-estrategia"

interface ColumnasOpciones {
  /** El historial del estudiante solo lo abre quien ve lo sensible. */
  puedeVerHistorial: boolean
  onVerHistorial: (fila: BeneficiarioEstrategia) => void
  onRetirar: (fila: BeneficiarioEstrategia) => void
}

// Todas las columnas (menos Acciones) llevan accessorKey/accessorFn y `meta.label`: así «Columnas visibles» las lista.
const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/** Columnas de los beneficiarios (G.8.EST.7): Estudiante · Grado/Grupo · Ingreso · Salida · Matrícula; Documento, Resultado y Motivo ocultas. */
export function buildColumnsBeneficiarios({
  puedeVerHistorial,
  onVerHistorial,
  onRetirar,
}: ColumnasOpciones): ColumnDef<BeneficiarioEstrategia>[] {
  return [
    {
      ...columna("estudiante", "Estudiante"),
      accessorKey: "estudiante_nombre",
      cell: ({ row }) => {
        const b = row.original
        return (
          <span className="flex flex-wrap items-baseline gap-x-2">
            {puedeVerHistorial ? (
              <Button variant="link" size="sm" onClick={() => onVerHistorial(b)}>
                {b.estudiante_nombre}
              </Button>
            ) : (
              <span>{b.estudiante_nombre}</span>
            )}
            {b.origen_plan && <span className="text-xs text-muted-foreground">· desde su plan de acompañamiento</span>}
          </span>
        )
      },
    },
    { ...columna("documento", "Documento"), accessorKey: "estudiante_documento" },
    { ...columna("grado_grupo", "Grado/Grupo"), accessorKey: "grado_grupo" },
    {
      ...columna("ingreso", "Fecha de ingreso"),
      accessorFn: (b) => formatFecha(b.fecha_ingreso),
    },
    {
      ...columna("salida", "Fecha de salida"),
      accessorFn: (b) => formatFecha(b.fecha_salida) || "—",
    },
    {
      ...columna("resultado", "Resultado de la salida"),
      accessorFn: (b) => b.resultado_salida_nombre ?? "—",
    },
    {
      ...columna("motivo", "Motivo de salida"),
      accessorFn: (b) => b.motivo_salida ?? "—",
    },
    {
      ...columna("matricula", "Matrícula"),
      accessorFn: (b) => b.matricula_estado_nombre ?? "—",
      cell: ({ row }) => (
        <BadgeMatricula valor={row.original.matricula_estado_valor} nombre={row.original.matricula_estado_nombre} />
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(1),
      cell: ({ row }) => {
        const b = row.original
        // Quien ya salió queda en el historial de la estrategia: se marca, no se vuelve a retirar.
        if (b.fecha_salida)
          return (
            <Badge variant="soft" color="muted">
              <span>Retirada</span>
            </Badge>
          )
        return (
          <AccionesFila
            etiqueta={`Acciones del beneficiario ${b.estudiante_nombre}`}
            acciones={[
              {
                id: "retirar",
                label: "Retirar",
                icon: <PersonRemoveIcon />,
                disabled: !b.puede_retirar,
                onSelect: () => onRetirar(b),
              },
            ]}
          />
        )
      },
    },
  ]
}
