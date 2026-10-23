import { z } from "zod"

import {
  CORREO,
  MENSAJES,
  TELEFONO,
  validarFormatoPersona,
} from "@/features/establishment/shared/person-field-rules"
import {
  validarDireccion,
  validarIdentificacionAdministrativa,
  validarLugar,
  validarNombreEstablecimiento,
} from "@/features/establishment/shared/text-field-rules"
import { format } from "date-fns"
import { optionalImageFile } from "@/lib/image-file"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"
import type { Person } from "@/features/establishment/employees/api/types/person"

export interface EstablishmentFormValidationResult {
  /** Etiquetas de los campos que fallaron, en el orden en que se validan. */
  errors: string[]
  /** Rutas de los campos que fallaron (`basicInfo.name`, `principal.email`, …). */
  invalidFields: string[]
  /**
   * Mensaje a mostrar debajo de cada campo, indexado por su ruta. Es lo que
   * consumen los formularios; `errors` e `invalidFields` se derivan de acá.
   */
  fieldErrors: Record<string, string>
}

/** Texto obligatorio: se ignora el relleno de espacios. */
function requiredText(message: string) {
  return z
    .string()
    .transform((value) => value?.trim() ?? "")
    .refine((value) => value !== "", { message })
}

function requiredPattern(requiredMessage: string, regex: RegExp, formatMessage: string) {
  return z
    .string()
    .transform((value) => value?.trim() ?? "")
    .superRefine((value, ctx) => {
      if (value === "") {
        ctx.addIssue({ code: "custom", message: requiredMessage })
        return
      }
      if (!regex.test(value)) {
        ctx.addIssue({ code: "custom", message: formatMessage })
      }
    })
}

/** Campo de texto opcional, válido en blanco o si cumple `regex`. */
function optionalPattern(regex: RegExp, message: string) {
  return z.string().refine((value) => isBlank(value) || regex.test(value.trim()), { message })
}

/** Campo de texto opcional, válido en blanco o si `check` acepta el valor. */
function optionalCheck(check: (value: string) => boolean, message: string) {
  return z.string().refine((value) => isBlank(value) || check(value.trim()), { message })
}

/** Texto libre validado por una regla de `text-field-rules` (mensaje o `null`). */
function textRule(check: (value: string) => string | null) {
  return z.string().nullish().superRefine((value, ctx) => {
    const message = check(value ?? "")
    if (message) ctx.addIssue({ code: "custom", message })
  })
}

/** Lugar con forma de `CatalogItem` (barrio, comuna, localidad): se valida su `name`. */
function placeRule(field: string) {
  return z
    .object({ name: z.string().nullish() })
    .nullish()
    .superRefine((item, ctx) => {
      const message = validarLugar(item?.name ?? "", field)
      if (message) ctx.addIssue({ code: "custom", message })
    })
}

/**
 * Ítem de catálogo obligatorio. El `select` guarda el objeto completo, así
 * que lo que se exige es que tenga `id` — no `name`: en real, lo que carga
 * el detalle (`use-establishment.ts`) trae el `id` resuelto pero el `name`
 * queda vacío a propósito (la query no hace join contra el catálogo; el
 * `<Select>` resuelve la etiqueta visible contra el catálogo ya cargado,
 * por `id`, no leyendo `.name` del objeto). Validar por `.name` marcaba
 * como "vacío" un campo que en pantalla se veía bien seleccionado. El issue
 * queda en la ruta del ítem (`basicInfo.ownershipType`) y no en
 * `…ownershipType.name`, que es la ruta que el formulario usa para marcar
 * el campo.
 */
function requiredCatalogItem(message: string) {
  return z
    .object({ id: z.number().nullish() })
    .nullish()
    .refine((item) => item?.id != null, { message })
}

