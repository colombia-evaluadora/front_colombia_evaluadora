import { useState } from "react"

import {
  CardAction,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "@/components/ui/icons"

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
      <Card>
        <CardHeader>
          <CardAction>
            <Button variant="fill" color="primary" size="sm" onClick={openCreateDialog}>
              <PlusIcon data-icon="inline-start" />
              Agregar
            </Button>
          </CardAction>
        <CardTitle>Funcionarios</CardTitle>
        <CardDescription>
          Lista de funcionarios con búsqueda, filtros por rol, jornada y estado, y paginación.
        </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeesDataTable onEditEmployee={openEditDialog} />
        </CardContent>
      </Card>

      <ManageEmployeeDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        employeeId={editingEmployeeId}
      />
    </>
  )
}