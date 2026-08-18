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

// La card sobre la que se apoyan las pestañas tipo carpeta. Lleva su borde
// superior completo (así no queda hueco a la derecha de la última pestaña); las
// pestañas se montan encima y la activa lo tapa con su fondo. La esquina
// superior derecha va redondeada solo mientras las pestañas no lleguen al final
// del contenedor; cuando lo ocupan todo (data-tabs-filled) se cuadra para
// fundirse con la última pestaña.
// `max-h-[...] overflow-y-auto`: sin esto, una tabla larga dentro de la
// pestaña activa estiraba toda la página y el scroll se llevaba puesto el
// título, el acordeón de arriba y hasta la lista de pestañas. Con el alto
// acotado, el que scrollea es el panel — el resto de la pantalla queda fijo.
// El alto en sí depende de si el acordeón "Información general" está abierto
// arriba (deja menos lugar visible) o cerrado (deja más).
const PANEL_BASE =
  "overflow-y-auto rounded-b-lg rounded-tr-lg border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

interface EvaluationPeriodsSectionProps {
  jornada: Jornada
  // Acota los datos de cada tab al periodo editado / recién creado.
  academicPeriodId?: number
  // Si el acordeón "Información general del periodo" está abierto, hay menos
  // alto disponible antes del borde de la pantalla.
  accordionOpen?: boolean
}

export function EvaluationPeriodsSection({
  jornada,
  academicPeriodId,
  accordionOpen = false,
}: EvaluationPeriodsSectionProps) {
  const panel = cn(PANEL_BASE, accordionOpen ? "max-h-[42vh]" : "max-h-[60vh]")

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
