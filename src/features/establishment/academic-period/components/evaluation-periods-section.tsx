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

// La card sobre la que se apoyan las pestañas tipo carpeta. Lleva su borde
// superior completo (así no queda hueco a la derecha de la última pestaña); las
// pestañas se montan encima y la activa lo tapa con su fondo. La esquina
// superior derecha va redondeada solo mientras las pestañas no lleguen al final
// del contenedor; cuando lo ocupan todo (data-tabs-filled) se cuadra para
// fundirse con la última pestaña.
const PANEL =
  "rounded-b-lg rounded-tr-lg border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

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
