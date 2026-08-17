import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATALOGS } from "@/lib/catalogs"

import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { Employee } from "@/features/establishment/employees/api/types/employee"

export interface EmployeeAdditionalInfoValue {
  employeeClass: CatalogItem | null
  educationLevel: CatalogItem | null
  grade: CatalogItem | null
  highestEducationLevel: CatalogItem | null
  fundingSource: CatalogItem | null
  functionalPosition: CatalogItem | null
  employmentType: CatalogItem | null
  address: string
}

interface EmployeeAdditionalInfoFormProps {
  value: EmployeeAdditionalInfoValue
  onChange: (value: EmployeeAdditionalInfoValue) => void
}

/** Resuelve el `CatalogItem` que matchea el id, o `null` si no está en el catálogo. */
function pickOption(options: CatalogItem[], selectedId: number): CatalogItem | null {
  return options.find((option) => option.id === selectedId) ?? null
}

export function createAdditionalInfoFromEmployee(employee: Employee): EmployeeAdditionalInfoValue {
  return {
    employeeClass: employee.employeeClass,
    educationLevel: employee.educationLevel,
    grade: employee.grade,
    highestEducationLevel: employee.highestEducationLevel,
    fundingSource: employee.fundingSource,
    functionalPosition: employee.functionalPosition,
    employmentType: employee.employmentType,
    address: employee.address,
  }
}

// Convierte `CatalogItem[]` al `Record<id, name>` que `Select` consume vía
// `items`. El `SelectItem` sigue iterando el array original para mantener el
// orden del backend; `items` solo resuelve el label del trigger.
function labelsMap(items: CatalogItem[]) {
  return Object.fromEntries(items.map((item) => [item.id, item.name]))
}

export function EmployeeAdditionalInfoForm({ value, onChange }: EmployeeAdditionalInfoFormProps) {
  const { data: employeeClasses = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYEE_CLASSES)
  const { data: educationLevels = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EDUCATION_LEVELS)
  // Categoría real distinta de `educationLevels` (ver CATALOG_CATEGORIAS en
  // use-catalogs.ts): "nivel educativo de enseñanza" vs "último nivel
  // educativo aprobado" no son el mismo catálogo en el backend real.
  const { data: highestEducationLevels = [] } = useCatalogQuery<CatalogItem>(
    CATALOGS.HIGHEST_EDUCATION_LEVELS,
  )
  const { data: grades = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYEE_GRADES)
  const { data: fundingSources = [] } = useCatalogQuery<CatalogItem>(CATALOGS.FUNDING_SOURCES)
  const { data: functionalPositions = [] } = useCatalogQuery<CatalogItem>(CATALOGS.FUNCTIONAL_POSITIONS)
  const { data: employmentTypes = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYMENT_TYPES)

  const employeeClassLabels = labelsMap(employeeClasses)
  const educationLevelLabels = labelsMap(educationLevels)
  const highestEducationLevelLabels = labelsMap(highestEducationLevels)
  const gradeLabels = labelsMap(grades)
  const fundingSourceLabels = labelsMap(fundingSources)
  const functionalPositionLabels = labelsMap(functionalPositions)
  const employmentTypeLabels = labelsMap(employmentTypes)

  const patch = (partial: Partial<EmployeeAdditionalInfoValue>) => {
    onChange({ ...value, ...partial })
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="employee-class">Clase de funcionario</FieldLabel>
        <Select
          id="employee-class"
          items={employeeClassLabels}
          value={value.employeeClass?.id ?? null}
          onValueChange={(selectedValue) => {
            if (selectedValue === null) return
            patch({ employeeClass: pickOption(employeeClasses, selectedValue) })
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {employeeClasses.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="education-level">Nivel educativo de enseñanza</FieldLabel>
        <Select
          id="education-level"
          items={educationLevelLabels}
          value={value.educationLevel?.id ?? null}
          onValueChange={(selectedValue) => {
            if (selectedValue === null) return
            patch({ educationLevel: pickOption(educationLevels, selectedValue) })
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {educationLevels.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="employee-grade">Grado escalafón</FieldLabel>
        <Select
          id="employee-grade"
          items={gradeLabels}
          value={value.grade?.id ?? null}
          onValueChange={(selectedValue) => {
            if (selectedValue === null) return
            patch({ grade: pickOption(grades, selectedValue) })
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {grades.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="highest-education-level">Ultimo nivel educativo aprobado</FieldLabel>
        <Select
          id="highest-education-level"
          items={highestEducationLevelLabels}
          value={value.highestEducationLevel?.id ?? null}
          onValueChange={(selectedValue) => {
            if (selectedValue === null) return
            patch({ highestEducationLevel: pickOption(highestEducationLevels, selectedValue) })
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {highestEducationLevels.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="funding-source">Fuente de recursos</FieldLabel>
        <Select
          id="funding-source"
          items={fundingSourceLabels}
          value={value.fundingSource?.id ?? null}
          onValueChange={(selectedValue) => {
            if (selectedValue === null) return
            patch({ fundingSource: pickOption(fundingSources, selectedValue) })
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {fundingSources.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="functional-position">Cargo funcional</FieldLabel>
        <Select
          id="functional-position"
          items={functionalPositionLabels}
          value={value.functionalPosition?.id ?? null}
          onValueChange={(selectedValue) => {
            if (selectedValue === null) return
            patch({ functionalPosition: pickOption(functionalPositions, selectedValue) })
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {functionalPositions.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="employment-type">Tipo de vinculación</FieldLabel>
        <Select
          id="employment-type"
          items={employmentTypeLabels}
          value={value.employmentType?.id ?? null}
          onValueChange={(selectedValue) => {
            if (selectedValue === null) return
            patch({ employmentType: pickOption(employmentTypes, selectedValue) })
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {employmentTypes.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined" className="md:col-span-2">
        <FieldLabel htmlFor="employee-address">Dirección</FieldLabel>
        <Input
          id="employee-address"
          size="sm"
          value={value.address}
          onChange={(event) => patch({ address: event.target.value })}
          placeholder="Agregar"
        />
      </Field>
    </div>
  )
}

