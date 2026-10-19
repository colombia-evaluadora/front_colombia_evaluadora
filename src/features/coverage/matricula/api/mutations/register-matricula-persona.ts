import Axios from "axios"

import { api } from "@/lib/api-client"

export interface RegisterMatriculaPersonaInput {
  documentTypeId: number
  documentNumber: string
  firstName: string
  secondName?: string
  lastName: string
  secondLastName?: string
  birthDate?: string
  genderId?: number
  phone?: string
  email?: string
}

export interface RegisterMatriculaPersonaResult {
  idUser: number
  pkTusuario: number
  pkFuncionario: number | null
  email: string
}

/**
 * Campos que `/register/usuario` exige de verdad (`@NotBlank`/`@NotNull` en
 * `RegisterUsuarioRequest` del auth-center) pero que el formulario de matrícula
 * trata como **opcionales**: `guardian-gender` y `guardian-contact-email` están
 * en `OPTIONAL_MATRICULA_FIELD_GETTERS`, así que sólo se piden si la config del
 * establecimiento los marca como requeridos.
 *
 * Sin ellos el POST responde un 400 de validación de Spring, cuyo cuerpo no
 * trae un `message` aprovechable — `getErrorMessage` cae a "Request failed with
 * status code 400". Para el usuario eso es indistinguible de "no pasó nada": al
 * sustituir al acudiente por una persona nueva, la creación fallaba, el
 * `catch` de `performSave` abortaba el guardado entero y al volver a entrar
 * seguía el acudiente anterior.
 *
 * Así que se comprueba antes de salir a la red, y se dice qué falta.
 */
function camposFaltantes(input: RegisterMatriculaPersonaInput): string[] {
  const faltan: string[] = []
  if (!input.documentTypeId) faltan.push("tipo de documento")
  if (!input.documentNumber?.trim()) faltan.push("número de documento")
  if (!input.firstName?.trim()) faltan.push("primer nombre")
  if (!input.lastName?.trim()) faltan.push("primer apellido")
  // El género es `@NotNull @Positive`: el negocio volvió a pedirlo obligatorio.
  if (!input.genderId) faltan.push("género")
  // El correo es la cuenta de acceso de la persona, no un dato de contacto:
  // `@NotBlank @Email`. No hay alta sin él.
  if (!input.email?.trim()) faltan.push("correo electrónico")
  return faltan
}

export function registerMatriculaPersona(
  input: RegisterMatriculaPersonaInput,
): Promise<RegisterMatriculaPersonaResult> {
  const faltan = camposFaltantes(input)
  if (faltan.length > 0) {
    return Promise.reject(
      new Error(
        `No se puede crear la cuenta de esta persona: falta ${faltan.join(", ")}. ` +
          "Son datos obligatorios para dar de alta a alguien que todavía no existe en el sistema.",
      ),
    )
  }

  const fullName = [input.firstName, input.secondName, input.lastName, input.secondLastName]
    .filter(Boolean)
    .join(" ")

  return (
    api.post("/auth/register/usuario", {
      email: input.email || undefined,
      fullName,
      password: `Eval-Col${input.documentNumber}`,
      identificacion: input.documentNumber,
      primerNombre: input.firstName,
      segundoNombre: input.secondName || undefined,
      primerApellido: input.lastName,
      segundoApellido: input.secondLastName || undefined,
      fechaNacimiento: input.birthDate || undefined,
      fkTlvTipoDocumento: input.documentTypeId,
      fkTlvGenero: input.genderId,
      telefono: input.phone || undefined,
      correoElectronico: input.email || undefined,
    }) as Promise<RegisterMatriculaPersonaResult>
  ).catch((error: unknown) => {
    // `/register/usuario` NO es un "crear o recuperar": si el correo ya está
    // tomado responde 409 y no devuelve la persona. Puede pasar aunque el
    // autocompletado por documento no la encontrara, porque son dos llaves
    // distintas — la misma persona registrada antes con otro documento, o un
    // correo reutilizado. El mensaje crudo no lo explica, así que se traduce.
    if (Axios.isAxiosError(error) && error.response?.status === 409) {
      throw new Error(
        `El correo "${input.email}" ya está registrado con otra cuenta, así que no se puede ` +
          "crear una nueva persona con él. Busque a esa persona por su documento, o use otro correo.",
      )
    }
    throw error
  })
}