const establishmentSchema = z.object({
  basicInfo: z.object({
    name: requiredText("Ingresa el nombre del establecimiento.").superRefine((value, ctx) => {
      const message = validarNombreEstablecimiento(value)
      if (message) ctx.addIssue({ code: "custom", message })
    }),
    dane: requiredPattern(
      "Ingresa el código DANE.",
      /^\d{12}$/,
      "El código DANE debe tener 12 dígitos."
    ),
    nit: requiredPattern("Ingresa el NIT.", /^\d{6,9}-\d$/, "Ingresa un NIT válido."),
    ownershipType: requiredCatalogItem("Selecciona la propiedad jurídica."),
  }),
  address: z.object({
    municipality: requiredCatalogItem("Selecciona el municipio."),
    district: placeRule("El barrio"),
    address: textRule(validarDireccion),
    commune: placeRule("La comuna"),
    locality: placeRule("La localidad"),
  }),
  additionalInfo: z.object({
    approvalResolution: textRule((value) =>
      validarIdentificacionAdministrativa(value, "La resolución de aprobación"),
    ),
    licenseStatus: textRule((value) =>
      validarIdentificacionAdministrativa(value, "La licencia de funcionamiento"),
    ),
    // Fecha de expedición de la licencia: no puede ser posterior a hoy.
    licenseDate: z
      .string()
      .nullish()
      .refine((value) => isBlank(value) || (value ?? "").slice(0, 10) <= format(new Date(), "yyyy-MM-dd"), {
        message: "La fecha de la licencia no puede ser posterior a hoy.",
      }),
  }),
  contact: z.object({
    email: optionalPattern(CORREO, MENSAJES.correo),
    website: optionalCheck(
      (value) => z.string().url().safeParse(value).success,
      "Ingresa una página web válida (ej. https://ejemplo.com)."
    ),
    phone: optionalPattern(TELEFONO, MENSAJES.telefono),
  }),
})

/**
 * Archivos del formulario. No viven en `EstablishmentDetails` —son estado
 * aparte de la página, porque viajan como binarios del multipart y no como
 * JSON—, así que se validan por separado pero con el mismo `collect`: para
 * quien consume el resultado son campos como cualquier otro, con su ruta y
 * su mensaje.
 */
export interface EstablishmentFormFiles {
  /** Escudo elegido en el dropzone. `null` = ninguno (o, editando, conservar el actual). */
  logo?: File | null
  /** Foto elegida, por `fieldPrefix` de persona (`principal`, `secretary`). */
  photos?: Record<string, File | null>
}

/** Etiqueta para el resumen, por ruta de campo del establecimiento. */
const ESTABLISHMENT_LABELS: Record<string, string> = {
  "basicInfo.name": "Nombre del establecimiento",
  "basicInfo.dane": "Código DANE",
  "basicInfo.nit": "NIT",
  "basicInfo.ownershipType": "Propiedad jurídica",
  "address.municipality": "Municipio",
  "address.district": "Barrio",
  "address.address": "Dirección",
  "address.commune": "Comuna",
  "address.locality": "Localidad",
  "contact.email": "Correo electrónico",
  "contact.website": "Página web",
  "contact.phone": "Teléfono",
  "additionalInfo.approvalResolution": "Resolución de aprobación",
  "additionalInfo.licenseStatus": "Licencia de funcionamiento",
  "additionalInfo.licenseDate": "Fecha licencia",
}

const PERSON_LABELS: Record<string, string> = {
  documentType: "tipo de documento",
  identification: "número de documento",
  firstName: "primer nombre",
  middleName: "segundo nombre",
  lastName: "primer apellido",
  secondLastName: "segundo apellido",
  email: "correo electrónico",
  phone: "teléfono",
  gender: "género",
  birthDate: "fecha de nacimiento",
}

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === ""
}

/**
 * Una `Person` se considera "vacía" cuando los 4 campos mínimos están vacíos.
 * En ese caso no se exige nada (la persona puede no existir).
 */
function isPersonEmpty(person: Person | null): boolean {
  if (!person) {
    return true
  }

  return (
    isBlank(person.documentType?.name) &&
    isBlank(person.identification) &&
    isBlank(person.firstName) &&
    isBlank(person.lastName)
  )
}

/**
 * Persona con reglas condicionales, por eso va en un `superRefine` y no en un
 * `object` plano. `required` decide si la persona puede estar completamente
 * vacía (secretaria: puede no existir) o no (rector: obligatorio, sus 4
 * mínimos se exigen aunque el usuario no haya tocado nada).
 */
