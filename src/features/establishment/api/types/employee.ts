import type { CatalogItem } from "./catalog"
import type { Person } from "./person"

export interface Employee {

    id: string

    person: Person

    employeeClass: CatalogItem

    position: CatalogItem

    employmentType: CatalogItem

    educationLevel: CatalogItem

    educationArea: CatalogItem

    fundingSource: CatalogItem

    administrativeCareer: CatalogItem

    hierarchicalLevel: CatalogItem

    workload: CatalogItem

    salaryType: CatalogItem

    startDate: string

    baseSalary: number

    threatened: boolean
}