import { useState } from "react"
import { FilePdfIcon, FileXlsIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import {
  CreateEvaluationPeriodDialog,
  type EvaluationPeriod,
} from "./dialog-create-evaluation-period"

const TABS = [
  { value: "evaluacion", label: "Periodos de evaluación" },
  { value: "promocion", label: "Criterios de promoción" },
  { value: "grados", label: "Grados" },
  { value: "escalas", label: "Escalas de valoración" },
  { value: "area", label: "Área/asignatura" },
  { value: "criterios", label: "Criterios de evaluación" },
  { value: "asignaciones", label: "Asignaciones académicas" },
] as const

const EVALUATION_COLUMNS = [
  "Código",
  "Nombre",
  "Abreviación",
  "Fecha inicio",
  "Fecha fin",
  "Peso porcentual",
  "Estado",
]

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

export function EvaluationPeriodsSection() {
  const [rows, setRows] = useState<EvaluationPeriod[]>([])

  return (
    <Tabs defaultValue="evaluacion" className="w-full">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="evaluacion" className="mt-4">
        <div className="rounded-lg border">
          <div className="flex items-center justify-between gap-2 border-b p-3">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Exportar a PDF"
                disabled
              >
                <FilePdfIcon className="text-destructive" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Exportar a Excel"
                disabled
              >
                <FileXlsIcon className="text-success" />
              </Button>
            </div>
            <CreateEvaluationPeriodDialog
              onCreate={(row) => setRows((prev) => [...prev, row])}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  {EVALUATION_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2 text-xs font-semibold tracking-wider uppercase"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={EVALUATION_COLUMNS.length}
                      className="text-muted-foreground px-4 py-10 text-center"
                    >
                      Aún no hay periodos de evaluación.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.codigo} className="border-b last:border-b-0">
                      <td className="px-4 py-2 font-medium">{row.codigo}</td>
                      <td className="px-4 py-2 font-semibold">{row.nombre}</td>
                      <td className="px-4 py-2">{row.abreviacion}</td>
                      <td className="px-4 py-2">{formatDate(row.startDate)}</td>
                      <td className="px-4 py-2">{formatDate(row.endDate)}</td>
                      <td className="px-4 py-2">{row.peso}%</td>
                      <td className="px-4 py-2">{row.estado}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </TabsContent>

      {TABS.filter((tab) => tab.value !== "evaluacion").map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-4">
          <div className="text-muted-foreground rounded-lg border p-10 text-center text-sm">
            Próximamente
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
