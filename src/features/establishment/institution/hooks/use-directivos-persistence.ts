import { useRef } from "react"

import { env } from "@/config/env"
import { getErrorMessage, isConflictError } from "@/lib/api-client"
import { toEmailInput } from "@/lib/text-input"
import { useCreateWithPerson } from "@/features/establishment/employees/api/mutations/use-create-with-person"
import {
  cancelarFuncionarioPendiente,
  registerFuncionario,
} from "@/features/establishment/employees/api/mutations/use-register-funcionario"
import { resendActivation } from "@/features/establishment/employees/api/mutations/use-resend-activation"
import { update as updateFuncionario } from "@/features/establishment/employees/api/mutations/update"
import {
  correoCambio,
  reactivarPorCambioDeCorreo,
} from "@/features/establishment/employees/api/mutations/use-reactivar-por-cambio-de-correo"
import type { Employee } from "@/features/establishment/employees/api/types/employee"
import { personDataChangedSinceMatch, type Person } from "@/features/establishment/employees/api/types/person"

type Notify = (message: string, options?: { variant?: "error" | "warning" | "success" | "info" }) => void

export interface PendingInvitation {
  label: string
  correo: string
}

export interface PersistedPerson {
  person: Person
  /** Registrado en este submit; candidato a rollback si el EE falla. */
  pkFuncionarioRegistrado: number | null
  /** Correo a invitar tras guardar el EE; `null` si no hay a quién. */
  pendingInvitation: PendingInvitation | null
}

/** Catálogos en `null` = "no cambiar" para el COALESCE de `fn_fun_actualizar`; fallback si falta `existingEmployee`. */
export function createEmptyEmployeeShell(): Omit<Employee, "person"> {
  return {
    employeeClass: null,
    educationLevel: null,
    grade: null,
    highestEducationLevel: null,
    fundingSource: null,
    functionalPosition: null,
    employmentType: null,
    address: "",
    permissions: [],
    status: "ACTIVE",
  }
}

export function personHasAnyData(person: Person | null): boolean {
  if (!person) {
    return false
  }

  return Boolean(
    person.documentType?.id ||
      person.identification.trim() ||
      person.firstName.trim() ||
      person.lastName.trim() ||
      person.middleName?.trim() ||
      person.secondLastName?.trim() ||
      person.birthDate.trim() ||
      person.gender?.id ||
      person.email.trim() ||
      person.phone.trim()
  )
}

/**
 * Rector y secretaria de un establecimiento que se guarda (alta, edición o una
 * sede convertida en establecimiento). Van antes del EE, porque el EE necesita
 * su PK; los registrados en el submit se cancelan si el EE falla (el EE aborta
 * su transacción entera), y la invitación de activación sale solo cuando el EE
 * se guardó. Así no quedan usuarios sueltos de un guardado que no terminó.
 */
