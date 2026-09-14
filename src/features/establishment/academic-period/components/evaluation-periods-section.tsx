import { lazy, Suspense } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SpinnerIcon } from "@/components/ui/icons"

import { NoticeProvider } from "@/components/notice/notice-context"
import type { Jornada } from "@/features/establishment/academic-period/components/schedule-data"

const TabEvaluationPeriods = lazy(() =>
  import("@/features/establishment/academic-period/components/tabs/tab-evaluation-periods").then(
    (m) => ({ default: m.TabEvaluationPeriods }),
  ),
)
const TabPromotionCriteria = lazy(() =>
  import("@/features/establishment/academic-period/components/tabs/tab-promotion-criteria").then(
    (m) => ({ default: m.TabPromotionCriteria }),
  ),
)
const TabRatingScales = lazy(() =>
  import("@/features/establishment/academic-period/components/tabs/tab-rating-scales").then(
    (m) => ({ default: m.TabRatingScales }),
  ),
)
const TabEvaluationCriteria = lazy(() =>
  import("@/features/establishment/academic-period/components/tabs/tab-evaluation-criteria").then(
    (m) => ({ default: m.TabEvaluationCriteria }),
  ),
)
const TabGrades = lazy(() =>
  import("@/features/establishment/academic-period/components/tabs/tab-grades").then((m) => ({
    default: m.TabGrades,
  })),
)
const TabAcademicAssignments = lazy(() =>
  import("@/features/establishment/academic-period/components/tabs/tab-academic-assignments").then(
    (m) => ({ default: m.TabAcademicAssignments }),
  ),
)

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-10 text-muted-foreground">
      <SpinnerIcon data-icon="inline-start" className="animate-spin" />
      Cargando…
    </div>
  )
}

const TABS: { value: string; label: string }[] = [
  { value: "evaluacion", label: "Periodos de evaluación" },
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
}

export function EvaluationPeriodsSection({
  jornada,
  academicPeriodId,
}: EvaluationPeriodsSectionProps) {
  const panel = PANEL_BASE

  return (
    <Tabs defaultValue="evaluacion">
      <TabsList variant="folder">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="evaluacion" className={panel}>
        <NoticeProvider>
          <Suspense fallback={<TabFallback />}>
            <TabEvaluationPeriods academicPeriodId={academicPeriodId} />
          </Suspense>
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="promocion" className={panel}>
        <NoticeProvider>
          <Suspense fallback={<TabFallback />}>
            <TabPromotionCriteria academicPeriodId={academicPeriodId} />
          </Suspense>
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="escalas" className={panel}>
        <NoticeProvider>
          <Suspense fallback={<TabFallback />}>
            <TabRatingScales academicPeriodId={academicPeriodId} />
          </Suspense>
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="criterios" className={panel}>
        <NoticeProvider>
          <Suspense fallback={<TabFallback />}>
            <TabEvaluationCriteria academicPeriodId={academicPeriodId} />
          </Suspense>
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="grados" className={panel}>
        <NoticeProvider>
          <Suspense fallback={<TabFallback />}>
            <TabGrades jornada={jornada} academicPeriodId={academicPeriodId} />
          </Suspense>
        </NoticeProvider>
      </TabsContent>
      <TabsContent value="asignaciones" className={panel}>
        <NoticeProvider>
          <Suspense fallback={<TabFallback />}>
            <TabAcademicAssignments academicPeriodId={academicPeriodId} />
          </Suspense>
        </NoticeProvider>
      </TabsContent>
    </Tabs>
  )
}
