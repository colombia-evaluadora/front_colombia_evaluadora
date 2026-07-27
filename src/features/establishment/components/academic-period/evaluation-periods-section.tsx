import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { TabEvaluationPeriods } from "./tabs/tab-evaluation-periods"
import { TabPromotionCriteria } from "./tabs/tab-promotion-criteria"
import { TabGrades } from "./tabs/tab-grades"
import { TabRatingScales } from "./tabs/tab-rating-scales"
import { TabAreaSubject } from "./tabs/tab-area-subject"
import { TabEvaluationCriteria } from "./tabs/tab-evaluation-criteria"
import { TabAcademicAssignments } from "./tabs/tab-academic-assignments"
import type { Jornada } from "./schedule/schedule-data"

const TABS: { value: string; label: string }[] = [
  { value: "evaluacion", label: "Periodos de evaluación" },
  { value: "promocion", label: "Criterios de promoción" },
  { value: "grados", label: "Grados" },
  { value: "escalas", label: "Escalas de valoración" },
  { value: "area", label: "Área/asignatura" },
  { value: "criterios", label: "Criterios de evaluación" },
  { value: "asignaciones", label: "Asignaciones académicas" },
]

interface EvaluationPeriodsSectionProps {
  jornada: Jornada
  // Acota los datos de cada tab al periodo editado / recién creado.
  academicPeriodId?: number
}

export function EvaluationPeriodsSection({
  jornada,
  academicPeriodId,
}: EvaluationPeriodsSectionProps) {
  return (
    <Tabs defaultValue="evaluacion">
      {/* Scrollable en móvil: las tabs se desplazan en vez de desbordar. */}
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="evaluacion">
        <TabEvaluationPeriods academicPeriodId={academicPeriodId} />
      </TabsContent>
      <TabsContent value="promocion">
        <TabPromotionCriteria academicPeriodId={academicPeriodId} />
      </TabsContent>
      <TabsContent value="grados">
        <TabGrades jornada={jornada} academicPeriodId={academicPeriodId} />
      </TabsContent>
      <TabsContent value="escalas">
        <TabRatingScales academicPeriodId={academicPeriodId} />
      </TabsContent>
      <TabsContent value="area">
        <TabAreaSubject academicPeriodId={academicPeriodId} />
      </TabsContent>
      <TabsContent value="criterios">
        <TabEvaluationCriteria academicPeriodId={academicPeriodId} />
      </TabsContent>
      <TabsContent value="asignaciones">
        <TabAcademicAssignments academicPeriodId={academicPeriodId} />
      </TabsContent>
    </Tabs>
  )
}
