import { useEffect, useRef, useState, type ReactNode } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { BankIcon, InfoIcon, SpinnerIcon, WarningIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { CATALOGS } from "@/lib/catalogs"
import { toSelectItemsMap } from "@/lib/catalog-options"
import { campusConvertedMessage } from "@/lib/success-messages"
import { toDigitsOnly } from "@/lib/text-input"

import { useConvertCampus } from "@/features/establishment/campuses/api/mutations/convert-campus"
import {
  describeCampusProcesses,
  useCampusProcessesQuery,
} from "@/features/establishment/campuses/api/query/use-campus-processes"
import type { CampusDetail } from "@/features/establishment/campuses/api/types/campus"
import { useGuardedDialog } from "@/features/establishment/academic-period/hooks/use-guarded-dialog"
import { findPredeterminado, useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { Person } from "@/features/establishment/employees/api/types/person"
import { UserDetailsForm } from "@/features/establishment/employees/components/forms/form-user-details"
import { createEmptyPerson } from "@/features/establishment/employees/api/types/person"
import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import { useOwnershipTypesQuery } from "@/features/establishment/institution/api/query/use-ownership-types"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"
import {
  useDirectivosPersistence,
  type PendingInvitation,
} from "@/features/establishment/institution/hooks/use-directivos-persistence"
import { validateEstablishmentForm } from "@/features/establishment/institution/utils/validate-form"
import { toTextoInput } from "@/features/establishment/shared/text-field-rules"

// TESTABLECIMIENTO.NOMBRE es VARCHAR(130); el de la sede admite 150.
const NOMBRE_MAX = 130

/** Lo que el modal muestra; el resto del establecimiento sale de la sede y no se ve. */
const VISIBLE_FIELDS = new Set([
  "basicInfo.name",
  "basicInfo.dane",
  "basicInfo.nit",
  "basicInfo.ownershipType",
  "basicInfo.serviceModality",
  "address.municipality",
  "additionalInfo.calendar",
])

const texto = (name: string): CatalogItem | null => (name.trim() ? { id: 0, code: "", name: name.trim() } : null)

/**
 * El establecimiento nace con los datos de la sede (nombre, DANE, zona y
 * domicilio) y lo obligatorio que la sede no tiene. Un DANE viejo que no
 * tiene 12 dígitos se deja vacío para que se escriba el correcto.
 */
function fromCampus(campus: CampusDetail): EstablishmentDetails {
  return {
    basicInfo: {
      name: campus.name,
      dane: /^\d{12}$/.test(campus.dane.trim()) ? campus.dane.trim() : "",
      nit: "",
      ownershipType: null,
      serviceModality: null,
    },
    address: {
      municipality: null,
      zone: campus.zoneId != null ? { id: campus.zoneId, code: "", name: campus.zoneName } : null,
      district: texto(campus.neighborhood),
      commune: texto(campus.commune),
      locality: null,
      address: campus.address,
    },
    contact: { email: "", website: "", phone: campus.phone },
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

/** "900765432-6" → número y dígito de verificación. */
function partirNit(nit: string): [string, string] {
  const [numero = "", dv = ""] = nit.split("-")
  return [numero, dv]
}

function CatalogCombobox<T extends { id: number; name: string }>({
  id,
  label,
  items,
  value,
  onChange,
  error,
  itemLabel = (item) => item.name,
}: {
  id: string
  label: string
  items: T[]
  value: T | null
  onChange: (item: T | null) => void
  error?: string
  itemLabel?: (item: T) => string
}) {
  const options = items.map((item) => ({ value: item.id, label: itemLabel(item) }))
  return (
    <Field orientation="vertical" variant="outlined" data-invalid={error ? "true" : undefined}>
      <FieldLabel htmlFor={id}>{label}*</FieldLabel>
      <ComboboxField
        id={id}
        aria-invalid={Boolean(error)}
        value={value?.id ?? null}
        onValueChange={(selected) => onChange(items.find((item) => item.id === selected) ?? null)}
        items={toSelectItemsMap(options)}
      >
        <ComboboxFieldTrigger aria-invalid={Boolean(error)}>
          <ComboboxFieldValue placeholder="Seleccione" />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {options.map((option) => (
            <ComboboxFieldItem key={option.value} value={option.value}>
              {option.label}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function TextInput({
  id,
  label,
  value,
  onChange,
  error,
  inputMode,
  maxLength,
  description,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  inputMode?: "numeric"
  maxLength?: number
  description?: ReactNode
}) {
  return (
    <Field orientation="vertical" variant="outlined" data-invalid={error ? "true" : undefined}>
      <FieldLabel htmlFor={id}>{label}*</FieldLabel>
      <Input
        id={id}
        placeholder="Agregar"
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <FieldError>{error}</FieldError> : description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  )
}

interface ConvertCampusDialogProps {
  campus: CampusDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tras convertir: Modificar sede se cierra (el aviso de éxito ya salió). */
  onConverted: () => void
}

function ConvertCampusForm({ campus, onClose, onConverted }: { campus: CampusDetail; onClose: () => void; onConverted: () => void }) {
  const { notify: notifyPage } = useNotify()
  const [values, setValues] = useState<EstablishmentDetails>(() => fromCampus(campus))
  const initialRef = useRef(JSON.stringify(values))
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState<{ id: number; message: string; variant: NoticeVariant } | null>(null)
  const noticeIdRef = useRef(0)
  // Snapshot del autocompletado por documento (solo si el match no trae `id`).
  const principalMatchRef = useRef<Partial<Person> | null>(null)
  const secretaryMatchRef = useRef<Partial<Person> | null>(null)

  function showNotice(message: string, variant: NoticeVariant = "error") {
    noticeIdRef.current += 1
    setNotice({ id: noticeIdRef.current, message, variant })
  }

  const directivos = useDirectivosPersistence((message, options) => showNotice(message, options?.variant ?? "info"))
  const convert = useConvertCampus()

  const { data: municipalities = [] } = useMunicipalitiesQuery()
  const { data: calendars = [] } = useCatalogQuery<CatalogItem>(CATALOGS.CALENDARIOS)
  const { data: ownershipTypes = [] } = useOwnershipTypesQuery()
  const { data: modalities = [] } = useCatalogQuery<CatalogItem>(CATALOGS.MODALIDADES_PRESTACION)
  const { data: documentTypes } = useCatalogQuery<CatalogItem>(CATALOGS.DOCUMENT_TYPES)
  const { data: genders } = useCatalogQuery<CatalogItem>(CATALOGS.GENDERS)
  const { data: processes } = useCampusProcessesQuery(campus.id)
  const inCourse = describeCampusProcesses(processes)

  // Predeterminados de Listas valor, una sola vez y sobre lo vacío, como en el alta del EE.
  const defaultsApplied = useRef(false)
  useEffect(() => {
    if (defaultsApplied.current || !calendars.length || !documentTypes || !genders) return
    defaultsApplied.current = true
    const documentType = findPredeterminado(documentTypes) ?? null
    const gender = findPredeterminado(genders) ?? null
    const withDefaults = (person: Person | null): Person | null =>
      person ? { ...person, documentType: person.documentType ?? documentType, gender: person.gender ?? gender } : person
    setValues((current) => {
      const next = {
        ...current,
        additionalInfo: { ...current.additionalInfo, calendar: current.additionalInfo.calendar ?? findPredeterminado(calendars) ?? null },
        principal: withDefaults(current.principal),
        secretary: withDefaults(current.secretary),
      }
      // Lo precargado no cuenta como cambio del usuario.
      initialRef.current = JSON.stringify(next)
      return next
    })
  }, [calendars, documentTypes, genders])

  const validation = hasSubmitted ? validateEstablishmentForm(values, {}, { validarDirectivos: true }) : null
  const errors = validation?.fieldErrors ?? {}
  const invalidFields = validation?.invalidFields ?? []

  const [nitNumero, nitDv] = partirNit(values.basicInfo.nit)
  const setBasic = (patch: Partial<EstablishmentDetails["basicInfo"]>) =>
    setValues((current) => ({ ...current, basicInfo: { ...current.basicInfo, ...patch } }))
  const setNit = (numero: string, dv: string) => setBasic({ nit: dv ? `${numero}-${dv}` : numero })

  async function submit() {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      setHasSubmitted(true)
      setNotice(null)
      directivos.reset()

      const result = validateEstablishmentForm(values, {}, { validarDirectivos: true })
      if (result.errors.length > 0) {
        // Lo que viene de la sede no se ve en el modal: su error se dice aquí.
        const fromCampusErrors = Object.entries(result.fieldErrors)
          .filter(([path]) => !VISIBLE_FIELDS.has(path) && !path.startsWith("principal.") && !path.startsWith("secretary."))
          .map(([, message]) => message)
        showNotice(
          fromCampusErrors.length > 0
            ? `Corrija en la sede antes de convertirla: ${fromCampusErrors.join(" ")}`
            : "Completa los campos obligatorios antes de guardar.",
        )
        return
      }

      let principal = values.principal
      let secretary = values.secretary
      const pendingInvitations: PendingInvitation[] = []
      try {
        const persistedPrincipal = await directivos.persistPersonIfAny(principal, null, "Rector", null, principalMatchRef.current)
        if (persistedPrincipal) {
          principal = persistedPrincipal.person
          if (persistedPrincipal.pendingInvitation) pendingInvitations.push(persistedPrincipal.pendingInvitation)
        }
        const persistedSecretary = await directivos.persistPersonIfAny(secretary, null, "Secretaria", null, secretaryMatchRef.current)
        if (persistedSecretary) {
          secretary = persistedSecretary.person
          if (persistedSecretary.pendingInvitation) pendingInvitations.push(persistedSecretary.pendingInvitation)
        }
      } catch {
        // Si el rector se guardó y la secretaria no, se deshace el rector.
        await directivos.cancelarPendientesRegistrados()
        return
      }

      try {
        await convert.mutateAsync({ campusId: campus.id, values: { ...values, principal, secretary } })
      } catch (error) {
        // El establecimiento no se creó: el SSO deshizo todo; se cancelan los usuarios registrados.
        showNotice(getErrorMessage(error) || "No se pudo convertir la sede en establecimiento.")
        await directivos.cancelarPendientesRegistrados()
        return
      }

      await directivos.enviarInvitacionesPendientes(pendingInvitations)
      const { avisos, variant } = directivos.takeActivationNotices()
      notifyPage(
        [campusConvertedMessage(campus.name, values.basicInfo.name.trim()), ...avisos].join(" "),
        variant ? { variant } : undefined,
      )
      onConverted()
    } finally {
      setIsSubmitting(false)
    }
  }

  const { confirmDiscardOpen, requestClose, onOpenChange, discardDialogProps } = useGuardedDialog({
    isSaving: isSubmitting,
    isDirty: () => JSON.stringify(values) !== initialRef.current,
    onOpen: () => {},
    onClose,
  })

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>Convertir «{campus.name}» en establecimiento</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md bg-primary-22 px-3 py-2 text-sm text-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Datos precargados desde la sede: nombre, código DANE, zona, barrio, comuna, dirección y teléfono. Complete lo
            que la sede no tiene.
          </span>
        </div>

        <NoticeBanner
          notice={notice}
          onClose={() => setNotice(null)}
          variant={notice?.variant}
          autoCloseMs={notice?.variant === "error" ? 15000 : 7000}
        />

        <form
          id="convert-campus-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
          className="flex flex-col gap-5"
        >
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-3">
            <TextInput
              id="convert-name"
              label="Nombre del establecimiento"
              value={values.basicInfo.name}
              maxLength={NOMBRE_MAX}
              onChange={(name) => setBasic({ name: toTextoInput(name, NOMBRE_MAX) })}
              error={errors["basicInfo.name"]}
            />
            <TextInput
              id="convert-dane"
              label="Código DANE"
              inputMode="numeric"
              maxLength={12}
              value={values.basicInfo.dane}
              onChange={(dane) => setBasic({ dane: toDigitsOnly(dane, 12) })}
              error={errors["basicInfo.dane"]}
            />
            {/* El NIT se escribe en dos partes; se guarda junto ("900123456-7"). */}
            <Field orientation="vertical" variant="outlined" data-invalid={errors["basicInfo.nit"] ? "true" : undefined}>
              <FieldLabel htmlFor="convert-nit">NIT*</FieldLabel>
              <div className="flex items-stretch">
                <Input
                  id="convert-nit"
                  placeholder="Agregar"
                  inputMode="numeric"
                  maxLength={10}
                  className="flex-1 rounded-r-none"
                  value={nitNumero}
                  aria-invalid={Boolean(errors["basicInfo.nit"])}
                  onChange={(event) => setNit(toDigitsOnly(event.target.value, 10), nitDv)}
                />
                <span className="flex items-center border-y border-input px-2 text-muted-foreground">-</span>
                <Input
                  aria-label="Dígito de verificación del NIT"
                  inputMode="numeric"
                  maxLength={1}
                  className="w-12 rounded-l-none text-center"
                  value={nitDv}
                  aria-invalid={Boolean(errors["basicInfo.nit"])}
                  onChange={(event) => setNit(nitNumero, toDigitsOnly(event.target.value, 1))}
                />
              </div>
              {errors["basicInfo.nit"] ? (
                <FieldError>{errors["basicInfo.nit"]}</FieldError>
              ) : (
                <FieldDescription>Número y dígito de verificación (DV)</FieldDescription>
              )}
            </Field>

            <CatalogCombobox
              id="convert-municipality"
              label="Municipio"
              items={municipalities}
              value={values.address.municipality}
              itemLabel={(item) => `${item.department.name} - ${item.name}`}
              onChange={(municipality) =>
                setValues((current) => ({ ...current, address: { ...current.address, municipality } }))
              }
              error={errors["address.municipality"]}
            />
            <CatalogCombobox
              id="convert-calendar"
              label="Calendario"
              items={calendars}
              value={values.additionalInfo.calendar}
              onChange={(calendar) =>
                setValues((current) => ({ ...current, additionalInfo: { ...current.additionalInfo, calendar } }))
              }
              error={errors["additionalInfo.calendar"]}
            />
            <CatalogCombobox
              id="convert-ownership"
              label="Naturaleza jurídica"
              items={ownershipTypes}
              value={values.basicInfo.ownershipType}
              onChange={(ownershipType) => setBasic({ ownershipType })}
              error={errors["basicInfo.ownershipType"]}
            />
            <CatalogCombobox
              id="convert-modality"
              label="Modalidad de prestación del servicio"
              items={modalities}
              value={values.basicInfo.serviceModality}
              onChange={(serviceModality) => setBasic({ serviceModality })}
              error={errors["basicInfo.serviceModality"]}
            />
          </div>

          <UserDetailsForm
            role="RECTOR"
            layout="essentials"
            title="Rector"
            fieldPrefix="principal"
            value={values.principal}
            onChange={(principal) => setValues((current) => ({ ...current, principal }))}
            invalidFields={invalidFields}
            errors={errors}
            showValidation={hasSubmitted}
            onMatched={(found) => {
              principalMatchRef.current = found && !found.id ? found : null
            }}
          />
          <UserDetailsForm
            role="SECRETARY"
            layout="essentials"
            title="Secretaria (opcional)"
            fieldPrefix="secretary"
            required={false}
            value={values.secretary}
            onChange={(secretary) => setValues((current) => ({ ...current, secretary }))}
            invalidFields={invalidFields}
            errors={errors}
            showValidation={hasSubmitted}
            onMatched={(found) => {
              secretaryMatchRef.current = found && !found.id ? found : null
            }}
          />

          {inCourse ? (
            <Alert variant="warning">
              <WarningIcon aria-hidden />
              <AlertDescription>
                La sede tiene procesos en curso: {inCourse}. Confirme con el establecimiento antes de continuar.
              </AlertDescription>
            </Alert>
          ) : null}
        </form>

        <DialogFooter>
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            size="sm"
            type="submit"
            form="convert-campus-form"
            color="primary"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <BankIcon data-icon="inline-start" />
            )}
            Convertir y guardar
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDiscardDialog {...discardDialogProps} />
    </Dialog>
  )
}

/** Convertir una sede anexa en establecimiento (Regla 92, solo Superadministrador). */
export function ConvertCampusDialog({ campus, open, onOpenChange, onConverted }: ConvertCampusDialogProps) {
  // Montado solo abierto: cada vez arranca de los datos de la sede.
  return open ? (
    <ConvertCampusForm campus={campus} onClose={() => onOpenChange(false)} onConverted={onConverted} />
  ) : null
}
