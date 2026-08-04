import { useState } from "react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"

import { ManageCampusDialog } from "../components/dialogs/dialog-manage-campus"
import { CampusesDataTable } from "../components/table/campuses-table"

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
      {/* `overflow-visible`: el `overflow-hidden` del Card anularía el sticky
          del encabezado. */}
      <Card className="overflow-visible">
        <CampusesDataTable
          onEditCampus={openEditDialog}
          title="Sedes educativas"
          description="Lista de sedes con búsqueda, filtro por zona y nombre."
          action={
            <Button variant="fill" color="primary" size="sm" onClick={openCreateDialog}>
              <ControlPointIcon data-icon="inline-start" />
              Agregar
            </Button>
          }
        />
      </Card>

      <ManageCampusDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        campusId={editingCampusId}
      />
    </>
  )
}
