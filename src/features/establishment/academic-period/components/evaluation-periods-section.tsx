import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

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
  "overflow-y-auto rounded-b-lg rounded-tr-lg border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

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
  // Antes 42vh/60vh dejaban espacio libre sin usar debajo de la tabla en la
  // mayoría de pantallas, obligando a scrollear antes de tiempo. Sigue
  // habiendo un tope (con contenido largo el scroll interno se mantiene),
  // pero ahora aprovecha más alto antes de necesitarlo. Con el acordeón
  // cerrado, 78vh sobrepasaba el alto real disponible bajo la barra
  // colapsada + el propio scroll interno del panel, forzando un doble scroll
  // (el de la página y el de `overflow-y-auto` acá abajo) — se baja a 64vh.
  const panel = cn(PANEL_BASE, accordionOpen ? "max-h-[58vh]" : "max-h-[64vh]")

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
