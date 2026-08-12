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
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { EstablishmentDetailsForm } from "@/features/establishment/components/forms/form-establishment-details"
import { ComplementaryDataFormSection } from "@/features/establishment/components/sections/complementary-data-form-section"
import { useCreateEmployeePerson } from "../api/mutations/use-create-employee-person"
import { useCreateEstablishment } from "../api/mutations/use-create-establishment"
import { useUpdateEstablishment } from "../api/mutations/use-update-establishment"
import type { EstablishmentDetails } from "../api/types/establishment"
import { establishmentsDb } from "@/mocks/db/establishments"
import type { CatalogItem } from "../api/types/catalog"
import type { Person } from "../api/types/person"
import { UserDetailsForm } from "../components/forms/form-user-datails"
import { validateEstablishmentForm } from "../utils/validate-establishment-form"
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

function createEmptyCatalogItem(): CatalogItem {
  return { id: "", code: "", name: "" }
}

function createEmptyPerson(): Person {
  return {
    id: "",
    documentType: createEmptyCatalogItem(),
    identification: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: createEmptyCatalogItem(),
    email: "",
    phone: "",
    password: "",
  }
}

function createInitialEstablishmentValues(): EstablishmentDetails {
  return {
    id: crypto.randomUUID(),
    basicInfo: {
      name: "",
      dane: "",
      nit: "",
      ownershipType: createEmptyCatalogItem(),
    },
    address: {
      municipality: {
        id: "",
        code: "",
        name: "",
        department: { id: "", code: "", name: "" },
      },
      zone: createEmptyCatalogItem(),
      district: createEmptyCatalogItem(),
      commune: createEmptyCatalogItem(),
      locality: createEmptyCatalogItem(),
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
      teachingLanguage: createEmptyCatalogItem(),
      calendar: createEmptyCatalogItem(),
      costRegime: createEmptyCatalogItem(),
      populationGender: createEmptyCatalogItem(),
      tuitionRange: createEmptyCatalogItem(),
      disabilityType: createEmptyCatalogItem(),
      operatingLicense: false,
      licenseStatus: createEmptyCatalogItem(),
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
  const establishmentId = location.pathname.includes("/editar/")
    ? location.pathname.split("/editar/").at(1) ?? null
    : null
  const isEditMode = establishmentId !== null
  const [formValues, setFormValues] = useState<EstablishmentDetails>(createInitialEstablishmentValues)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [invalidFields, setInvalidFields] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  // Confirmaciones de contraseña: estado de UI, no parte del modelo de negocio.
  const [confirmPasswords, setConfirmPasswords] = useState<Record<string, string>>({
    principal: "",
    secretary: "",
  })

  useEffect(() => {
    if (!isEditMode) {
      setFormValues(createInitialEstablishmentValues())
      setValidationErrors([])
      setInvalidFields([])
      setHasSubmitted(false)
      setConfirmPasswords({ principal: "", secretary: "" })
      return
    }

    const existing = establishmentsDb.find((item) => item.id === establishmentId)

    if (existing) {
      setFormValues(existing)
      setValidationErrors([])
      setInvalidFields([])
      setHasSubmitted(false)
      setConfirmPasswords({
        principal: existing.principal?.password ?? "",
        secretary: existing.secretary?.password ?? "",
      })
    }
  }, [establishmentId, isEditMode])

  const createMutation = useCreateEstablishment({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.establishment.created)
        navigate({ to: paths.app.establishments.general.getHref() })
      },
      onError: (error) => {
        notify(error.message || "No se pudo crear el establecimiento.", { variant: "error" })
      },
    },
  })

  const updateMutation = useUpdateEstablishment({
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

  const createPersonMutation = useCreateEmployeePerson()

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

  async function persistPersonIfAny(
    person: Person | null,
    label: string,
    confirmPassword: string
  ): Promise<Person | null> {
    if (!person || !personHasAnyData(person, confirmPassword)) {
      return null
    }

    const result = await createPersonMutation.mutateAsync(person)

    if (result.status === "error") {
      notify(result.message || `No fue posible guardar el ${label}.`, { variant: "error" })
      throw new Error(`person_persist_failed:${label}`)
    }

    notify(`${label} guardado.`)
    return result.person
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setHasSubmitted(true)

    const validation = validateEstablishmentForm(formValues, confirmPasswords)
    setValidationErrors(validation.errors)
    setInvalidFields(validation.invalidFields)

    if (validation.errors.length > 0) {
      notify("Completa los campos obligatorios antes de guardar.", { variant: "error" })
      return
    }

    // Persistimos rector/secretaria antes del establecimiento para que
    // los `Person` queden con `id` en `personsDb`.
    let nextPrincipal = formValues.principal
    let nextSecretary = formValues.secretary

    try {
      const persistedPrincipal = await persistPersonIfAny(
        nextPrincipal,
        "Rector",
        confirmPasswords["principal"] ?? ""
      )
      if (persistedPrincipal) {
        nextPrincipal = persistedPrincipal
      }

      const persistedSecretary = await persistPersonIfAny(
        nextSecretary,
        "Secretaria",
        confirmPasswords["secretary"] ?? ""
      )
      if (persistedSecretary) {
        nextSecretary = persistedSecretary
      }
    } catch {
      return
    }

    const nextValues: EstablishmentDetails = {
      ...formValues,
      principal: nextPrincipal,
      secretary: nextSecretary,
    }

    if (isEditMode && establishmentId) {
      await updateMutation.mutateAsync({
        establishmentId,
        values: nextValues,
      })
      return
    }

    await createMutation.mutateAsync(nextValues)
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
        {validationErrors.length > 0 ? (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-medium">Completa los campos obligatorios:</p>
            <ul className="mt-2 list-disc pl-5">
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}
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
                        showValidation={hasSubmitted}
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
