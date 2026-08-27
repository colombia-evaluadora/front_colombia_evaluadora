import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { NoticeProvider } from "@/components/notice/notice-context"
import { TabEvaluationPeriods } from "@/features/establishment/academic-period/components/tabs/tab-evaluation-periods"
import { TabPromotionCriteria } from "@/features/establishment/academic-period/components/tabs/tab-promotion-criteria"
import { TabGrades } from "@/features/establishment/academic-period/components/tabs/tab-grades"
import { TabRatingScales } from "@/features/establishment/academic-period/components/tabs/tab-rating-scales"
import { TabAreaSubject } from "@/features/establishment/academic-period/components/tabs/tab-area-subject"
import { TabEvaluationCriteria } from "@/features/establishment/academic-period/components/tabs/tab-evaluation-criteria"
import { TabAcademicAssignments } from "@/features/establishment/academic-period/components/tabs/tab-academic-assignments"
import type { Jornada } from "@/features/establishment/academic-period/components/schedule-data"

const TABS: { value: string; label: string }[] = [
  { value: "evaluacion", label: "Periodos de evaluación" },
  { value: "area", label: "Área/asignatura" },
  { value: "promocion", label: "Criterios de promoción" },
  { value: "criterios", label: "Criterios de evaluación" },
  { value: "escalas", label: "Escalas de valoración" },
  { value: "grados", label: "Grados" },
  { value: "asignaciones", label: "Asignaciones académicas" },
]

const PANEL_BASE =
  "rounded-b-lg rounded-tr-lg border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

interface EvaluationPeriodsSectionProps {
  jornada: Jornada
  academicPeriodId?: number
  accordionOpen?: boolean
}

export function EvaluationPeriodsSection({
  jornada,
  academicPeriodId,
  accordionOpen = false,
}: EvaluationPeriodsSectionProps) {
  // TEMPORAL: se saca el `overflow-y-auto max-h-[…vh]` propio del panel para
  // probar si el "scroll fantasma" reportado (documentElement.scrollHeight
  // mucho mayor que el contenido real, ver conversación) desaparece dejando
  // que la página scrollee entera en vez de crear su propio contenedor de
  // scroll acá. Si se confirma, falta decidir un reemplazo definitivo (capar
  // por otro lado o rediseñar el layout) — esto no es la solución final.
  const panel = PANEL_BASE

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
      <TabsContent value="evaluacion" className={panel}>
        <NoticeProvider>
          <TabEvaluationPeriods academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="area" className={panel}>
        <NoticeProvider>
          <TabAreaSubject academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="promocion" className={panel}>
        <NoticeProvider>
          <TabPromotionCriteria academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="escalas" className={panel}>
        <NoticeProvider>
          <TabRatingScales academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="criterios" className={panel}>
        <NoticeProvider>
          <TabEvaluationCriteria academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="grados" className={panel}>
        <NoticeProvider>
          <TabGrades jornada={jornada} academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="asignaciones" className={panel}>
        <NoticeProvider>
          <TabAcademicAssignments academicPeriodId={academicPeriodId} />
        </NoticeProvider>
      </TabsContent>
    </Tabs>
  )
}
