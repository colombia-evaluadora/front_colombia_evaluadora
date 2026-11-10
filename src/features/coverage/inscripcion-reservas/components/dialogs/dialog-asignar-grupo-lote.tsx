import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PersonAddIcon, XIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { required } from "@/lib/forms/messages"

import { useAsignarGrupoLote } from "@/features/coverage/inscripcion-reservas/api/mutations/acciones-reserva"
import { useGruposConCupoLoteQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-detalle-query"
import type { ReservaCupo } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"
import { Aviso } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const FORM_ID = "asignar-grupo-lote-form"
const schema = z.object({ grupoId: z.string().min(1, required("El grupo")) })

interface Props {
  open: boolean
  reservas: ReservaCupo[]
  onOpenChange: (open: boolean) => void
  /** Al terminar se limpia la selección de la tabla. */
  onDone: () => void
}

/**
 * Asignar grupo por lote (Sección 3.6): todas las reservas marcadas son
 * Reservadas del mismo grado y jornada; pasan a Matriculada en un solo paso.
 */
export function AsignarGrupoLoteDialog({ open, reservas, onOpenChange, onDone }: Props) {
  const ids = reservas.map((r) => r.id)
  const n = reservas.length
  const primera = reservas[0]
  const { data: grupos = [], isPending } = useGruposConCupoLoteQuery(ids, open)
  const asignar = useAsignarGrupoLote()

  const form = useAppForm({
    defaultValues: { grupoId: "" },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      try {
        await asignar.mutateAsync({ ids, grupoId: value.grupoId })
        toast.success(`Se asignó el grupo y se crearon ${n} matrículas en Cursando.`)
        form.reset()
        onOpenChange(false)
        onDone()
      } catch (e) {
        toast.error(getErrorMessage(e))
      }
    },
  })

  function cerrar() {
    if (asignar.isPending) return
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Asignar grupo — {n} estudiantes de {primera?.grado} · {primera?.sede} ·{" "}
            {primera?.jornada}
          </DialogTitle>
        </DialogHeader>
        <form
          id={FORM_ID}
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <form.AppField name="grupoId">
            {(f) => (
              <f.SelectField
                label="Grupo"
                required
                placeholder={
                  isPending ? "Cargando…" : grupos.length ? "Seleccionar" : "Sin grupos con cupo"
                }
                options={grupos.map((g) => ({
                  value: g.id,
                  label: `${g.codigo} · ${g.cuposDisponibles} cupos disponibles`,
                }))}
              />
            )}
          </form.AppField>
          <Aviso tono="info">
            Solo se muestran los grupos con cupo disponible para todas las reservas marcadas. En una
            reserva con cupo contratado, el grupo debe tener cupo contratado libre.
          </Aviso>
          <Aviso tono="info">
            {n === 1 ? "La reserva pasará" : `Las ${n} reservas pasarán`} a Matriculada y se crearán
            sus matrículas en Cursando. Se cargan las asignaturas obligatorias del plan de estudio;
            los datos de cada estudiante se revisan después en Matrícula.
          </Aviso>
          <p className="text-xs text-muted-foreground">
            Los campos marcados con * son obligatorios
          </p>
        </form>
        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={asignar.isPending} onClick={cerrar}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={asignar.isPending}>
            {asignar.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <PersonAddIcon data-icon="inline-start" />
            )}
            Asignar grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
