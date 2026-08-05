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

import { useCatalogQuery } from "../../api/query/use-catalogs"
import type { CatalogItem } from "../../api/types/catalog"
import type { Employee } from "../../api/types/employee"

export interface EmployeeAdditionalInfoValue {
  employeeClass: CatalogItem
  educationLevel: CatalogItem
  grade: CatalogItem
  highestEducationLevel: CatalogItem
  fundingSource: CatalogItem
  functionalPosition: CatalogItem
  employmentType: CatalogItem
  address: string
}

interface EmployeeAdditionalInfoFormProps {
  value: EmployeeAdditionalInfoValue
  onChange: (value: EmployeeAdditionalInfoValue) => void
}

function pickOption(
  options: CatalogItem[],
  selectedId: string,
  fallback: CatalogItem
) {
  return options.find((option) => option.id === selectedId) ?? fallback
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

export function EmployeeAdditionalInfoForm({ value, onChange }: EmployeeAdditionalInfoFormProps) {
  const { data: employeeClasses = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYEE_CLASSES)
  const { data: educationLevels = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EDUCATION_LEVELS)
  const { data: grades = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYEE_GRADES)
  const { data: fundingSources = [] } = useCatalogQuery<CatalogItem>(CATALOGS.FUNDING_SOURCES)
  const { data: functionalPositions = [] } = useCatalogQuery<CatalogItem>(CATALOGS.FUNCTIONAL_POSITIONS)
  const { data: employmentTypes = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYMENT_TYPES)

  const employeeClassItems = employeeClasses.map((item) => ({ value: item.id, label: item.name }))
  const educationLevelItems = educationLevels.map((item) => ({ value: item.id, label: item.name }))
  const gradeItems = grades.map((item) => ({ value: item.id, label: item.name }))
  const fundingSourceItems = fundingSources.map((item) => ({ value: item.id, label: item.name }))
  const functionalPositionItems = functionalPositions.map((item) => ({ value: item.id, label: item.name }))
  const employmentTypeItems = employmentTypes.map((item) => ({ value: item.id, label: item.name }))

  const patch = (partial: Partial<EmployeeAdditionalInfoValue>) => {
    onChange({ ...value, ...partial })
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="employee-class">Clase de funcionario</FieldLabel>
        <Select
          id="employee-class"
          value={value.employeeClass.id}
          onValueChange={(selectedValue) => {
            const safeValue = selectedValue ?? ""
            patch({
              employeeClass: pickOption(employeeClasses, safeValue, {
                id: safeValue,
                code: safeValue,
                name: safeValue,
              }),
            })
          }}
          items={employeeClassItems}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {employeeClassItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="education-level">Nivel educativo de enseñanza</FieldLabel>
        <Select
          id="education-level"
          value={value.educationLevel.id}
          onValueChange={(selectedValue) => {
            const safeValue = selectedValue ?? ""
            patch({
              educationLevel: pickOption(educationLevels, safeValue, {
                id: safeValue,
                code: safeValue,
                name: safeValue,
              }),
            })
          }}
          items={educationLevelItems}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {educationLevelItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="employee-grade">Grado escalafón</FieldLabel>
        <Select
          id="employee-grade"
          value={value.grade.id}
          onValueChange={(selectedValue) => {
            const safeValue = selectedValue ?? ""
            patch({
              grade: pickOption(grades, safeValue, {
                id: safeValue,
                code: safeValue,
                name: safeValue,
              }),
            })
          }}
          items={gradeItems}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {gradeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="highest-education-level">Ultimo nivel educativo aprobado</FieldLabel>
        <Select
          id="highest-education-level"
          value={value.highestEducationLevel.id}
          onValueChange={(selectedValue) => {
            const safeValue = selectedValue ?? ""
            patch({
              highestEducationLevel: pickOption(educationLevels, safeValue, {
                id: safeValue,
                code: safeValue,
                name: safeValue,
              }),
            })
          }}
          items={educationLevelItems}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {educationLevelItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="funding-source">Fuente de recursos</FieldLabel>
        <Select
          id="funding-source"
          value={value.fundingSource.id}
          onValueChange={(selectedValue) => {
            const safeValue = selectedValue ?? ""
            patch({
              fundingSource: pickOption(fundingSources, safeValue, {
                id: safeValue,
                code: safeValue,
                name: safeValue,
              }),
            })
          }}
          items={fundingSourceItems}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {fundingSourceItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="functional-position">Cargo funcional</FieldLabel>
        <Select
          id="functional-position"
          value={value.functionalPosition.id}
          onValueChange={(selectedValue) => {
            const safeValue = selectedValue ?? ""
            patch({
              functionalPosition: pickOption(functionalPositions, safeValue, {
                id: safeValue,
                code: safeValue,
                name: safeValue,
              }),
            })
          }}
          items={functionalPositionItems}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {functionalPositionItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined">
        <FieldLabel htmlFor="employment-type">Tipo de vinculación</FieldLabel>
        <Select
          id="employment-type"
          value={value.employmentType.id}
          onValueChange={(selectedValue) => {
            const safeValue = selectedValue ?? ""
            patch({
              employmentType: pickOption(employmentTypes, safeValue, {
                id: safeValue,
                code: safeValue,
                name: safeValue,
              }),
            })
          }}
          items={employmentTypeItems}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {employmentTypeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined" className="md:col-span-2">
        <FieldLabel htmlFor="employee-address">Dirección</FieldLabel>
        <Input
          id="employee-address"
          value={value.address}
          onChange={(event) => patch({ address: event.target.value })}
          placeholder="Ingresar dirección"
        />
      </Field>
    </div>
  )
}