export function useDirectivosPersistence(notify: Notify) {
  // Avisos de rector/secretaria que se muestran junto al éxito del EE.
  const activationNoticesRef = useRef<string[]>([])
  const activationFailedRef = useRef(false)
  const invitationWarningRef = useRef(false)
  // Funcionarios creados en este submit: se cancelan si algo falla después.
  const registradosRef = useRef<number[]>([])

  const createPersonMutation = useCreateWithPerson()

  /** Al empezar cada submit. */
  function reset() {
    activationNoticesRef.current = []
    activationFailedRef.current = false
    invitationWarningRef.current = false
    registradosRef.current = []
  }

  function takeActivationNotices() {
    const avisos = activationNoticesRef.current
    const variant: "error" | "warning" | undefined = activationFailedRef.current
      ? "error"
      : invitationWarningRef.current
        ? "warning"
        : undefined
    activationNoticesRef.current = []
    activationFailedRef.current = false
    invitationWarningRef.current = false
    return { avisos, variant }
  }

  /** Invita a rector/secretaria solo tras guardar el EE (si el EE falla, se cancelan sin correo).\n * Un 409 = cuenta ya activa, nada que avisar; otro fallo es warning reenviable desde Funcionarios. */
  async function enviarInvitacionesPendientes(pendientes: PendingInvitation[]) {
    for (const { label, correo } of pendientes) {
      try {
        await resendActivation(correo)
        activationNoticesRef.current.push(`${label}: se envió el correo de activación a ${correo}.`)
      } catch (error) {
        if (isConflictError(error)) continue
        activationNoticesRef.current.push(
          `${label}: no fue posible enviar el correo de activación; usa «Reenviar activación» en Funcionarios.`,
        )
        invitationWarningRef.current = true
      }
    }
  }

  /** Va antes del EE (se necesita su PK). Con `id`: PATCH reenviando el `Employee` para no pisarlo.\n * Sin `id`: registro; si se editó tras el match se encadena un PATCH (`fn_fun_crear` reusa el TUSUARIO). */
  async function persistPersonIfAny(
    person: Person | null,
    existingEmployee: Employee | null,
    label: string,
    /** Foto recién elegida; `null` en edición = conservar la guardada. */
    foto: File | null,
    /** `null` si no hubo match o el match traía `id`. */
    matchSnapshot: Partial<Person> | null,
  ): Promise<PersistedPerson | null> {
    if (!person || !personHasAnyData(person)) {
      return null
    }

    if (!env.ENABLE_API_MOCKING) {
      try {
        if (person.id) {
          // `fn_fun_actualizar` solo devuelve el PK: se devuelve el `person` enviado.
          await updateFuncionario(
            person.id,
            {
              ...(existingEmployee ?? createEmptyEmployeeShell()),
              person,
            },
            foto,
          )
          // Correo cambiado: se reactiva al nuevo; un fallo no deshace el guardado.
          const correoAnterior = existingEmployee?.person?.email
          if (correoCambio(correoAnterior, person.email)) {
            try {
              await reactivarPorCambioDeCorreo({
                correoAnterior: toEmailInput(correoAnterior ?? ""),
                correoNuevo: toEmailInput(person.email),
              })
              activationNoticesRef.current.push(
                `Se envió el correo de activación a ${toEmailInput(person.email)}.`,
              )
            } catch (error) {
              activationNoticesRef.current.push(
                `No fue posible enviar el correo de activación del ${label}: ${
                  getErrorMessage(error) || "error desconocido"
                }`,
              )
              activationFailedRef.current = true
            }
          }
          return { person, pkFuncionarioRegistrado: null, pendingInvitation: null }
        }

        // La invitación sale recién cuando el EE se guardó.
        const registered = await registerFuncionario(person, foto, { enviarInvitacion: false })
        registradosRef.current.push(registered.pkFuncionario)
        const persistedPerson = { ...person, id: registered.pkFuncionario }

        // `mensajeInvitacion` no nulo: el backend ya sabe que no se puede invitar.
        let pendingInvitation: PendingInvitation | null = null
        if (registered.mensajeInvitacion != null) {
          activationNoticesRef.current.push(`${label}: ${registered.mensajeInvitacion}`)
          invitationWarningRef.current = true
        } else {
          pendingInvitation = {
            label,
            correo: registered.email || toEmailInput(person.email),
          }
        }

        // `fn_fun_crear` reusó el TUSUARIO: las correcciones del form van por PATCH.
        if (matchSnapshot && personDataChangedSinceMatch(matchSnapshot, person)) {
          await updateFuncionario(
            registered.pkFuncionario,
            { ...createEmptyEmployeeShell(), person: persistedPerson },
            foto,
          )
        }

        return {
          person: persistedPerson,
          pkFuncionarioRegistrado: registered.pkFuncionario,
          pendingInvitation,
        }
      } catch (error) {
        // El mensaje útil viene en response.data, no en error.message de axios.
        notify(getErrorMessage(error) || `No fue posible guardar el ${label}.`, {
          variant: "error",
        })
        throw new Error(`person_persist_failed:${label}`)
      }
    }

    const result = await createPersonMutation.mutateAsync(person)

    if (result.status === "error") {
      notify(result.message || `No fue posible guardar el ${label}.`, { variant: "error" })
      throw new Error(`person_persist_failed:${label}`)
    }

    return { person: result.person, pkFuncionarioRegistrado: null, pendingInvitation: null }
  }

  /** Cancela lo registrado en este submit si algo falla después (el EE aborta su transacción entera). */
  async function cancelarPendientesRegistrados() {
    const pendientes = registradosRef.current
    if (pendientes.length === 0) return

    const results = await Promise.allSettled(
      pendientes.map((pk) => cancelarFuncionarioPendiente(pk)),
    )
    // Solo se avisa si el rollback falló.
    if (results.every((r) => r.status === "rejected")) {
      notify(
        "No fue posible deshacer el registro de rector/secretaria — puede haber quedado un registro a medias, contacta soporte.",
        { variant: "error" },
      )
    }
  }

  return {
    reset,
    takeActivationNotices,
    enviarInvitacionesPendientes,
    persistPersonIfAny,
    cancelarPendientesRegistrados,
  }
}
