import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { NoticeProvider } from "../common/notice-context"
import { TabEvaluationPeriods } from "../evaluation-periods/tabs/tab-evaluation-periods"
import { TabPromotionCriteria } from "../promotion-criteria/tabs/tab-promotion-criteria"
import { TabGrades } from "../grades/tabs/tab-grades"
import { TabRatingScales } from "../rating-scales/tabs/tab-rating-scales"
import { TabAreaSubject } from "../area-subjects/tabs/tab-area-subject"
import { TabEvaluationCriteria } from "../evaluation-criteria/tabs/tab-evaluation-criteria"
import { TabAcademicAssignments } from "../academic-assignments/tabs/tab-academic-assignments"
import type { Jornada } from "../schedule/schedule-data"

const TABS: { value: string; label: string }[] = [
  { value: "evaluacion", label: "Periodos de evaluación" },
  { value: "area", label: "Área/asignatura" },
  { value: "promocion", label: "Criterios de promoción" },
  { value: "criterios", label: "Criterios de evaluación" },
  { value: "escalas", label: "Escalas de valoración" },
  { value: "grados", label: "Grados" },
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
        <NoticeProvider>
          <TabEvaluationPeriods academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="area">
        <NoticeProvider>
          <TabAreaSubject academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="promocion">
        <NoticeProvider>
          <TabPromotionCriteria academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="escalas">
        <NoticeProvider>
          <TabRatingScales academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="criterios">
        <NoticeProvider>
          <TabEvaluationCriteria academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="grados">
        <NoticeProvider>
          <TabGrades jornada={jornada} academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="asignaciones">
        <NoticeProvider>
          <TabAcademicAssignments academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
    </Tabs>
  )
}
