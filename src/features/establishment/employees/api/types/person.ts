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

    /**
     * `pk_tarchivo` de la foto de perfil ya guardada — `undefined`/`null` si
     * nunca se subió una. Solo de lectura (la llena el GET); nunca viaja de
     * vuelta al backend en un create/update, igual que `logoArchivoId` en
     * `EstablishmentDetails.basicInfo` — la foto NUEVA a subir es un `File`
     * aparte (`photo`/`onPhotoChange` en `UserDetailsForm`), no este campo.
     */
    photoArchivoId?: number | null
}
