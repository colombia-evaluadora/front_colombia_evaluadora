import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"

import { ManageCampusDialog } from "@/features/establishment/campuses/components/dialogs/dialog-manage"
import { CampusesDataTable } from "@/features/establishment/campuses/components/table/table-campuses"

export function CampusesPage() {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingCampusId, setEditingCampusId] = useState<number | null>(null)

  function openCreateDialog() {
    setEditingCampusId(null)
    setEditorOpen(true)
  }

  function openEditDialog(campusId: number) {
    setEditingCampusId(campusId)
    setEditorOpen(true)
  }

  return (
    <>
      <CampusesDataTable
        onEditCampus={openEditDialog}
        title="Sedes educativas"
        action={
          <Button variant="fill" color="primary" size="sm" onClick={openCreateDialog}>
            <ControlPointIcon data-icon="inline-start" />
            Agregar
          </Button>
        }
      />

      <ManageCampusDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        campusId={editingCampusId}
      />
    </>
  )
}
