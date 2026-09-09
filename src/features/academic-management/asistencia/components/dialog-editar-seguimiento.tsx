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
import { PencilIcon, SpinnerIcon } from "@/components/ui/icons"

import { useAsistenciaEditarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-editar-mutation"
import { useTipoAsistenciaCatalogQuery } from "@/features/academic-management/asistencia/api/query/use-tipo-asistencia-catalog-query"
import { nombreMateriaSeguimiento } from "@/features/academic-management/asistencia/api/ui-mappings"
import type { AsistenciaQueryRow } from "@/features/academic-management/asistencia/api/types/asistencia"

interface EditarSeguimientoDialogProps {
  row: AsistenciaQueryRow
}

/** Editar UN registro de "Seguimiento" (PATCH /asistencias/:ID) — solo el tipo de asistencia. */
export function EditarSeguimientoDialog({ row }: EditarSeguimientoDialogProps) {
  const { notify } = useNotify()
  const [open, setOpen] = React.useState(false)
  const [tipo, setTipo] = React.useState(row.tipo_asistencia_valor.toString())

  const editar = useAsistenciaEditarMutation()
  const { data: tipoOptions = [] } = useTipoAsistenciaCatalogQuery()

  // El diálogo reabre siempre con el valor actual de la fila -- si se editó
  // una vez y se vuelve a abrir, no debe arrastrar el borrador anterior.
  function handleOpenChange(next: boolean) {
    if (next) setTipo(row.tipo_asistencia_valor.toString())
    setOpen(next)
  }

  function handleGuardar() {
    const tipoNum = Number(tipo) as AsistenciaQueryRow["tipo_asistencia_valor"]

    editar.mutate(
      {
        pkTasistencia: row.pk_tasistencia,
        body: {
          ...(tipoNum !== row.tipo_asistencia_valor && { TIPO_ASISTENCIA: tipoNum }),
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
            {row.estudiante} · {row.grupo} · {nombreMateriaSeguimiento(row)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Tipo de asistencia</FieldLabel>
            <Select
              items={Object.fromEntries(tipoOptions.map((opt) => [opt.value.toString(), opt.label]))}
              value={tipo}
              onValueChange={(value) => setTipo(value ?? "")}
            >
              <SelectTrigger variant="outlined">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {tipoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
