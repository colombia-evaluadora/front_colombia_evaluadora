import { useState } from "react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"

import { ManageEmployeeDialog } from "../components/dialogs/dialog-manage-employee"
import { EmployeesDataTable } from "../components/table/employees-table"

export function EmployeesPage() {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null)

  function openCreateDialog() {
    setEditingEmployeeId(null)
    setEditorOpen(true)
  }

  function openEditDialog(employeeId: string) {
    setEditingEmployeeId(employeeId)
    setEditorOpen(true)
  }

  return (
    <>
      {/* `overflow-visible`: el `overflow-hidden` del Card anularía el sticky
          del encabezado. */}
      <Card className="overflow-visible">
        <EmployeesDataTable
          onEditEmployee={openEditDialog}
          title="Funcionarios"
          description="Lista de funcionarios con búsqueda, filtros por rol, jornada y estado, y paginación."
          action={
            <Button variant="fill" color="primary" size="sm" onClick={openCreateDialog}>
              <ControlPointIcon data-icon="inline-start" />
              Agregar
            </Button>
          }
        />
      </Card>

      <ManageEmployeeDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        employeeId={editingEmployeeId}
      />
    </>
  )
}