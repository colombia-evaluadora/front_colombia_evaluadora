import type { CatalogItem } from "./catalog"

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

    confirmPassword: string
}