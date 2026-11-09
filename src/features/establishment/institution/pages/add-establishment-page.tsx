import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState, type FormEvent } from "react"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, XIcon } from "@/components/ui/icons"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

import { paths } from "@/config/paths"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"
import { EstablishmentDetailsForm } from "@/features/establishment/institution/components/forms/form-establishment"
import {
  useDirectivosPersistence,
  type PendingInvitation,
} from "@/features/establishment/institution/hooks/use-directivos-persistence"
import { useCreate } from "@/features/establishment/institution/api/mutations/use-create"
import { useUpdate } from "@/features/establishment/institution/api/mutations/use-update"
import { useEstablishmentQuery } from "@/features/establishment/institution/api/query/use-establishment"
import { usePuedeGestionarEstablecimientosQuery } from "@/features/establishment/institution/api/query/use-puede-gestionar-establecimientos"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"
import type { Employee } from "@/features/establishment/employees/api/types/employee"
import type { Person } from "@/features/establishment/employees/api/types/person"
import { UserDetailsForm } from "@/features/establishment/employees/components/forms/form-user-details"
import {
  DirectivosReadOnly,
  DirectivosSoloLecturaNota,
} from "@/features/establishment/institution/components/directivos-read-only"
import { validateEstablishmentForm } from "@/features/establishment/institution/utils/validate-form"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { findPredeterminado, useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { CATALOGS } from "@/lib/catalogs"
import { createEmptyPerson } from "@/features/establishment/employees/api/types/person"

/** Caret a la izquierda del título solo en esta página, sin tocar el Accordion compartido. */
const accordionTriggerClassName =
  "flex-row-reverse justify-end items-center gap-2 py-3 text-base **:data-[slot=accordion-trigger-icon]:ml-0 **:data-[slot=accordion-trigger-icon]:size-4"

/** Los dos bloques de la página: cabecera gris y adentro sus tarjetas blancas. */
const accordionItemClassName = "rounded-lg border border-border bg-muted/40 not-last:border-b"


// Sin `id`: lo asigna el backend al crear.
function createInitialEstablishmentValues(): EstablishmentDetails {
  return {
    basicInfo: {
      name: "",
      dane: "",
      nit: "",
      ownershipType: null,
      serviceModality: null,
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
  const { notify: notifyLayout, dismiss } = useNotify()
  // Al salir se borra un error pendiente (vive en el layout); el éxito se mantiene.
  const lastNoticeIsErrorRef = useRef(false)
  function notify(message: string, options?: Parameters<typeof notifyLayout>[1]) {
    lastNoticeIsErrorRef.current = options?.variant === "error"
    notifyLayout(message, options)
  }
  useEffect(
    () => () => {
      if (lastNoticeIsErrorRef.current) dismiss()
    },
    [dismiss],
  )
  const establishmentIdParam = location.pathname.includes("/editar/")
    ? location.pathname.split("/editar/").at(1) ?? null
    : null
  const establishmentId = establishmentIdParam !== null ? Number(establishmentIdParam) : null
  const isEditMode = establishmentId !== null && !Number.isNaN(establishmentId)
  // Sin Guardar, entrar por URL lleva al detalle (editar) o a la lista (agregar).
  const { puedeEditar, isLoading: permisoCargando } = useMenuPermission("ESTABLECIMIENTO")
  // Rector/secretaria solo los cambia quien tiene Eliminar y nivel territorial (V574).
  const { data: puedeGestionarDirectivos, isLoading: directivosCargando } = usePuedeGestionarEstablecimientosQuery()
  const directivosSoloLectura = puedeGestionarDirectivos !== true
  useEffect(() => {
    if (permisoCargando || directivosCargando) return
    if (isEditMode ? puedeEditar : puedeGestionarDirectivos) return
    navigate({
      to: isEditMode
        ? paths.app.establishments.detail.getHref(establishmentId)
        : paths.app.establishments.general.getHref(),
      search: (prev) => prev,
      replace: true,
    })
  }, [permisoCargando, directivosCargando, isEditMode, puedeEditar, puedeGestionarDirectivos, establishmentId, navigate])
  const [formValues, setFormValues] = useState<EstablishmentDetails>(createInitialEstablishmentValues)
  // `null` en edición = conservar el escudo guardado.
  const [shield, setShield] = useState<File | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  // La foto va en el multipart del funcionario, no del establecimiento.
  const [photos, setPhotos] = useState<Record<string, File | null>>({
    principal: null,
    secretary: null,
  })
  // Se reenvía al guardar para no pisar con `null` los campos de empleo.
  const [principalEmployee, setPrincipalEmployee] = useState<Employee | null>(null)
  const [secretaryEmployee, setSecretaryEmployee] = useState<Employee | null>(null)
  // Snapshot del autocompletado (solo si el match no trae `id`) para detectar ediciones antes de guardar.
  const principalMatchRef = useRef<Partial<Person> | null>(null)
  const secretaryMatchRef = useRef<Partial<Person> | null>(null)

  const establishmentQuery = useEstablishmentQuery(establishmentId, isEditMode)

  useEffect(() => {
    if (!isEditMode) {
      setFormValues(createInitialEstablishmentValues())
      predeterminadosAplicados.current.clear()
      setHasSubmitted(false)
      setPrincipalEmployee(null)
      setSecretaryEmployee(null)
      principalMatchRef.current = null
      secretaryMatchRef.current = null
      return
    }

    if (establishmentQuery.data?.status === "ok") {
      const existing = establishmentQuery.data.establishment
      setFormValues(existing)
      setHasSubmitted(false)
      setPrincipalEmployee(establishmentQuery.data.principalEmployee)
      setSecretaryEmployee(establishmentQuery.data.secretaryEmployee)
      principalMatchRef.current = null
      secretaryMatchRef.current = null
    }
  }, [establishmentQuery.data, isEditMode])

  // Predeterminados de Listas valor: solo al agregar y sobre campos vacíos
  const { data: zonesCat } = useCatalogQuery<CatalogItem>(CATALOGS.ZONES)
  const { data: idiomasCat } = useCatalogQuery<CatalogItem>(CATALOGS.IDIOMAS)
  const { data: calendariosCat } = useCatalogQuery<CatalogItem>(CATALOGS.CALENDARIOS)
  const { data: costRegimenCat } = useCatalogQuery<CatalogItem>(CATALOGS.COST_REGIMEN)
  const { data: populationGendersCat } = useCatalogQuery<CatalogItem>(CATALOGS.POPULATION_GENDERS)
  const { data: rangosTarifasCat } = useCatalogQuery<CatalogItem>(CATALOGS.RANGO_TARIFAS)
  const { data: disabilitiesCat } = useCatalogQuery<CatalogItem>(CATALOGS.DISABILITIES_ATTENDED)
  const { data: documentTypesCat } = useCatalogQuery<CatalogItem>(CATALOGS.DOCUMENT_TYPES)
  const { data: gendersCat } = useCatalogQuery<CatalogItem>(CATALOGS.GENDERS)
  const predeterminadosAplicados = useRef(new Set<string>())

  useEffect(() => {
    if (isEditMode) return
    const zone = findPredeterminado(zonesCat) ?? null
    const extra = {
      teachingLanguage: findPredeterminado(idiomasCat),
      calendar: findPredeterminado(calendariosCat),
      costRegime: findPredeterminado(costRegimenCat),
      populationGender: findPredeterminado(populationGendersCat),
      tuitionRange: findPredeterminado(rangosTarifasCat),
      disabilityType: findPredeterminado(disabilitiesCat),
    }
    const documentType = findPredeterminado(documentTypesCat) ?? null
    const gender = findPredeterminado(gendersCat) ?? null
    // Una sola vez por campo: si el usuario elige "Seleccione" no se vuelve a llenar
    const aplicar = (key: string, vacio: boolean, item: CatalogItem | null | undefined) => {
      if (!item || !vacio || predeterminadosAplicados.current.has(key)) return false
      predeterminadosAplicados.current.add(key)
      return true
    }
    const prev = formValues
    let changed = false
    const additionalInfo = { ...prev.additionalInfo }
    for (const [key, item] of Object.entries(extra)) {
      const field = key as keyof typeof extra
      if (aplicar(field, !additionalInfo[field], item)) {
        Object.assign(additionalInfo, { [field]: item })
        changed = true
      }
    }
    const address = aplicar("zone", !prev.address.zone, zone) ? { ...prev.address, zone } : prev.address
    const withPersonDefaults = (rol: string, person: Person | null): Person | null => {
      if (!person) return person
      const doc = aplicar(`${rol}.documentType`, !person.documentType, documentType)
      const gen = aplicar(`${rol}.gender`, !person.gender, gender)
      if (!doc && !gen) return person
      return { ...person, ...(doc && { documentType }), ...(gen && { gender }) }
    }
    const principal = withPersonDefaults("principal", prev.principal)
    const secretary = withPersonDefaults("secretary", prev.secretary)
    if (!changed && address === prev.address && principal === prev.principal && secretary === prev.secretary) return
    setFormValues((current) => ({
      ...current,
      address: { ...current.address, zone: address.zone },
      additionalInfo: { ...current.additionalInfo, ...additionalInfo },
      principal,
      secretary,
    }))
  }, [
    isEditMode,
    formValues,
    zonesCat,
    idiomasCat,
    calendariosCat,
    costRegimenCat,
    populationGendersCat,
    rangosTarifasCat,
    disabilitiesCat,
    documentTypesCat,
    gendersCat,
  ])

  // Tras el primer intento de guardar se revalida en cada cambio.
  const validacionVisible = hasSubmitted ? validateEstablishmentForm(formValues, { logo: shield, photos }, { validarDirectivos: !directivosSoloLectura }) : null
  const fieldErrors = validacionVisible?.fieldErrors ?? {}
  const invalidFields = validacionVisible?.invalidFields ?? []

  // Sin `onSuccess`: `handleSubmit` invita a rector/secretaria antes de navegar.
  const createMutation = useCreate({
    mutationConfig: {
      onError: (error) => {
        notify(getErrorMessage(error) || "No se pudo crear el establecimiento.", {
          variant: "error",
        })
      },
    },
  })

  // Rector y secretaria: registro previo, rollback si el EE falla e invitaciones al final.
  const directivos = useDirectivosPersistence(notify)

  // Sin `onSuccess`: igual que en `createMutation`.
  const updateMutation = useUpdate({
    mutationConfig: {
      onError: (error) => {
        notify(getErrorMessage(error) || "No se pudo actualizar el establecimiento.", {
          variant: "error",
        })
      },
    },
  })

  // Cubre todo el guardado, no solo la mutación del EE: evita doble registro por doble clic.
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await submit()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submit() {
    // Sin saber todavía si el panel es editable no se guarda: se perdería el rector.
    if (directivosCargando) return
    directivos.reset()
    setHasSubmitted(true)

    const validation = validateEstablishmentForm(formValues, { logo: shield, photos }, { validarDirectivos: !directivosSoloLectura })

    if (validation.errors.length > 0) {
      notify("Completa los campos obligatorios antes de guardar.", { variant: "error" })
      return
    }

    let nextPrincipal = formValues.principal
    let nextSecretary = formValues.secretary
    const pendingInvitations: PendingInvitation[] = []

    // En solo lectura no se toca a rector/secretaria: su PATCH no pasaría el rango de Funcionarios.
    if (!directivosSoloLectura) {
      try {
        const persistedPrincipal = await directivos.persistPersonIfAny(
          nextPrincipal,
          principalEmployee,
          "Rector",
          photos["principal"] ?? null,
          principalMatchRef.current,
        )
        if (persistedPrincipal) {
          nextPrincipal = persistedPrincipal.person
          if (persistedPrincipal.pendingInvitation) pendingInvitations.push(persistedPrincipal.pendingInvitation)
        }

        const persistedSecretary = await directivos.persistPersonIfAny(
          nextSecretary,
          secretaryEmployee,
          "Secretaria",
          photos["secretary"] ?? null,
          secretaryMatchRef.current,
        )
        if (persistedSecretary) {
          nextSecretary = persistedSecretary.person
          if (persistedSecretary.pendingInvitation) pendingInvitations.push(persistedSecretary.pendingInvitation)
        }
      } catch {
        // Si el rector se guardó y la secretaria no, se deshace el rector.
        await directivos.cancelarPendientesRegistrados()
        return
      }
    }

    const nextValues: EstablishmentDetails = {
      ...formValues,
      principal: nextPrincipal,
      secretary: nextSecretary,
    }

    if (isEditMode && establishmentId) {
      try {
        const result = await updateMutation.mutateAsync({
          establishmentId,
          values: { ...nextValues, id: establishmentId },
          logo: shield,
        })
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          await directivos.cancelarPendientesRegistrados()
          return
        }
      } catch {
        // El `onError` de `updateMutation` ya avisó el motivo.
        await directivos.cancelarPendientesRegistrados()
        return
      }

      await directivos.enviarInvitacionesPendientes(pendingInvitations)
      const { avisos, variant } = directivos.takeActivationNotices()
      notify(
        [SUCCESS_MESSAGES.establishment.updated, ...avisos].join(" "),
        variant ? { variant } : undefined,
      )
      // Es el aviso del guardado (aunque sea "error" por la activación): sigue en la tabla.
      lastNoticeIsErrorRef.current = false
      navigate({ to: paths.app.establishments.general.getHref(), search: (prev) => prev })
      return
    }

    let result: Awaited<ReturnType<typeof createMutation.mutateAsync>>
    try {
      result = await createMutation.mutateAsync({ values: nextValues, logo: shield })
    } catch {
      // El EE nunca se creó: seguro cancelar.
      await directivos.cancelarPendientesRegistrados()
      return
    }

    if (result.status === "error") {
      notify(result.message, { variant: "error" })
      await directivos.cancelarPendientesRegistrados()
      return
    }

    await directivos.enviarInvitacionesPendientes(pendingInvitations)
    const { avisos, variant } = directivos.takeActivationNotices()
    notify(
      [SUCCESS_MESSAGES.establishment.created, ...avisos].join(" "),
      variant ? { variant } : undefined,
    )
    lastNoticeIsErrorRef.current = false
    navigate({ to: paths.app.establishments.general.getHref(), search: (prev) => prev })
  }

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending || directivosCargando

  const listHref = paths.app.establishments.general.getHref()
  // Solo al editar: al crear, quien llega a esta pantalla siempre puede registrarlos.
  const directivosEnTabla = isEditMode && directivosSoloLectura && !directivosCargando

  return (
    <TableScreen>
      {/* El encabezado es sticky: Cancelar y Guardar quedan a mano en todo el formulario. */}
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Button
                render={<Link to={listHref} search={(prev) => prev} />}
                variant="outline"
                color="neutral"
                size="sm"
                nativeButton={false}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
              <Button
                type="submit"
                form="create-establishment-form"
                variant="fill"
                color="primary"
                size="sm"
                disabled={isPending}
              >
                <FloppyDiskIcon data-icon="inline-start" />
                {isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          }
        >
          <span className="flex min-w-0 items-baseline gap-2">
            <Link
              to={listHref}
              search={(prev) => prev}
              className="shrink-0 text-sm font-normal text-muted-foreground hover:text-foreground"
            >
              Establecimientos educativos ›
            </Link>
            <span className="truncate">{isEditMode ? "Editar establecimiento" : "Nuevo establecimiento"}</span>
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <form id="create-establishment-form" onSubmit={handleSubmit}>
          <Accordion multiple defaultValue={["datos-establecimiento", "datos-rector-secretaria"]} keepMounted className="gap-4">
            <AccordionItem value="datos-establecimiento" className={accordionItemClassName}>
              <AccordionTrigger className={accordionTriggerClassName}>Datos de establecimiento</AccordionTrigger>
              <AccordionContent>
                <div className="-mx-4 border-t border-border px-4 pt-4">
                  <EstablishmentDetailsForm
                    value={formValues}
                    onChange={setFormValues}
                    invalidFields={invalidFields}
                    errors={fieldErrors}
                    showValidation={hasSubmitted}
                    shield={shield}
                    onShieldChange={setShield}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Rector y secretaria en una sola tarjeta, sin acordeones adentro. */}
            <AccordionItem value="datos-rector-secretaria" className={accordionItemClassName}>
              <AccordionTrigger className={accordionTriggerClassName}>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  Datos de rector y secretaria
                  {directivosEnTabla ? <DirectivosSoloLecturaNota /> : null}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="-mx-4 border-t border-border px-4 pt-4">
                  {/* Quien no puede cambiar a los directivos los ve en tabla, como en el detalle. */}
                  {directivosEnTabla ? (
                    <div className="rounded-lg border border-border bg-card p-4">
                      <DirectivosReadOnly principal={formValues.principal} secretary={formValues.secretary} />
                    </div>
                  ) : (
                  <div className="space-y-5 rounded-lg border border-border bg-card p-4">
                    <UserDetailsForm
                      role="RECTOR"
                      layout="two-columns"
                      title="Rector"
                      fieldPrefix="principal"
                      disabled={directivosSoloLectura}
                      value={formValues.principal}
                      onChange={(principal) => setFormValues((current) => ({ ...current, principal }))}
                      invalidFields={invalidFields}
                      errors={fieldErrors}
                      showValidation={hasSubmitted}
                      photo={photos["principal"] ?? null}
                      onPhotoChange={(file) =>
                        setPhotos((current) => ({ ...current, principal: file }))
                      }
                      onMatched={(found) => {
                        // Solo sin `id`: con `id` se edita directo por PK.
                        principalMatchRef.current = found && !found.id ? found : null
                      }}
                    />
                    <hr className="border-border" />
                    <UserDetailsForm
                      role="SECRETARY"
                      layout="two-columns"
                      title="Secretaria (opcional)"
                      fieldPrefix="secretary"
                      value={formValues.secretary}
                      onChange={(secretary) => setFormValues((current) => ({ ...current, secretary }))}
                      invalidFields={invalidFields}
                      errors={fieldErrors}
                      showValidation={hasSubmitted}
                      required={false}
                      disabled={directivosSoloLectura}
                      photo={photos["secretary"] ?? null}
                      onPhotoChange={(file) =>
                        setPhotos((current) => ({ ...current, secretary: file }))
                      }
                      onMatched={(found) => {
                        secretaryMatchRef.current = found && !found.id ? found : null
                      }}
                    />
                  </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </form>
      </TableScreenBody>
    </TableScreen>
  )
}