function makePersonSchema(required: boolean) {
  return z
    .object({
      person: z.custom<Person | null>(),
    })
    .superRefine(({ person }, ctx) => {
      if (!required && (!person || isPersonEmpty(person))) {
        return
      }

      // Rector obligatorio pero sin persona todavía (o vacía del todo):
      // se valida contra un objeto en blanco para que salgan los 4
      // mensajes de "obligatorio", en vez de no marcar nada.
      const p: Person = person ?? {
        documentType: null,
        identification: "",
        firstName: "",
        lastName: "",
        birthDate: "",
        gender: null,
        email: "",
        phone: "",
      }

      const require = (path: string, value: string | null | undefined, message: string) => {
        if (isBlank(value)) {
          ctx.addIssue({ code: "custom", path: [path], message })
        }
      }

      require("documentType", p.documentType?.name, "Selecciona el tipo de documento.")
      require("identification", p.identification, "Ingresa el número de documento.")
      require("firstName", p.firstName, "Ingresa el primer nombre.")
      require("lastName", p.lastName, "Ingresa el primer apellido.")

      // Formato de cada campo, no obligatoriedad: eso lo cubren los
      // `require` de arriba y abajo. Son las mismas reglas que funcionarios
      // —misma clase de persona, mismo backend— y por eso viven en un módulo
      // compartido: cuando cada pantalla tenía su copia, esta validaba el
      // correo y aquella no.
      validarFormatoPersona(p, ctx)

      /**
       * Persona SIN `id` todavía (nunca tuvo rector/secretaria enlazado, o
       * el GET no trajo uno): al guardar va a `POST /register/cval/funcionario`
       * (`RegisterUsuarioRequest`, auth-center), que exige `@NotBlank` en
       * `email` — es la cuenta del funcionario y a donde llega la invitación
       * de activación (sin contraseña: la define la persona al activar la
       * cuenta desde el correo). Persona CON `id` (ya existente) va a PATCH
       * `fn_fun_actualizar`, que tolera estos campos vacíos (COALESCE) — por
       * eso solo se exigen acá cuando todavía no existe.
       */
      if (!p.id) {
        require("email", p.email, "Ingresa el correo electrónico.")
        require("gender", p.gender?.name, "Selecciona el género.")
      }
    })
}

export interface EstablishmentFormValidationOptions {
  /**
   * `false` cuando el usuario no puede cambiar rector ni secretaria y el panel
   * está en solo lectura: no se guardan, así que no se validan. Si no, un dato
   * viejo que no cumple una regla nueva bloquearía el guardado en un campo que
   * nadie puede tocar.
   */
  validarDirectivos?: boolean
}

export function validateEstablishmentForm(
  values: EstablishmentDetails,
  files: EstablishmentFormFiles = {},
  { validarDirectivos = true }: EstablishmentFormValidationOptions = {}
): EstablishmentFormValidationResult {
  const errors: string[] = []
  const fieldErrors: Record<string, string> = {}

  // Primer mensaje por campo: el resto se descarta porque debajo del input solo
  // cabe una línea, y la primera regla que falla es la más específica.
  const collect = (path: string, message: string, label: string) => {
    if (fieldErrors[path] != null) {
      return
    }

    fieldErrors[path] = message
    errors.push(label)
  }

  const establishment = establishmentSchema.safeParse(values)
  if (!establishment.success) {
    // Se recorren las rutas conocidas y no `error.issues` para que el resumen
    // conserve el orden del formulario, sin depender del de Zod.
    for (const [path, label] of Object.entries(ESTABLISHMENT_LABELS)) {
      const issue = establishment.error.issues.find((item) => item.path.join(".") === path)
      if (issue) {
        collect(path, issue.message, label)
      }
    }
  }

  // El escudo se valida acá y no solo en el dropzone: es lo último antes de
  // armar el multipart, y es el único punto por el que pasan TODOS los
  // caminos que pueden dejar un `File` en el estado.
  const logo = optionalImageFile.safeParse(files.logo)
  if (!logo.success) {
    collect(
      "basicInfo.logo",
      logo.error.issues[0]?.message ?? "Archivo no válido.",
      "Escudo del establecimiento"
    )
  }

  const directivos = validarDirectivos
    ? ([
        ["principal", "Rector", true],
        ["secretary", "Secretaria", false],
      ] as const)
    : []

  for (const [fieldPrefix, label, required] of directivos) {
    const person = values[fieldPrefix]

    const photo = optionalImageFile.safeParse(files.photos?.[fieldPrefix])
    if (!photo.success) {
      collect(
        `${fieldPrefix}.photo`,
        photo.error.issues[0]?.message ?? "Archivo no válido.",
        `${label}: Foto`
      )
    }

    const result = makePersonSchema(required).safeParse({ person })

    if (result.success) {
      continue
    }

    for (const [field, fieldLabel] of Object.entries(PERSON_LABELS)) {
      const issue = result.error.issues.find((item) => item.path.join(".") === field)
      if (issue) {
        collect(`${fieldPrefix}.${field}`, issue.message, `${label}: ${fieldLabel}`)
      }
    }

    // Red de seguridad: recorrer PERSON_LABELS da el orden del formulario,
    // pero DESCARTA en silencio cualquier campo que no esté en el mapa. Así
    // estuvo el teléfono: la regla se evaluaba, el issue se creaba y nadie
    // lo mostraba. Lo que no tenga etiqueta se muestra igual, al final.
    for (const issue of result.error.issues) {
      const field = issue.path.join(".")
      if (field === "" || PERSON_LABELS[field] != null) {
        continue
      }
      collect(`${fieldPrefix}.${field}`, issue.message, `${label}: ${field}`)
    }
  }

  return {
    errors,
    invalidFields: Object.keys(fieldErrors),
    fieldErrors,
  }
}
