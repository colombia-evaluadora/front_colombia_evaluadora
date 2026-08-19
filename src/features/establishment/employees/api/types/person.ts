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

    /**
     * `true` cuando el autocompletado por documento (`findPersonByDocument`)
     * encontró un `TUSUARIO` ya existente con ese tipo+número de documento.
     * A propósito NO es lo mismo que `id`: `id` en este tipo representa el
     * `PK_TFUNCIONARIO` (para decidir crear vs. actualizar un funcionario
     * puntual), pero el autocompletado solo confirma que existe la CUENTA
     * (`TUSUARIO`) — no hay forma de saber, solo con el documento, cuál
     * `TFUNCIONARIO` (si alguno) le corresponde a este establecimiento en
     * particular. Se usa exclusivamente para bloquear/eximir el campo de
     * contraseña en el formulario (ver `UserDetailsForm`): al guardar, el
     * backend igual reconoce y reutiliza la cuenta por documento/correo, así
     * que no hace falta (ni tiene sentido) pedir una contraseña nueva.
     */
    accountExists?: boolean
}
