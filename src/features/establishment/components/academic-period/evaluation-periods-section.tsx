import type { ComponentType } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { TabEvaluationPeriods } from "./tabs/tab-evaluation-periods"
import { TabPromotionCriteria } from "./tabs/tab-promotion-criteria"
import { TabGrades } from "./tabs/tab-grades"
import { TabRatingScales } from "./tabs/tab-rating-scales"
import { TabAreaSubject } from "./tabs/tab-area-subject"
import { TabEvaluationCriteria } from "./tabs/tab-evaluation-criteria"
import { TabAcademicAssignments } from "./tabs/tab-academic-assignments"
import type { Jornada } from "./schedule/schedule-data"

const TABS: { value: string; label: string; Component: ComponentType<any> }[] = [
  { value: "evaluacion", label: "Periodos de evaluación", Component: TabEvaluationPeriods },
  { value: "promocion", label: "Criterios de promoción", Component: TabPromotionCriteria },
  { value: "grados", label: "Grados", Component: TabGrades },
  { value: "escalas", label: "Escalas de valoración", Component: TabRatingScales },
  { value: "area", label: "Área/asignatura", Component: TabAreaSubject },
  { value: "criterios", label: "Criterios de evaluación", Component: TabEvaluationCriteria },
  { value: "asignaciones", label: "Asignaciones académicas", Component: TabAcademicAssignments },
]

interface EvaluationPeriodsSectionProps {
  jornada: Jornada
}

export function EvaluationPeriodsSection({ jornada }: EvaluationPeriodsSectionProps) {
  return (
    <Tabs defaultValue="evaluacion" className="w-full">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {TABS.map(({ value, Component }) => (
        <TabsContent key={value} value={value} className="mt-4">
          {value === "grados" ? <TabGrades jornada={jornada} /> : <Component />}
        </TabsContent>
      ))}
    </Tabs>
  )
}
