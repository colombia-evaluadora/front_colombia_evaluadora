import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/date-picker"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { LockIcon } from "@/components/ui/icons"

import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { CATALOGS } from "@/lib/catalogs"
import { toSelectItemsMap, toSelectOptions, withSeleccione } from "@/lib/catalog-options"
import { formatDateValue, parseDateValue } from "@/lib/date-time-value"
import { toIdentificacionInput } from "@/features/establishment/shared/text-field-rules"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

interface ComplementaryDataFormSectionProps {
    value: EstablishmentDetails["additionalInfo"]
    onChange: (value: EstablishmentDetails["additionalInfo"]) => void
    invalidFields?: string[]
    /** Mensaje de error por ruta de campo. */
    errors?: Record<string, string>
    showValidation?: boolean
}

const SI_NO_ITEMS = { si: "Sí", no: "No" }

/** Sí/No como select, igual que el resto de selects de la sección. */
function SiNoField({ id, label, value, onChange, className }: {
    id: string
    label: string
    value: boolean
    onChange: (value: boolean) => void
    className?: string
}) {
    return (
        <Field orientation="vertical" variant="outlined" className={className}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <ComboboxField
                id={id}
                value={value ? "si" : "no"}
                onValueChange={(selected) => onChange(selected === "si")}
                items={SI_NO_ITEMS}
            >
                <ComboboxFieldTrigger>
                    <ComboboxFieldValue placeholder="Seleccione" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                    <ComboboxFieldItem value="si">Sí</ComboboxFieldItem>
                    <ComboboxFieldItem value="no">No</ComboboxFieldItem>
                </ComboboxFieldContent>
            </ComboboxField>
        </Field>
    )
}

/**
 * Idioma, régimen de costo, rango de tarifas, discapacidades atendidas y
 * talentos ya no se muestran: el formulario conserva lo que tenga cada EE
 * (`fn_est_actualizar` deja como está lo que llega en NULL).
 */
export function ComplementaryDataFormSection({ value, onChange, invalidFields = [], errors = {}, showValidation = false }: ComplementaryDataFormSectionProps) {
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    // Mensaje debajo del campo: solo tras el primer submit, igual que el borde rojo.
    const errorFor = (field: string) => (showValidation ? errors[field] : undefined)

    const { data: calendarios = [] } = useCatalogQuery<CatalogItem>(CATALOGS.CALENDARIOS)
    const { data: populationGenders = [] } = useCatalogQuery<CatalogItem>(CATALOGS.POPULATION_GENDERS)
    const calendarioItems = withSeleccione(toSelectOptions(calendarios))
    // El detalle trae el género solo con su id: la etiqueta sale del catálogo.
    const generoPoblacion = populationGenders.find((item) => item.id === value.populationGender?.id)?.name ?? ""

    return (
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-12">
            <Field orientation="vertical" variant="outlined" className="w-full md:col-span-3" data-invalid={isInvalid("additionalInfo.calendar") ? "true" : undefined}>
                <FieldLabel htmlFor="establishment-calendario">Calendario*</FieldLabel>
                <ComboboxField
                    id="establishment-calendario"
                    aria-invalid={isInvalid("additionalInfo.calendar")}
                    value={value.calendar?.id ?? null}
                    onValueChange={(selectedValue) => {
                        const option = calendarios.find((item) => item.id === selectedValue)
                        onChange({ ...value, calendar: option ?? null })
                    }}
                    items={toSelectItemsMap(calendarioItems)}
                >
                    <ComboboxFieldTrigger aria-invalid={isInvalid("additionalInfo.calendar")}>
                        <ComboboxFieldValue placeholder="Seleccione" />
                    </ComboboxFieldTrigger>
                    <ComboboxFieldContent>
                        {calendarioItems.map((item) => (
                            <ComboboxFieldItem key={item.value} value={item.value}>
                                {item.label}
                            </ComboboxFieldItem>
                        ))}
                    </ComboboxFieldContent>
                </ComboboxField>
                <FieldError>{errorFor("additionalInfo.calendar")}</FieldError>
            </Field>

            <Field orientation="vertical" variant="outlined" className="w-full md:col-span-5" data-invalid={isInvalid("additionalInfo.approvalResolution") ? "true" : undefined}>
                <FieldLabel htmlFor="approval-resolution">Resolución de aprobación</FieldLabel>
                <Input
                    id="approval-resolution"
                    placeholder="Agregar"
                    // TESTABLECIMIENTO.RESOLUCION_APROBACION es VARCHAR(130).
                    maxLength={130}
                    value={value.approvalResolution}
                    aria-invalid={isInvalid("additionalInfo.approvalResolution")}
                    onChange={(event) => onChange({ ...value, approvalResolution: toIdentificacionInput(event.target.value) })}
                />
                <FieldError>{errorFor("additionalInfo.approvalResolution")}</FieldError>
            </Field>

            {/* Lo calcula el sistema: se muestra el valor guardado, sin editarlo. */}
            <Field orientation="vertical" variant="outlined" className="w-full md:col-span-4">
                <FieldLabel htmlFor="establishment-genero">Género de la población atendida</FieldLabel>
                <div className="relative">
                    <Input id="establishment-genero" readOnly disabled placeholder="—" value={generoPoblacion} className="pr-9" />
                    <LockIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                <FieldDescription>Calculado con el género de los estudiantes matriculados.</FieldDescription>
            </Field>

            <Field orientation="vertical" variant="outlined" className="w-full md:col-span-8" data-invalid={isInvalid("additionalInfo.licenseStatus") ? "true" : undefined}>
                <FieldLabel htmlFor="license-status">Licencia de funcionamiento</FieldLabel>
                <Input
                    id="license-status"
                    placeholder="Agregar"
                    // TESTABLECIMIENTO.LICENCIA_FUNCIONAMIENTO es VARCHAR(130).
                    maxLength={130}
                    value={value.licenseStatus}
                    aria-invalid={isInvalid("additionalInfo.licenseStatus")}
                    onChange={(event) => onChange({ ...value, licenseStatus: toIdentificacionInput(event.target.value) })}
                />
                <FieldError>{errorFor("additionalInfo.licenseStatus")}</FieldError>
            </Field>

            <Field orientation="vertical" variant="outlined" className="w-full md:col-span-4" data-invalid={isInvalid("additionalInfo.licenseDate") ? "true" : undefined}>
                <FieldLabel htmlFor="license-date">Fecha licencia</FieldLabel>
                <DatePicker
                    id="license-date"
                    mode="date"
                    // Fecha de expedición: no puede ser futura.
                    maxDate={new Date()}
                    value={parseDateValue(value.licenseDate)}
                    onChange={(date) => onChange({ ...value, licenseDate: formatDateValue(date) })}
                />
                <FieldError>{errorFor("additionalInfo.licenseDate")}</FieldError>
            </Field>

            <SiNoField
                id="ethnic-attention"
                label="Atiende población perteneciente a grupos étnicos"
                value={value.ethnicAttention}
                onChange={(ethnicAttention) => onChange({ ...value, ethnicAttention })}
                className="w-full md:col-span-8"
            />
            <SiNoField
                id="subsidy"
                label="Ofrece subsidio"
                value={value.subsidy}
                onChange={(subsidy) => onChange({ ...value, subsidy })}
                className="w-full md:col-span-4"
            />
        </div>
    )
}
