import { useNavigate, useParams } from "@tanstack/react-router"

import { NotFoundPage } from "@/components/layout/not-found-page"
import { TableScreen, TableScreenBody } from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"

import { useGradesQuery } from "@/features/establishment/academic-period/api/query/use-grades"
import { GradeScreen } from "@/features/establishment/academic-period/components/tabs/grade-screen"

// Página del grado (Sección 5.3): agregar (`grados/agregar`) o modificar
// (`grados/editar/$gradeId`) un grado del período, con Grupos, Plan de
// estudio y Criterios de promoción del grado debajo.
export function GradePage() {
  return (
    <NoticeProvider>
      <GradePageContent />
    </NoticeProvider>
  )
}

function GradePageContent() {
  const navigate = useNavigate()
  const { periodId, gradeId } = useParams({ strict: false }) as {
    periodId?: string
    gradeId?: string
  }
  const academicPeriodId = Number(periodId)
  const numericGradeId = gradeId != null ? Number(gradeId) : null

  const { data, isPending } = useGradesQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 200,
    academicPeriodId: Number.isFinite(academicPeriodId) ? academicPeriodId : undefined,
  })

  // "Grados ›" vuelve a la pestaña Grados del período.
  const backToGrades = () =>
    navigate({
      to: paths.app.periodosAcademicosEditar.getHref(academicPeriodId),
      search: { tab: "grados" },
    })

  if (
    !Number.isFinite(academicPeriodId) ||
    (numericGradeId != null && !Number.isFinite(numericGradeId))
  ) {
    return <NotFoundPage />
  }
  if (numericGradeId != null && !isPending && !data?.rows.some((g) => g.id === numericGradeId)) {
    return <NotFoundPage />
  }

  return (
    <TableScreen>
      {numericGradeId != null && isPending ? (
        <TableScreenBody>
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        </TableScreenBody>
      ) : (
        <GradeScreen
          key={numericGradeId ?? "new"}
          academicPeriodId={academicPeriodId}
          gradeId={numericGradeId}
          grades={data?.rows ?? []}
          onBack={backToGrades}
          onCreated={(id) =>
            navigate({
              to: paths.app.periodosGradoEditar.getHref(academicPeriodId, id),
              replace: true,
            })
          }
        />
      )}
    </TableScreen>
  )
}
