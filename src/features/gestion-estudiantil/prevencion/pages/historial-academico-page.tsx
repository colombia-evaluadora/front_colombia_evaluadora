import { TableScreen } from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"

import { PantallaHistorialAcademico } from "@/features/gestion-estudiantil/prevencion/components/historial-academico/pantalla-historial-academico"

/** Historial académico de un estudiante (G.8.HIS.1-3): página de solo lectura, desde su expediente o su caracterización. */
export function HistorialAcademicoPage({ matricula }: { matricula: number }) {
  return (
    <NoticeProvider>
      <TableScreen>
        <PantallaHistorialAcademico matricula={matricula} />
      </TableScreen>
    </NoticeProvider>
  )
}
