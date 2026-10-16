import { SelectItemsDialog } from "@/components/select-items-dialog"

import { useAreasOficialesOpcionesQuery } from "@/features/administration/areas-oficiales/api/query/use-areas-oficiales-opciones-query"

interface SelectGeneralAreasDialogProps {
  value: number[]
  /** Las ya asociadas, con su nombre: pueden no estar entre las opciones. */
  selected: { id: number; name: string }[]
  onChange: (ids: number[]) => void
  id?: string
  invalid?: boolean
  placeholder?: string
}

/** Selector de áreas/dimensiones del catálogo de Áreas oficiales — el mismo
 *  modal genérico (`SelectItemsDialog`) que también usa Criterios de
 *  promoción. Ofrece solo las áreas ACTIVAS (`/catalogos/areas-oficiales`);
 *  las ya asociadas que se inactivaron (o filas viejas que apuntan a una
 *  asignatura del catálogo) se siguen mostrando para no perderlas al guardar. */
export function SelectGeneralAreasDialog({
  value,
  selected,
  onChange,
  id,
  invalid,
  placeholder = "Seleccionar",
}: SelectGeneralAreasDialogProps) {
  const { data: areas = [] } = useAreasOficialesOpcionesQuery()
  const ofrecidas = new Set(areas.map((area) => area.pkAreaOficial))
  const items = [
    ...areas.map((area) => ({ id: area.pkAreaOficial, label: area.nombre })),
    ...selected.filter((area) => !ofrecidas.has(area.id)).map((area) => ({ id: area.id, label: area.name })),
  ]

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
