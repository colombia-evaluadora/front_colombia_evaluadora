import { SelectItemsDialog } from "@/components/select-items-dialog"

import { useGeneralAreasQuery } from "@/features/establishment/academic-period/api/query/use-general-areas"

interface SelectGeneralAreasDialogProps {
  value: number[]
  onChange: (ids: number[]) => void
  id?: string
  invalid?: boolean
  placeholder?: string
}

/** Selector de áreas/dimensiones del catálogo general MEN — el mismo modal
 *  genérico (`SelectItemsDialog`) que también usa Criterios de promoción,
 *  acá alimentado con `useGeneralAreasQuery`. */
export function SelectGeneralAreasDialog({
  value,
  onChange,
  id,
  invalid,
  placeholder = "Seleccionar",
}: SelectGeneralAreasDialogProps) {
  const { data: areas = [] } = useGeneralAreasQuery()
  const items = areas.map((area) => ({ id: area.id, label: area.nombre }))

  return (
    <SelectItemsDialog
      items={items}
      value={value}
      onChange={onChange}
      id={id}
      invalid={invalid}
      placeholder={placeholder}
      dialogTitle="Seleccionar áreas o dimensiones"
      searchPlaceholder="Buscar área..."
      emptyMessage="No se encontraron áreas."
      selectedCountLabel={(count) => (count === 1 ? "1 área seleccionada" : `${count} áreas seleccionadas`)}
    />
  )
}
