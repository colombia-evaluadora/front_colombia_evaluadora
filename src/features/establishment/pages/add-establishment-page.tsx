import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

import { paths } from "@/config/paths"
import { EstablishmentDetailsForm } from "@/features/establishment/components/forms/form-establishment-details"
import { useCreateEstablishment } from "../api/mutations/use-create-establishment"
import type { EstablishmentDetails } from "../api/types/establishment"
import { establishmentsDb } from "@/mocks/db/establishments"
import type { CatalogItem } from "../api/types/catalog"
import type { Person } from "../api/types/person"
import { UserDetailsForm } from "../components/forms/form-user-datails"
import { validateEstablishmentForm } from "../utils/validate-establishment-form"

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
    confirmPassword: "",
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
  const establishmentId = location.pathname.includes("/agregar/")
    ? location.pathname.split("/agregar/").at(1) ?? null
    : null
  const isEditMode = establishmentId !== null
  const [formValues, setFormValues] = useState<EstablishmentDetails>(createInitialEstablishmentValues)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [invalidFields, setInvalidFields] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    if (!isEditMode) {
      setFormValues(createInitialEstablishmentValues())
      setValidationErrors([])
      setInvalidFields([])
      setHasSubmitted(false)
      return
    }

    const existing = establishmentsDb.find((item) => item.id === establishmentId)

    if (existing) {
      setFormValues(existing)
      setValidationErrors([])
      setInvalidFields([])
      setHasSubmitted(false)
    }
  }, [establishmentId, isEditMode])

  const createMutation = useCreateEstablishment({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        navigate({ to: paths.app.establishments.general.getHref() })
      },
      onError: (error) => {
        toast.error(error.message || "No se pudo crear el establecimiento.")
      },
    },
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setHasSubmitted(true)

    const validation = validateEstablishmentForm(formValues)
    setValidationErrors(validation.errors)
    setInvalidFields(validation.invalidFields)

    if (validation.errors.length > 0) {
      toast.error("Completa los campos obligatorios antes de guardar.")
      return
    }

    await createMutation.mutateAsync(formValues)
  }

  return (
    <Card>
      <CardHeader>
        <CardAction>
          <div className="flex gap-2">
            <Button type="submit" form="create-establishment-form" variant="fill" color="primary" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Guardando..." : isEditMode ? "Guardar cambios" : "Guardar"}
            </Button>
            <Button render={<Link to={paths.app.establishments.general.getHref()} />} variant="ghost" color="neutral" size="sm" nativeButton={false}>
              Cancelar
            </Button>
          </div>
        </CardAction>
        <CardTitle>{isEditMode ? "Editar establecimiento educativo" : "Agregar establecimiento educativo"}</CardTitle>
      </CardHeader>

      <CardContent>
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
          <Accordion multiple defaultValue={["datos-establecimiento", "datos-rector-secretaria"]} keepMounted>
            <AccordionItem value="datos-establecimiento">
              <AccordionTrigger>Datos de establecimiento</AccordionTrigger>
              <AccordionContent>
                <div className="py-4">
                  <EstablishmentDetailsForm
                    value={formValues}
                    onChange={setFormValues}
                    invalidFields={invalidFields}
                    showValidation={hasSubmitted}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="datos-rector-secretaria">
              <AccordionTrigger>Datos de rector y secretaria</AccordionTrigger>
              <AccordionContent>
                <div className="py-4 ">
                  <UserDetailsForm
                    role="RECTOR"
                    fieldPrefix="principal"
                    value={formValues.principal}
                    onChange={(principal) => setFormValues((current) => ({ ...current, principal }))}
                    invalidFields={invalidFields}
                    showValidation={hasSubmitted}
                  />
                  <UserDetailsForm
                    role="SECRETARY"
                    fieldPrefix="secretary"
                    value={formValues.secretary}
                    onChange={(secretary) => setFormValues((current) => ({ ...current, secretary }))}
                    invalidFields={invalidFields}
                    showValidation={hasSubmitted}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </form>
      </CardContent>
    </Card>
  )
}
