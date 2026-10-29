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
import { useCatalogQuery, type CatalogSlug } from "@/features/establishment/employees/api/query/use-catalogs"
import { CATALOGS } from "@/lib/catalogs"
import { esSectorNoOficial } from "@/features/establishment/institution/utils/sector"
import { toSelectItemsMap, toSelectOptions, withSeleccione } from "@/lib/catalog-options"
import { formatDateValue, parseDateValue } from "@/lib/date-time-value"
import { toIdentificacionInput } from "@/features/establishment/shared/text-field-rules"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

type AdditionalInfo = EstablishmentDetails["additionalInfo"]

interface ComplementaryDataFormSectionProps {
    value: AdditionalInfo
    onChange: (value: AdditionalInfo) => void
    /** Sector derivado de la naturaleza jurídica; decide si se ven idioma y régimen tarifario. */
    sector: string
    invalidFields?: string[]
    /** Mensaje de error por ruta de campo. */
    errors?: Record<string, string>
    showValidation?: boolean
}

// Fecha licencia: desde el 01/01/1900 hasta hoy (informe de diseño, 2.1).
const LICENCIA_MIN = new Date(1900, 0, 1)

const CALCULADO = "Lo calcula el sistema con las matrículas Cursando de los periodos abiertos."

/** Campo calculado: solo lectura, con candado. */
function CalculatedField({ id, label, value, className, description = CALCULADO }: {
    id: string
    label: string
    value: string
    className?: string
    description?: string
}) {
    return (
        <Field orientation="vertical" variant="outlined" className={className}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <div className="relative">
                <Input id={id} readOnly disabled value={value} className="pr-9" />
                <LockIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <FieldDescription>{description}</FieldDescription>
        </Field>
    )
}

/** Selector de un catálogo de `TLISTA_VALOR` sobre un campo `CatalogItem` de la sección. */
function CatalogSelectField({ id, label, catalog, value, onChange, invalid, error, className }: {
    id: string
    label: string
    catalog: CatalogSlug
    value: CatalogItem | null
    onChange: (item: CatalogItem | null) => void
    invalid?: boolean
    error?: string
    className?: string
}) {
    const { data: items = [] } = useCatalogQuery<CatalogItem>(catalog)
    const options = withSeleccione(toSelectOptions(items))
    return (
        <Field orientation="vertical" variant="outlined" className={className} data-invalid={invalid ? "true" : undefined}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <ComboboxField
                id={id}
                aria-invalid={invalid}
                value={value?.id ?? null}
                onValueChange={(selected) => onChange(items.find((item) => item.id === selected) ?? null)}
                items={toSelectItemsMap(options)}
            >
                <ComboboxFieldTrigger aria-invalid={invalid}>
                    <ComboboxFieldValue placeholder="Seleccione" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                    {options.map((item) => (
                        <ComboboxFieldItem key={item.value} value={item.value}>
                            {item.label}
                        </ComboboxFieldItem>
                    ))}
                </ComboboxFieldContent>
            </ComboboxField>
            <FieldError>{error}</FieldError>
        </Field>
    )
}

/**
 * Género de la población, grupos étnicos, talentos y subsidio no se digitan:
 * los calcula el sistema (V571.2) y llegan en el detalle. Idioma de enseñanza y
 * régimen tarifario solo aplican al sector No oficial (Regla 90).
 */
