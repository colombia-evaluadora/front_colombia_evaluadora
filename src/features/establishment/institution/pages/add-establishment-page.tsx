import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import { useEffect, useState, type FormEvent } from "react"

import { Card, CardContent } from "@/components/ui/card"
import {
  TableScreen,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { CheckIcon } from "@/components/ui/icons"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

import { paths } from "@/config/paths"
import { env } from "@/config/env"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { EstablishmentDetailsForm } from "@/features/establishment/institution/components/forms/form-establishment"
import { ComplementaryDataFormSection } from "@/features/establishment/institution/components/forms/form-sections/complementary-data-section"
import { useCreateWithPerson } from "@/features/establishment/employees/api/mutations/use-create-with-person"
import {
  enlazarFuncionarioEstablecimiento,
  registerFuncionario,
} from "@/features/establishment/employees/api/mutations/use-register-funcionario"
import { update as updateFuncionario } from "@/features/establishment/employees/api/mutations/update"
import { useCreate } from "@/features/establishment/institution/api/mutations/use-create"
import { useUpdate } from "@/features/establishment/institution/api/mutations/use-update"
import { useEstablishmentQuery } from "@/features/establishment/institution/api/query/use-establishment"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"
import type { Employee } from "@/features/establishment/employees/api/types/employee"
import type { Person } from "@/features/establishment/employees/api/types/person"
import { UserDetailsForm } from "@/features/establishment/employees/components/forms/form-user-datails"
import { validateEstablishmentForm } from "@/features/establishment/institution/utils/validate-form"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"

/**
 * Solo para los acordeones de esta página: título más grande y el caret
 * (botón de abrir/cerrar) a la izquierda, antes del título. `flex-row-reverse`
 * + `justify-end` invierte el orden visual sin tocar el componente compartido.
 */
const accordionTriggerClassName =
  "flex-row-reverse justify-end items-center gap-3 py-2.5 text-lg **:data-[slot=accordion-trigger-icon]:ml-0 **:data-[slot=accordion-trigger-icon]:size-5"

/**
 * Las cards dentro de los acordeones ya viven en un contenedor con su propio
 * aire, así que el `py` de 8 de la Card se sentía enorme: lo bajamos a 5 sin
 * tocar el padding horizontal.
 */
const accordionCardClassName = "py-5"

/**
 * Fallback defensivo para `persistPersonIfAny`: solo se usa si `person.id`
 * viene poblado (persona existente) pero `existingEmployee` es `null` — no
 * debería pasar en la práctica (si hay `id` es porque `fetchEstablishment`
 * lo hidrató desde `fn_usu_empleado_buscar_por_pk`), pero evita mandar
 * `undefined` en los campos de empleo si algún día no fuera así. Catálogos
 * en `null` + `status: "ACTIVE"` + `permissions: []` == "no cambiar nada de
 * esto" según el COALESCE de `fn_fun_actualizar` (ver `update.ts`).
 */
function createEmptyEmployeeShell(): Omit<Employee, "person"> {
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

function createEmptyPerson(): Person {
  return {
    documentType: null,
    identification: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: null,
    email: "",
    phone: "",
    password: "",
  }
}

// Sin `id`: lo asigna el backend al crear (POST /establishments). El
// formulario de alta arranca sin ninguno, no con uno inventado en el cliente.
function createInitialEstablishmentValues(): EstablishmentDetails {
  return {
    basicInfo: {
      name: "",
      dane: "",
      nit: "",
      ownershipType: null,
    },
    address: {
      municipality: null,
      zone: null,
      district: null,
      commune: null,
      locality: null,
      address: "",
    },
    contact: {
      email: "",
      website: "",
      phone: "",
      fax: "",
    },
    additionalInfo: {
      approvalResolution: "",
      teachingLanguage: null,
      calendar: null,
      costRegime: null,
      populationGender: null,
      tuitionRange: null,
      disabilityType: null,
      operatingLicense: false,
      licenseStatus: "",
      licenseDate: null,
      ethnicAttention: false,
      giftedAttention: false,
      subsidy: false,
    },
    principal: createEmptyPerson(),
    secretary: createEmptyPerson(),
  }
}

export function AddEstablishmentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { notify } = useNotify()
  const establishmentIdParam = location.pathname.includes("/editar/")
    ? location.pathname.split("/editar/").at(1) ?? null
    : null
  // El segmento de ruta siempre llega como string; el `id` real del dominio
  // es number, así que se convierte una sola vez acá.
  const establishmentId = establishmentIdParam !== null ? Number(establishmentIdParam) : null
  const isEditMode = establishmentId !== null && !Number.isNaN(establishmentId)
  const [formValues, setFormValues] = useState<EstablishmentDetails>(createInitialEstablishmentValues)
  // Mensaje por campo, indexado por ruta (`basicInfo.name`, `principal.password`, …).
  // Escudo elegido en el dropzone. Vive acá y no en la sección del formulario
  // porque es esta página la que guarda: se manda como el archivo `logo` del
  // multipart, aparte del JSON. `null` = no se eligió ninguno, y en edición
  // eso significa conservar el que ya tiene.
  const [shield, setShield] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [invalidFields, setInvalidFields] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  // Confirmaciones de contraseña: estado de UI, no parte del modelo de negocio.
  const [confirmPasswords, setConfirmPasswords] = useState<Record<string, string>>({
    principal: "",
    secretary: "",
  })
  // Registro completo de TFUNCIONARIO (no solo `Person`) para rector y
  // secretaria, cuando el EE ya tenía uno enlazado — se necesita al guardar
  // para reenviar sus campos de empleo (clase, jornada, estado, dirección)
  // tal cual vinieron, sin pisarlos con `null` (ver `persistPersonIfAny`).
  // `null` en mock, o si el EE nunca tuvo uno asignado.
  const [principalEmployee, setPrincipalEmployee] = useState<Employee | null>(null)
  const [secretaryEmployee, setSecretaryEmployee] = useState<Employee | null>(null)

  const establishmentQuery = useEstablishmentQuery(establishmentId, isEditMode)

  useEffect(() => {
    if (!isEditMode) {
      setFormValues(createInitialEstablishmentValues())
      setFieldErrors({})
      setInvalidFields([])
      setHasSubmitted(false)
      setConfirmPasswords({ principal: "", secretary: "" })
      setPrincipalEmployee(null)
      setSecretaryEmployee(null)
      return
    }

    if (establishmentQuery.data?.status === "ok") {
      const existing = establishmentQuery.data.establishment
      setFormValues(existing)
      setFieldErrors({})
      setInvalidFields([])
      setHasSubmitted(false)
      setConfirmPasswords({
        principal: existing.principal?.password ?? "",
        secretary: existing.secretary?.password ?? "",
      })
      setPrincipalEmployee(establishmentQuery.data.principalEmployee)
      setSecretaryEmployee(establishmentQuery.data.secretaryEmployee)
    }
  }, [establishmentQuery.data, isEditMode])

  // Sin `onSuccess` acá: en real hay que enlazar rector/secretaria (si se
  // registraron de nuevo) DESPUÉS de crear el establecimiento y ANTES de
  // navegar — `handleSubmit` orquesta todo eso a mano tras `mutateAsync`.
  const createMutation = useCreate({
    mutationConfig: {
      onError: (error) => {
        notify(error.message || "No se pudo crear el establecimiento.", { variant: "error" })
      },
    },
  })

  const updateMutation = useUpdate({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.establishment.updated)
        navigate({ to: paths.app.establishments.general.getHref() })
      },
      onError: (error) => {
        notify(error.message || "No se pudo actualizar el establecimiento.", { variant: "error" })
      },
    },
  })

  const createPersonMutation = useCreateWithPerson()

  /**
   * Devuelve true si la persona ya trae al menos un dato capturado (la
   * consideramos "presente" y por tanto debe persistirse).
   */
  function personHasAnyData(person: Person | null, confirmPassword: string): boolean {
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
        person.phone.trim() ||
        person.password.trim() ||
        confirmPassword.trim()
    )
  }

  interface PersistedPerson {
    person: Person
    /**
     * PK_TFUNCIONARIO del funcionario recién REGISTRADO — solo cuando de
     * verdad se llamó a `/register/funcionario` acá (persona sin `id`
     * previo). Es lo que necesita `enlazarFuncionarioEstablecimiento` para
     * enlazarlo al EE (REV3: identifica el TFUNCIONARIO exacto por su PK).
     * `null` en mock, y también `null` cuando la persona ya existía y solo
     * se actualizó (`updateFuncionario`) — ya está enlazada, no hace falta
     * volver a enlazar.
     */
    pkFuncionarioToEnlazar: number | null
  }

  /**
   * Persiste rector/secretaria. En alta, se llama ANTES de crear el
   * establecimiento (hace falta su id para `p_fk_tfuncionario_rector`/
   * `secretaria`); en edición, el EE ya existe así que el orden no importa.
   *
   * - Mock: POST /person (como siempre) — `upsertPerson` ya distingue alta
   *   de actualización por la presencia de `person.id`.
   * - Real, persona NUEVA (`person.id` ausente — nunca hubo rector/secretaria
   *   o el GET no trajo uno): POST /register/funcionario (auth-center, Java)
   *   — crea TUSUARIO + TFUNCIONARIO con FK_ESTABLECIMIENTO NULL
   *   ("pendiente"). El enlace real al EE ocurre después (ver el bloque de
   *   `enlazarFuncionarioEstablecimiento` en `handleSubmit`).
   * - Real, persona EXISTENTE (`person.id` presente — vino del GET, ver
   *   `principalEmployee`/`secretaryEmployee`): PATCH
   *   `/establecimientos/funcionarios/:id` (`fn_fun_actualizar`, el mismo
   *   que usa el módulo de funcionarios) — ya está enlazado a este EE
   *   (`fk_tfuncionario_rector`/`secretaria` así lo confirma), no hace
   *   falta volver a registrar ni enlazar. Se reenvía el resto del
   *   `Employee` (`existingEmployee`) tal cual vino, para no pisar clase/
   *   jornada/estado/dirección con `null` — el form de establecimiento solo
   *   edita los campos de `Person`.
   */
  async function persistPersonIfAny(
    person: Person | null,
    existingEmployee: Employee | null,
    label: string,
    confirmPassword: string
  ): Promise<PersistedPerson | null> {
    if (!person || !personHasAnyData(person, confirmPassword)) {
      return null
    }

    if (!env.ENABLE_API_MOCKING) {
      try {
        if (person.id) {
          // `fn_fun_actualizar` (id_query=119) solo devuelve el PK
          // actualizado (`{rows:[{pk_funcionario_actualizado}]}`), no un
          // `Employee` completo — a diferencia del tipo de retorno de
          // `update()` (pensado para el mock, que sí devuelve `{status,
          // message, employee}`). El módulo de funcionarios ya convive con
          // esto (su propio `onSuccess` nunca lee `.employee`, ver
          // `dialog-manage.tsx`); acá tampoco hay que leerlo del response —
          // ya tenemos el `person` que se acaba de mandar, se devuelve tal
          // cual.
          await updateFuncionario(person.id, {
            ...(existingEmployee ?? createEmptyEmployeeShell()),
            person,
          })
          notify(`${label} actualizado.`)
          return { person, pkFuncionarioToEnlazar: null }
        }

        const registered = await registerFuncionario(person)
        notify(`${label} guardado.`)
        return {
          person: { ...person, id: registered.pkFuncionario },
          pkFuncionarioToEnlazar: registered.pkFuncionario,
        }
      } catch (error) {
        notify(
          error instanceof Error ? error.message : `No fue posible guardar el ${label}.`,
          { variant: "error" },
        )
        throw new Error(`person_persist_failed:${label}`)
      }
    }

    const result = await createPersonMutation.mutateAsync(person)

    if (result.status === "error") {
      notify(result.message || `No fue posible guardar el ${label}.`, { variant: "error" })
      throw new Error(`person_persist_failed:${label}`)
    }

    notify(`${label} guardado.`)
    return { person: result.person, pkFuncionarioToEnlazar: null }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setHasSubmitted(true)

    const validation = validateEstablishmentForm(formValues, confirmPasswords)
    setFieldErrors(validation.fieldErrors)
    setInvalidFields(validation.invalidFields)

    if (validation.errors.length > 0) {
      notify("Completa los campos obligatorios antes de guardar.", { variant: "error" })
      return
    }

    // Persistimos rector/secretaria antes del establecimiento para que
    // los `Person` queden con `id` en `personsDb` (mock) o con el
    // `pkFuncionario` que devolvió /register/funcionario (real, solo si
    // eran nuevos — si ya existían, `persistPersonIfAny` los actualiza en
    // el mismo paso y no hay nada que enlazar después).
    let nextPrincipal = formValues.principal
    let nextSecretary = formValues.secretary
    let principalPkFuncionario: number | null = null
    let secretaryPkFuncionario: number | null = null

    try {
      const persistedPrincipal = await persistPersonIfAny(
        nextPrincipal,
        principalEmployee,
        "Rector",
        confirmPasswords["principal"] ?? ""
      )
      if (persistedPrincipal) {
        nextPrincipal = persistedPrincipal.person
        principalPkFuncionario = persistedPrincipal.pkFuncionarioToEnlazar
      }

      const persistedSecretary = await persistPersonIfAny(
        nextSecretary,
        secretaryEmployee,
        "Secretaria",
        confirmPasswords["secretary"] ?? ""
      )
      if (persistedSecretary) {
        nextSecretary = persistedSecretary.person
        secretaryPkFuncionario = persistedSecretary.pkFuncionarioToEnlazar
      }
    } catch {
      return
    }

    const nextValues: EstablishmentDetails = {
      ...formValues,
      principal: nextPrincipal,
      secretary: nextSecretary,
    }

    /**
     * Enlaza al EE (ya con PK, sea recién creado o el que se está editando)
     * a cualquier rector/secretaria que se haya REGISTRADO de cero en este
     * submit (`pkFuncionarioToEnlazar` no nulo — los que ya existían y solo
     * se actualizaron no pasan por acá, ver `persistPersonIfAny`). Si esto
     * falla, el establecimiento YA existe/se guardó — se avisa aparte y el
     * enlace queda pendiente de resolver a mano.
     */
    async function enlazarNuevos(targetEstablishmentId: number) {
      try {
        if (principalPkFuncionario) {
          await enlazarFuncionarioEstablecimiento(principalPkFuncionario, targetEstablishmentId)
        }
        if (secretaryPkFuncionario) {
          await enlazarFuncionarioEstablecimiento(secretaryPkFuncionario, targetEstablishmentId)
        }
      } catch (error) {
        notify(
          error instanceof Error
            ? error.message
            : "El establecimiento se guardó, pero no fue posible enlazar a rector/secretaria.",
          { variant: "error" },
        )
      }
    }

    if (isEditMode && establishmentId) {
      // A diferencia del alta, acá el EE ya tiene PK desde el arranque —
      // no hace falta esperar a que el PATCH del establecimiento resuelva
      // para enlazar a los que se acaban de registrar (evita la carrera
      // contra el `navigate()` del `onSuccess` de `updateMutation`).
      await enlazarNuevos(establishmentId)
      await updateMutation.mutateAsync({
        establishmentId,
        values: { ...nextValues, id: establishmentId },
        logo: shield,
      })
      return
    }

    const result = await createMutation.mutateAsync({ values: nextValues, logo: shield })

    if (result.status === "error") {
      notify(result.message, { variant: "error" })
      return
    }

    const newEstablishmentId = result.establishment.id
    if (newEstablishmentId) {
      await enlazarNuevos(newEstablishmentId)
    }

    notify(SUCCESS_MESSAGES.establishment.created)
    navigate({ to: paths.app.establishments.general.getHref() })
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    /*
      El mismo andamiaje que las pantallas de listado: encabezado pegajoso,
      cuerpo que se estira hasta el borde inferior y —lo propio de un
      formulario— la barra de guardar pegada abajo.
    */
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button
              render={<Link to={paths.app.establishments.general.getHref()} />}
              variant="fill"
              color="neutral"
              size="sm"
              nativeButton={false}
            >
              Cerrar
            </Button>
          }
        >
          {isEditMode ? "Editar establecimiento educativo" : "Agregar establecimiento educativo"}
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      {/* Sin radio ni borde abajo: ahí se acopla la barra de acciones, que trae
          el suyo — si no, quedan dos líneas de 1px juntas. */}
      <TableScreenBody className="rounded-b-none border-b-0">
        {/* Sin resumen de errores arriba: cada mensaje vive debajo de su campo
            (`fieldErrors`), que es donde el usuario tiene que actuar. Del aviso
            general se encarga el `notify` del submit. */}
        <form id="create-establishment-form" onSubmit={handleSubmit}>
          <Accordion multiple defaultValue={["datos-establecimiento", "datos-rector-secretaria"]} keepMounted className="space-y-3">
            <AccordionItem value="datos-establecimiento" className="rounded-md border border-border not-last:border-b border">
              <AccordionTrigger className={accordionTriggerClassName}>Datos de establecimiento</AccordionTrigger>
              <AccordionContent>
                {/* Dos cards, igual que rector y secretaria: identificación,
                    domicilio y contacto describen al establecimiento y van
                    juntos; la información complementaria es un bloque aparte. */}
                <div className="space-y-4">
                  <Card className={accordionCardClassName}>
                    <CardContent>
                      <EstablishmentDetailsForm
                        value={formValues}
                        onChange={setFormValues}
                        invalidFields={invalidFields}
                        errors={fieldErrors}
                        showValidation={hasSubmitted}
                        shield={shield}
                        onShieldChange={setShield}
                      />
                    </CardContent>
                  </Card>
                  <Card className={accordionCardClassName}>
                    <CardContent>
                      <ComplementaryDataFormSection
                        value={formValues.additionalInfo}
                        onChange={(additionalInfo) =>
                          setFormValues((current) => ({ ...current, additionalInfo }))
                        }
                        invalidFields={invalidFields}
                        errors={fieldErrors}
                        showValidation={hasSubmitted}
                      />
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="datos-rector-secretaria" className="rounded-md border border-border not-last:border-b border">
              <AccordionTrigger className={accordionTriggerClassName}>Datos de rector y secretaria</AccordionTrigger>
              <AccordionContent>
                {/* Una card por persona: rector y secretaria son bloques
                    independientes, no un solo formulario partido en dos. */}
                <div className="space-y-4">
                  <Card className={accordionCardClassName}>
                    <CardContent>
                      <UserDetailsForm
                        role="RECTOR"
                        fieldPrefix="principal"
                        value={formValues.principal}
                        onChange={(principal) => setFormValues((current) => ({ ...current, principal }))}
                        invalidFields={invalidFields}
                        errors={fieldErrors}
                        showValidation={hasSubmitted}
                        confirmPassword={confirmPasswords["principal"] ?? ""}
                        onConfirmPasswordChange={(value) =>
                          setConfirmPasswords((current) => ({ ...current, principal: value }))
                        }
                      />
                    </CardContent>
                  </Card>
                  <Card className={accordionCardClassName}>
                    <CardContent>
                      <UserDetailsForm
                        role="SECRETARY"
                        fieldPrefix="secretary"
                        value={formValues.secretary}
                        onChange={(secretary) => setFormValues((current) => ({ ...current, secretary }))}
                        invalidFields={invalidFields}
                        errors={fieldErrors}
                        showValidation={hasSubmitted}
                        confirmPassword={confirmPasswords["secretary"] ?? ""}
                        onConfirmPasswordChange={(value) =>
                          setConfirmPasswords((current) => ({ ...current, secretary: value }))
                        }
                      />
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </form>
      </TableScreenBody>

      <TableScreenFooter>
        <p className="text-sm text-muted-foreground">Complete la información antes de guardar.</p>
        <Button
          type="submit"
          form="create-establishment-form"
          variant="fill"
          color="primary"
          size="sm"
          disabled={isPending}
        >
          <CheckIcon />
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </TableScreenFooter>
    </TableScreen>
  )
}
