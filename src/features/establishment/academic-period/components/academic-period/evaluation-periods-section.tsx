import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { NoticeProvider } from "@/components/notice/notice-context"
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

// La card sobre la que se apoyan las pestañas tipo carpeta. Sin borde superior:
// esa línea la dibuja el borde inferior de las pestañas, y la activa la borra.
const PANEL = "rounded-b-lg border border-t-0 bg-background p-4"

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
      {/* Sin scroll: las tabs se solapan y se encogen para entrar en una fila. */}
      <TabsList variant="folder">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="evaluacion" className={PANEL}>
        <NoticeProvider>
          <TabEvaluationPeriods academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="area" className={PANEL}>
        <NoticeProvider>
          <TabAreaSubject academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="promocion" className={PANEL}>
        <NoticeProvider>
          <TabPromotionCriteria academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="escalas" className={PANEL}>
        <NoticeProvider>
          <TabRatingScales academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="criterios" className={PANEL}>
        <NoticeProvider>
          <TabEvaluationCriteria academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="grados" className={PANEL}>
        <NoticeProvider>
          <TabGrades jornada={jornada} academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="asignaciones" className={PANEL}>
        <NoticeProvider>
          <TabAcademicAssignments academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
    </Tabs>
  )
}