export function ComplementaryDataFormSection({ value, onChange, sector, invalidFields = [], errors = {}, showValidation = false }: ComplementaryDataFormSectionProps) {
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    // Mensaje debajo del campo: solo tras el primer submit, igual que el borde rojo.
    const errorFor = (field: string) => (showValidation ? errors[field] : undefined)
    const noOficial = esSectorNoOficial(sector)
    // En el alta todavía no hay matrículas.
    const poblacion = value.population ?? { gender: "Sin estudiantes", ethnicGroups: false, exceptionalTalents: false, subsidy: false }
    const siNo = (valor: boolean) => (valor ? "Sí" : "No")

    return (
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-12">
            <CatalogSelectField
                id="establishment-calendario"
                label="Calendario*"
                catalog={CATALOGS.CALENDARIOS}
                value={value.calendar}
                onChange={(calendar) => onChange({ ...value, calendar })}
                invalid={isInvalid("additionalInfo.calendar")}
                error={errorFor("additionalInfo.calendar")}
                className="w-full md:col-span-3"
            />

            <Field orientation="vertical" variant="outlined" className="w-full md:col-span-5" data-invalid={isInvalid("additionalInfo.approvalResolution") ? "true" : undefined}>
                <FieldLabel htmlFor="approval-resolution">Resolución de aprobación</FieldLabel>
                <Input
                    id="approval-resolution"
                    placeholder="Agregar"
                    maxLength={100}
                    value={value.approvalResolution}
                    aria-invalid={isInvalid("additionalInfo.approvalResolution")}
                    onChange={(event) => onChange({ ...value, approvalResolution: toIdentificacionInput(event.target.value, 100) })}
                />
                <FieldError>{errorFor("additionalInfo.approvalResolution")}</FieldError>
            </Field>

            <CalculatedField
                id="establishment-genero"
                label="Género de la población atendida"
                value={poblacion.gender}
                description="Calculado con el género de los estudiantes matriculados."
                className="w-full md:col-span-4"
            />

            {noOficial ? (
                <>
                    <CatalogSelectField
                        id="teaching-language"
                        label="Idioma de enseñanza"
                        catalog={CATALOGS.IDIOMAS}
                        value={value.teachingLanguage}
                        onChange={(teachingLanguage) => onChange({ ...value, teachingLanguage })}
                        className="w-full md:col-span-6"
                    />
                    <CatalogSelectField
                        id="cost-regime"
                        label="Régimen tarifario"
                        catalog={CATALOGS.COST_REGIMEN}
                        value={value.costRegime}
                        onChange={(costRegime) => onChange({ ...value, costRegime })}
                        className="w-full md:col-span-6"
                    />
                </>
            ) : null}

            <Field orientation="vertical" variant="outlined" className="w-full md:col-span-8" data-invalid={isInvalid("additionalInfo.licenseStatus") ? "true" : undefined}>
                <FieldLabel htmlFor="license-status">Licencia de funcionamiento</FieldLabel>
                <Input
                    id="license-status"
                    placeholder="Agregar"
                    maxLength={100}
                    value={value.licenseStatus}
                    aria-invalid={isInvalid("additionalInfo.licenseStatus")}
                    onChange={(event) => onChange({ ...value, licenseStatus: toIdentificacionInput(event.target.value, 100) })}
                />
                <FieldError>{errorFor("additionalInfo.licenseStatus")}</FieldError>
            </Field>

            <Field orientation="vertical" variant="outlined" className="w-full md:col-span-4" data-invalid={isInvalid("additionalInfo.licenseDate") ? "true" : undefined}>
                <FieldLabel htmlFor="license-date">Fecha licencia</FieldLabel>
                <DatePicker
                    id="license-date"
                    mode="date"
                    // Fecha de expedición: no puede ser futura.
                    minDate={LICENCIA_MIN}
                    maxDate={new Date()}
                    value={parseDateValue(value.licenseDate)}
                    onChange={(date) => onChange({ ...value, licenseDate: formatDateValue(date) })}
                />
                <FieldError>{errorFor("additionalInfo.licenseDate")}</FieldError>
            </Field>

            <CalculatedField
                id="ethnic-attention"
                label="Atiende población perteneciente a grupos étnicos"
                value={siNo(poblacion.ethnicGroups)}
                className="w-full md:col-span-4"
            />
            <CalculatedField
                id="gifted-attention"
                label="Atiende población con capacidades o talentos excepcionales"
                value={siNo(poblacion.exceptionalTalents)}
                className="w-full md:col-span-4"
            />
            <CalculatedField
                id="subsidy"
                label="Ofrece subsidio"
                value={siNo(poblacion.subsidy)}
                className="w-full md:col-span-4"
            />
        </div>
    )
}
