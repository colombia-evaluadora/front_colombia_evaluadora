import * as React from "react"

import { useNotify } from "@/components/notice/notice-context"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PencilIcon, SpinnerIcon } from "@/components/ui/icons"

import { useAsistenciaEditarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-editar-mutation"
import type { AsistenciaQueryRow, TipoAsistencia } from "@/features/academic-management/asistencia/api/types/asistencia"

// Catálogo COMPLETO (1,2,3,5,6) -- a diferencia del selector de "Asistencia
// manual" (simplificado a 3 opciones para altas nuevas), acá se está
// editando un registro que ya puede tener un estado "justificado" (3/6): si
// el Select solo tuviera 1/2/5, una fila justificada no matchearía ningún
// item y el trigger quedaría en blanco.
const TIPO_OPTIONS_COMPLETO: { value: TipoAsistencia; label: string }[] = [
  { value: 1, label: "Asistió" },
  { value: 2, label: "No asistió" },
  { value: 3, label: "No asistió (justificado)" },
  { value: 5, label: "Llegó tarde" },
  { value: 6, label: "Llegó tarde (justificado)" },
]

interface EditarSeguimientoDialogProps {
  row: AsistenciaQueryRow
}

/** Editar UN registro de "Seguimiento" (PATCH /asistencias/:ID) — estado + observación. */
export function EditarSeguimientoDialog({ row }: EditarSeguimientoDialogProps) {
  const { notify } = useNotify()
  const [open, setOpen] = React.useState(false)
  const [tipo, setTipo] = React.useState(row.tipo_asistencia_valor.toString())
  const [observacion, setObservacion] = React.useState(row.observacion ?? "")

  const editar = useAsistenciaEditarMutation()

  // El diálogo reabre siempre con el valor actual de la fila -- si se editó
  // una vez y se vuelve a abrir, no debe arrastrar el borrador anterior.
  function handleOpenChange(next: boolean) {
    if (next) {
      setTipo(row.tipo_asistencia_valor.toString())
      setObservacion(row.observacion ?? "")
    }
    setOpen(next)
  }

  function handleGuardar() {
    const tipoNum = Number(tipo) as AsistenciaQueryRow["tipo_asistencia_valor"]
    const observacionTrim = observacion.trim()
    const teniaObservacion = (row.observacion ?? "").length > 0

    editar.mutate(
      {
        pkTasistencia: row.pk_tasistencia,
        body: {
          ...(tipoNum !== row.tipo_asistencia_valor && { TIPO_ASISTENCIA: tipoNum }),
          // Vacío y antes tenía algo -> limpiar explícito (un campo ausente
          // significa "no tocar", no "borrar" -- ver tipo `AsistenciaEditarRequest`).
          ...(observacionTrim === "" && teniaObservacion && { LIMPIAR_OBSERVACION: true }),
          ...(observacionTrim !== "" &&
            observacionTrim !== (row.observacion ?? "") && { OBSERVACION: observacionTrim }),
        },
      },
      {
        onSuccess: () => {
          notify("Registro actualizado.")
          setOpen(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="ghost" color="neutral" size="icon-xs" aria-label={`Editar registro de ${row.estudiante}`}>
            <PencilIcon />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar asistencia</DialogTitle>
          <DialogDescription>
            {row.estudiante} · {row.grupo} · {row.asignatura}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel>Tipo de asistencia</FieldLabel>
            <Select value={tipo} onValueChange={(value) => setTipo(value ?? "")}>
              <SelectTrigger variant="outlined">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS_COMPLETO.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Observación</FieldLabel>
            <Textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Sin observación"
              rows={3}
            />
          </Field>
        </div>

        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button size="sm" type="button" variant="ghost" />}>Cancelar</DialogClose>
          <Button
            size="sm"
            type="button"
            color="primary"
            disabled={editar.isPending}
            aria-busy={editar.isPending}
            onClick={handleGuardar}
          >
            {editar.isPending && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
