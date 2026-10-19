import { NoticeProvider } from "@/components/notice/notice-context"
import { CurricularReferencesDataTable } from "@/features/academic-management/curricular-references/components/table/table-curricular-references"

export function CurricularReferencesPage() {
  return (
    <NoticeProvider>
      <CurricularReferencesDataTable />
    </NoticeProvider>
  )
}
