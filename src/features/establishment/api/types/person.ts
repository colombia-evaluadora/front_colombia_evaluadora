import type { CatalogItem } from "./catalog"
import type { Municipality } from "./location"

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

    address: string

    expeditionMunicipality: Municipality
}