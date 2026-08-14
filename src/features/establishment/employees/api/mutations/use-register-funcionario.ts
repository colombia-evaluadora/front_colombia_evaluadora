import { api } from "@/lib/api-client"

import type { Person } from "@/features/establishment/employees/api/types/person"

/**
 * Contrato real de POST /register/funcionario (auth-center, Java —
 * RegisterFuncionarioRequest/RegisterUsuarioRequest/RegisterResponse en
 * auth-center/src/main/java/com/co/eurekatic/auth/web/dto). Crea `public.users`
 * + TUSUARIO + TFUNCIONARIO (con FK_ESTABLECIMIENTO NULL, "pendiente de
 * enlazar") en una sola transacción — NO pasa por nuestro `query`, es un
 * endpoint del servicio de auth.
 *
 * `fn_fun_crear` (SQL, V51) ya soporta que la persona sea funcionario de
 * más de un EE: si el (tipo_documento, identificación) ya existe, reusa el
 * TUSUARIO y crea solo el TFUNCIONARIO nuevo, en vez de abortar. PERO este
 * endpoint sigue rechazando con 409 (`EmailAlreadyExistsException`) *antes*
 * de llegar a esa función si el `email` ya existe en `public.users` — ese
 * chequeo vive en Java (FuncionarioRegistrationService), fuera de alcance
 * acá. En la práctica: mismo documento + email distinto ya funciona de
 * punta a punta; mismo email todavía no (bloquea en Java).
 */
export interface RegisterFuncionarioResult {
  idUser: number
  pkTusuario: number
  pkFuncionario: number
  email: string
}

/**
 * `fkTmunicipioExpedicion` iba `@NotNull` en el DTO de Java aunque ya no lo
 * es en la base (FK_TMUNICIPIO_EXPEDICION dejó de ser NOT NULL) — se le
 * olvidó sacar la validación. Se omite acá (queda `undefined` en el JSON,
 * Jackson lo trata como ausente) hasta que se corrija del lado de Java;
 * mientras tanto el registro fallará con 400 en el backend real.
 */
function toRegisterFuncionarioRequest(person: Person) {
  const fullName = [person.firstName, person.middleName, person.lastName, person.secondLastName]
    .filter(Boolean)
    .join(" ")

  return {
    usuario: {
      email: person.email,
      fullName,
      password: person.password,
      identificacion: person.identification,
      primerNombre: person.firstName,
      primerApellido: person.lastName,
      fechaNacimiento: person.birthDate,
      fkTlvTipoDocumento: person.documentType?.id ?? null,
      fkTlvGenero: person.gender?.id ?? null,
      segundoNombre: person.middleName || undefined,
      segundoApellido: person.secondLastName || undefined,
      telefono: person.phone || undefined,
      // El front solo tiene un campo de correo; se manda igual como cuenta
      // (login) y como dato de contacto de TUSUARIO.
      correoElectronico: person.email || undefined,
    },
  }
}

export async function registerFuncionario(person: Person): Promise<RegisterFuncionarioResult> {
  return api.post("/register/funcionario", toRegisterFuncionarioRequest(person))
}

/**
 * Segundo paso del alta real: enlaza el TFUNCIONARIO pendiente (recién
 * creado por `registerFuncionario`, FK_ESTABLECIMIENTO NULL) al EE elegido
 * en el select. Sí pasa por nuestro `query`
 * (fn_fun_enlazar_establecimiento, V51) — ver
 * postgres/pending/step3_new_endpoints.sql.
 *
 * `fkEstablecimiento` es `number | null`: el select de EE solo se muestra
 * para super admin (el resto de roles no lo ve). Cuando es `null`, la
 * función SQL resuelve el EE sola contra el solicitante
 * (`fn_resolver_establecimiento_unico`, V50) — se sigue llamando siempre,
 * nunca se omite la llamada.
 */
export async function enlazarFuncionarioEstablecimiento(
  fkUsuario: number,
  fkEstablecimiento: number | null,
): Promise<{ pkFuncionarioEnlazado: number }> {
  return api.post("/funcionario/enlazar-establecimiento", {
    fkUsuario,
    fkEstablecimiento,
  })
}
