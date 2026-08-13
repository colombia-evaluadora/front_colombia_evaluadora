import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"

import { ManageCampusDialog } from "../components/dialogs/dialog-manage-campus"
import { CampusesDataTable } from "../components/table/table-campuses"

export function CampusesPage() {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingCampusId, setEditingCampusId] = useState<string | null>(null)

  function openCreateDialog() {
    setEditingCampusId(null)
    setEditorOpen(true)
  }

  function openEditDialog(campusId: string) {
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
