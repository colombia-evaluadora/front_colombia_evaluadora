import { useState } from "react"
import { useStore } from "@tanstack/react-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ControlPointIcon, FloppyDiskIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { parseDateValue } from "@/lib/date-value"
import { useAppForm } from "@/lib/forms"
import { required } from "@/lib/forms/messages"

import { useAsignarRol } from "@/features/establishment/employees/api/mutations/roles-funcionario"
import { useEmployeeRolesQuery } from "@/features/establishment/employees/api/query/use-employee-roles"
import { useSedesAsignablesQuery } from "@/features/establishment/employees/api/query/use-roles-funcionario"
import { useGuardedDialog } from "@/features/establishment/academic-period/hooks/use-guarded-dialog"
import { ROLES_NO_ASIGNABLES, primerDiaVigente } from "@/features/establishment/employees/utils/rol-asignado"

const FORM_ID = "asignar-rol-form"

interface AsignarRolValues {
  roleId: number | null
  campusId: number | null
  workScheduleId: number | null
  validUntil: string
}

const EMPTY: AsignarRolValues = { roleId: null, campusId: null, workScheduleId: null, validUntil: "" }

const schema = z.object({
  roleId: z.number({ error: required("El rol") }),
  campusId: z.number({ error: required("La sede educativa", { femenino: true }) }),
  workScheduleId: z.number({ error: required("La jornada", { femenino: true }) }),
  validUntil: z
    .string()
    .refine((v) => v === "" || (parseDateValue(v) ?? new Date(0)) >= primerDiaVigente(), "La fecha Vigente hasta debe ser posterior a hoy."),
})

interface DialogAsignarRolProps {
  funcionarioId: number
  establishmentId: number
  employeeName: string
}

/** "+ Asignar permisos": un rol por Sede y Jornada, con Vigente hasta opcional (Sección 4.2). */
export function DialogAsignarRol({ funcionarioId, establishmentId, employeeName }: DialogAsignarRolProps) {
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const asignar = useAsignarRol()
  const { data: roles = [] } = useEmployeeRolesQuery()
  const sedes = useSedesAsignablesQuery(establishmentId, open)

  const form = useAppForm({
    defaultValues: EMPTY,
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      try {
        await asignar.mutateAsync({
          funcionarioId,
          roleId: value.roleId as number,
          campusId: value.campusId as number,
          workScheduleId: value.workScheduleId as number,
          validUntil: value.validUntil,
        })
        notify(`Se asignó el rol ${roles.find((r) => r.id === value.roleId)?.name ?? ""} a ${employeeName}.`)
        cerrar()
      } catch (e) {
        setError({ id: Date.now(), message: getErrorMessage(e) })
      }
    },
  })

  function cerrar() {
    setOpen(false)
    setError(null)
    form.reset()
  }

  const { confirmDiscardOpen, requestClose, onOpenChange, discardDialogProps } = useGuardedDialog({
    isSaving: asignar.isPending,
    isDirty: () => JSON.stringify(form.state.values) !== JSON.stringify(EMPTY),
    onOpen: () => setOpen(true),
    onClose: cerrar,
  })

  const campusId = useStore(form.store, (s) => s.values.campusId)
  const pares = sedes.data ?? []
  const sedeOptions = [...new Map(pares.map((p) => [p.campusId, { value: p.campusId, label: p.campusName }])).values()]
  const jornadaOptions = pares
    .filter((p) => p.campusId === campusId)
    .map((p) => ({ value: p.workScheduleId, label: p.workScheduleName }))
  const roleOptions = roles
    .filter((r) => !ROLES_NO_ASIGNABLES.includes(r.code))
    .map((r) => ({ value: r.id, label: r.name }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button type="button" color="primary" size="sm" onClick={() => onOpenChange(true)}>
        <ControlPointIcon data-icon="inline-start" />
        Asignar permisos
      </Button>
      <DialogContent className="sm:max-w-lg" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>Asignar permisos</DialogTitle>
          <DialogDescription>
            Elija el rol de {employeeName} y la Sede y Jornada donde lo ejerce. Los permisos los da el rol; luego puede restringirlos.
          </DialogDescription>
        </DialogHeader>

        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        <form
          id={FORM_ID}
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
          className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <form.AppField name="roleId">
              {(f) => <f.SelectField label="Rol" required options={roleOptions} emptyValue={null} />}
            </form.AppField>
          </div>
          <form.AppField
            name="campusId"
            listeners={{ onChange: () => form.setFieldValue("workScheduleId", null) }}
          >
            {(f) => (
              <f.SelectField
                label="Sede educativa"
                required
                options={sedeOptions}
                emptyValue={null}
                description={!sedes.isPending && sedeOptions.length === 0 ? "No hay sedes activas donde pueda asignar roles." : undefined}
              />
            )}
          </form.AppField>
          <form.AppField name="workScheduleId">
            {(f) => (
              <f.SelectField
                label="Jornada"
                required
                options={jornadaOptions}
                emptyValue={null}
                disabled={campusId == null}
                placeholder={campusId == null ? "Elija la sede" : "Seleccione"}
              />
            )}
          </form.AppField>
          <div className="sm:col-span-2">
            <form.AppField name="validUntil">
              {(f) => <f.DateField label="Vigente hasta" minDate={primerDiaVigente()} description="Posterior a hoy. Vacía: el rol no vence." />}
            </form.AppField>
          </div>
        </form>

        <DialogFooter>
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button size="sm" type="submit" color="primary" form={FORM_ID} disabled={asignar.isPending} aria-busy={asignar.isPending}>
            {asignar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDiscardDialog {...discardDialogProps} />
    </Dialog>
  )
}
