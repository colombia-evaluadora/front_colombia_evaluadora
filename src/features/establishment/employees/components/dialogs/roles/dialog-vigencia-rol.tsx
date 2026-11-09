import { useState } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CalendarIcon, PlayCircleIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { parseDateValue } from "@/lib/date-value"
import { useAppForm } from "@/lib/forms"
import { required } from "@/lib/forms/messages"

import { useActivarRol, useProrrogarRol } from "@/features/establishment/employees/api/mutations/roles-funcionario"
import type { RolAsignado } from "@/features/establishment/employees/api/types/rol-asignado"
import { fechaCorta, primerDiaVigente, sedeJornada } from "@/features/establishment/employees/utils/rol-asignado"

const FORM_ID = "vigencia-rol-form"
const POSTERIOR_A_HOY = "La fecha Vigente hasta debe ser posterior a hoy."

interface DialogVigenciaRolProps {
  /** `prorrogar`: nueva fecha obligatoria. `activar`: rol vencido, nueva fecha o vacía (no vence). */
  accion: "prorrogar" | "activar"
  rol: RolAsignado | null
  employeeName: string
  onClose: () => void
}

/** Prorrogar un rol con vencimiento, o activar uno que venció (Regla 94). */
export function DialogVigenciaRol({ accion, rol, employeeName, onClose }: DialogVigenciaRolProps) {
  const prorrogar = useProrrogarRol()
  const activar = useActivarRol()
  const saving = prorrogar.isPending || activar.isPending
  return (
    <Dialog open={rol != null} onOpenChange={(open) => !open && !saving && onClose()}>
      {/* `key`: cada rol abre el formulario limpio. */}
      {rol ? (
        <VigenciaContent
          key={`${accion}-${rol.id}`}
          accion={accion}
          rol={rol}
          employeeName={employeeName}
          onClose={onClose}
          prorrogar={prorrogar}
          activar={activar}
        />
      ) : null}
    </Dialog>
  )
}

interface VigenciaContentProps extends DialogVigenciaRolProps {
  rol: RolAsignado
  prorrogar: ReturnType<typeof useProrrogarRol>
  activar: ReturnType<typeof useActivarRol>
}

function VigenciaContent({ accion, rol, employeeName, onClose, prorrogar, activar }: VigenciaContentProps) {
  const { notify } = useNotify()
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const saving = prorrogar.isPending || activar.isPending
  const esProrrogar = accion === "prorrogar"

  const schema = z.object({
    validUntil: z
      .string()
      .refine((v) => !esProrrogar || v !== "", required("La fecha Vigente hasta", { femenino: true }))
      .refine((v) => v === "" || (parseDateValue(v) ?? new Date(0)) >= primerDiaVigente(), POSTERIOR_A_HOY),
  })

  const form = useAppForm({
    defaultValues: { validUntil: "" },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      try {
        if (esProrrogar) {
          await prorrogar.mutateAsync({ asignacionId: rol.id, validUntil: value.validUntil })
          notify(`Se prorrogó el rol ${rol.roleName} hasta el ${fechaCorta(value.validUntil)}.`)
        } else {
          await activar.mutateAsync({ asignacionId: rol.id, changeValidity: true, validUntil: value.validUntil })
          notify(`Se activó el rol ${rol.roleName}.`)
        }
        onClose()
      } catch (e) {
        setError({ id: Date.now(), message: getErrorMessage(e) })
      }
    },
  })

  const vence = fechaCorta(rol.validUntil)
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {esProrrogar ? "Prorrogar" : "Activar"} el rol {rol.roleName}
        </DialogTitle>
        <DialogDescription>
          {esProrrogar
            ? `El rol ${rol.roleName} de ${employeeName} en ${sedeJornada(rol)} vence el ${vence}.`
            : `El rol ${rol.roleName} de ${employeeName} en ${sedeJornada(rol)} venció el ${vence}. Elija hasta cuándo queda activo o deje la fecha vacía para que no venza.`}
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
      >
        <form.AppField name="validUntil">
          {(f) => (
            <f.DateField
              label="Vigente hasta"
              required={esProrrogar}
              minDate={primerDiaVigente()}
              description={esProrrogar ? "Posterior a hoy." : "Posterior a hoy. Vacía: el rol no vence."}
            />
          )}
        </form.AppField>
      </form>

      <DialogFooter>
        <Button size="sm" type="button" variant="outline" color="neutral" onClick={onClose} disabled={saving}>
          <XIcon data-icon="inline-start" />
          Cancelar
        </Button>
        <Button size="sm" type="submit" color="primary" form={FORM_ID} disabled={saving} aria-busy={saving}>
          {saving ? (
            <SpinnerIcon data-icon="inline-start" className="animate-spin" />
          ) : esProrrogar ? (
            <CalendarIcon data-icon="inline-start" />
          ) : (
            <PlayCircleIcon data-icon="inline-start" />
          )}
          {esProrrogar ? "Prorrogar" : "Activar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
