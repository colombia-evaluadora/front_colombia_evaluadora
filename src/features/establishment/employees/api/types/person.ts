import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

export interface Person {

    id: string

    documentType: CatalogItem

    identification: string

    firstName: string

    middleName?: string

    lastName: string

    secondLastName?: string

    birthDate: string

    gender: CatalogItem

    email: string

    phone: string

    password: string
}