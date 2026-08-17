import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

export interface Person {

    /** Ausente hasta que el backend lo asigna (POST /person). */
    id?: number

    /**
     * Catálogo referencial. Es `null` mientras la persona está sin asignar
     * (formularios vacíos, filtros sin selección) en lugar de un
     * `CatalogItem` con campos vacíos — el modelo distingue "elegí nada"
     * de "elegí algo que ahora no tengo".
     */
    documentType: CatalogItem | null

    identification: string

    firstName: string

    middleName?: string

    lastName: string

    secondLastName?: string

    birthDate: string

    gender: CatalogItem | null

    email: string

    phone: string

    password: string
}
