import { Input } from "@/components/ui/input"
import { TableCell } from "@/components/ui/table"

import type { AreaSubjectItem } from "@/features/establishment/academic-period/api/types/area-subject"
import { ColorPickerPopover } from "@/features/establishment/academic-period/components/color-picker"
import { EspecialidadSelect } from "@/features/establishment/academic-period/components/especialidad-select"
import { SelectGeneralAreaDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-select-general-area"

// Borrador de una asignatura general. `asignaturaGeneral` se elige del mismo
// catálogo de áreas generales que el área padre.
export type SubjectDraft = {
  // Se conserva de `AreaSubjectItem.id` para poder diferenciar
  // alta/edición/baja al guardar; la UI no lo lee ni lo edita.
  id?: number
  asignaturaGeneral: string
  nombreInterno: string
  abreviacion: string
  ordenReportes: number
  color: string
  especialidad: string
}

export function emptyDraft(): SubjectDraft {
  return {
    asignaturaGeneral: "",
    nombreInterno: "",
    abreviacion: "",
    // El orden de reporte de la asignatura es independiente del orden del área,
    // por eso arranca en 1.
    ordenReportes: 1,
    color: "",
    especialidad: "",
  }
}

export function itemToDraft(item: AreaSubjectItem): SubjectDraft {
  return {
    id: item.id,
    asignaturaGeneral: item.asignaturaGeneral,
    nombreInterno: item.nombreInterno,
    abreviacion: item.abreviacion,
    ordenReportes: item.ordenReportes,
    color: item.color ?? "",
    especialidad: item.especialidad ?? "",
  }
}

interface SubjectRowFieldsProps {
  draft: SubjectDraft
  onPatch: (patch: Partial<SubjectDraft>) => void
  academicPeriodId?: number
}

// Celdas de datos de una asignatura general (orden, asignatura general, nombre
// interno, abreviación, color, especialidad). Las comparten la fila de alta y
// la de edición inline; cada fila agrega aparte su propia celda de acciones.
export function SubjectRowFields({
  draft,
  onPatch,
  academicPeriodId,
}: SubjectRowFieldsProps) {
  return (
    <>
      <TableCell>
        <Input
          aria-label="Orden en los reportes"
          type="number"
          min={0}
          placeholder="Agregar"
          className="w-20"
          value={Number.isNaN(draft.ordenReportes) ? "" : draft.ordenReportes}
          onChange={(e) => onPatch({ ordenReportes: e.target.valueAsNumber })}
        />
      </TableCell>
      <TableCell>
        <SelectGeneralAreaDialog
          value={draft.asignaturaGeneral}
          onChange={(value) => onPatch({ asignaturaGeneral: value })}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label="Nombre interno"
          placeholder="Agregar"
          value={draft.nombreInterno}
          onChange={(e) => onPatch({ nombreInterno: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label="Abreviación"
          placeholder="Agregar"
          value={draft.abreviacion}
          onChange={(e) => onPatch({ abreviacion: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <ColorPickerPopover value={draft.color} onChange={(hex) => onPatch({ color: hex })} />
      </TableCell>
      <TableCell>
        <EspecialidadSelect
          value={draft.especialidad}
          academicPeriodId={academicPeriodId}
          onChange={(value) => onPatch({ especialidad: value })}
        />
      </TableCell>
    </>
  )
}
