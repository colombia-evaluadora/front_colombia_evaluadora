import { lazy, Suspense, useState, type ReactNode, type RefObject } from "react"
import { useSearch } from "@tanstack/react-router"

import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import {
  PERIOD_TAB_TRIGGER,
  ScrollTabsList,
} from "@/features/establishment/academic-period/components/scroll-tabs-list"
import { SpinnerIcon } from "@/components/ui/icons"

import { NoticeProvider } from "@/components/notice/notice-context"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import type { EvaluationCriteriaHandle } from "@/features/establishment/academic-period/components/tabs/tab-evaluation-criteria"
import { plegarTexto } from "@/features/assistant/lib/campos-ui"
import { usePestanasAsistente } from "@/features/assistant/lib/registro-ui"
import type { Jornada } from "@/features/establishment/academic-period/utils/schedule-data"

const TabEvaluationPeriods = lazy(() =>
  import("@/features/establishment/academic-period/components/tabs/tab-evaluation-periods").then(
    (m) => ({ default: m.TabEvaluationPeriods }),
  ),
)
const TabAcademicCalendar = lazy(() =>
  import("@/features/establishment/academic-period/components/tabs/tab-academic-calendar").then(
    (m) => ({ default: m.TabAcademicCalendar }),
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
  { value: "general", label: "General" },
  { value: "evaluacion", label: "Períodos de evaluación" },
  { value: "calendario", label: "Calendario" },
  { value: "promocion", label: "Criterios de promoción" },
  { value: "criterios", label: "Criterios de evaluación" },
  { value: "escalas", label: "Escalas de valoración" },
  { value: "grados", label: "Grados" },
  { value: "asignaciones", label: "Asignaciones académicas" },
]

const PANEL_BASE = "pt-5"

interface EvaluationPeriodsSectionProps {
  jornada: Jornada
  academicPeriodId?: number
  /** Formulario "Información general del período": primera pestaña. */
  general: ReactNode
  /** Criterios de evaluación: el Guardar del encabezado también los guarda. */
  criteriaRef?: RefObject<EvaluationCriteriaHandle | null>
  onCriteriaDirtyChange?: (dirty: boolean) => void
}

export function EvaluationPeriodsSection({
  jornada,
  academicPeriodId,
  general,
  criteriaRef,
  onCriteriaDirtyChange,
}: EvaluationPeriodsSectionProps) {
  const panel = PANEL_BASE
  // Controlada (antes `defaultValue`) para que el asistente pueda abrir una
  // pestaña por su nombre visible (`ABRIR_PESTANA`).
  // `?tab=` abre una pestaña al llegar (p. ej. "grados" al volver de un grado).
  const { tab } = useSearch({ strict: false }) as { tab?: string }
  const [tabActiva, setTabActiva] = useState(() =>
    tab && academicPeriodId != null && TABS.some((t) => t.value === tab) ? tab : "general",
  )
  // Salir de Criterios con cambios sin guardar pide confirmar (descarta al aceptar).
  const [tabPendiente, setTabPendiente] = useState<string | null>(null)
  const cambiarTab = (value: string) => {
    if (tabActiva === "criterios" && value !== "criterios" && criteriaRef?.current?.isDirty()) {
      setTabPendiente(value)
      return
    }
    setTabActiva(value)
  }
  // Sin guardar el periodo, las demas pestañas no tienen a que colgarse.
  const sinPeriodo = academicPeriodId == null
  usePestanasAsistente({
    abrir: (pestana) => {
      const nombre = plegarTexto(pestana)
      const tab = TABS.find((t) => plegarTexto(t.label) === nombre || t.value === nombre)
      if (!tab) return false
      cambiarTab(tab.value)
      return true
    },
  })

  return (
    <>
      <Tabs value={tabActiva} onValueChange={(value) => cambiarTab(String(value))}>
        <ScrollTabsList>
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={sinPeriodo && tab.value !== "general"}
              className={PERIOD_TAB_TRIGGER}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </ScrollTabsList>
        <TabsContent value="general" keepMounted className={panel}>
          {general}
        </TabsContent>
        <TabsContent value="evaluacion" className={panel}>
          <NoticeProvider>
            <Suspense fallback={<TabFallback />}>
              <TabEvaluationPeriods academicPeriodId={academicPeriodId} />
            </Suspense>
          </NoticeProvider>
        </TabsContent>
        <TabsContent value="calendario" className={panel}>
          <NoticeProvider>
            <Suspense fallback={<TabFallback />}>
              <TabAcademicCalendar academicPeriodId={academicPeriodId} />
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
        {/* keepMounted: los cambios sin guardar siguen ahí al cambiar de pestaña y el Guardar de arriba los ve. */}
        <TabsContent value="criterios" className={panel} keepMounted>
          <NoticeProvider>
            <Suspense fallback={<TabFallback />}>
              <TabEvaluationCriteria
                ref={criteriaRef}
                academicPeriodId={academicPeriodId}
                onDirtyChange={onCriteriaDirtyChange}
              />
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
      <ConfirmDiscardDialog
        open={tabPendiente != null}
        onOpenChange={(open) => !open && setTabPendiente(null)}
        onConfirm={() => {
          criteriaRef?.current?.discard()
          setTabActiva(tabPendiente ?? tabActiva)
          setTabPendiente(null)
        }}
      />
    </>
  )
}
