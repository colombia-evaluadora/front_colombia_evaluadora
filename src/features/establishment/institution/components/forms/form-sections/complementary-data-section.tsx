import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FormSectionHeading } from "@/components/form-section-heading"
import { DatePicker } from "@/components/date-picker"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

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

export function ComplementaryDataFormSection({ value, onChange, invalidFields = [], errors = {}, showValidation = false }: ComplementaryDataFormSectionProps) {
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    // Mensaje debajo del campo: solo tras el primer submit, igual que el borde rojo.
    const errorFor = (field: string) => (showValidation ? errors[field] : undefined)
    
    const {data: calendarios = []} = useCatalogQuery<CatalogItem>(CATALOGS.CALENDARIOS)
    const {data: rangosTarifas = []} = useCatalogQuery<CatalogItem>(CATALOGS.RANGO_TARIFAS)
    const {data: idiomas = []} = useCatalogQuery<CatalogItem>(CATALOGS.IDIOMAS)
    const {data: costRegimen = []} = useCatalogQuery<CatalogItem>(CATALOGS.COST_REGIMEN)
    const {data: disabilities = []} = useCatalogQuery<CatalogItem>(CATALOGS.DISABILITIES_ATTENDED)
    const {data: populationGenders = []} = useCatalogQuery<CatalogItem>(CATALOGS.POPULATION_GENDERS)

    const idiomaItems = withSeleccione(toSelectOptions(idiomas))
    const calendarioItems = withSeleccione(toSelectOptions(calendarios))
    const costRegimenItems = withSeleccione(toSelectOptions(costRegimen))
    const populationGenderItems = withSeleccione(toSelectOptions(populationGenders))
    const rangoTarifaItems = withSeleccione(toSelectOptions(rangosTarifas))
    const disabilityItems = withSeleccione(toSelectOptions(disabilities))

    // `gap-2` puertas adentro: encabezado y filas de esta sección van al mismo
    // paso. El salto mayor entre secciones lo pone el `gap-6` del formulario.
    return(
        <div className="grid gap-2">
            {/* Complementary information subsection */}
            <FormSectionHeading>
                Información complementaria
            </FormSectionHeading>
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
                    <Field orientation="vertical" variant="outlined" data-invalid={isInvalid("additionalInfo.approvalResolution") ? "true" : undefined}>
                        <FieldLabel htmlFor="approval-resolution">
                            Resolución de aprobación
                        </FieldLabel>

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

                    <Field orientation="vertical" variant="outlined" data-invalid={isInvalid("additionalInfo.teachingLanguage") ? "true" : undefined}>
                        <FieldLabel htmlFor="teaching-language">
                            Idioma de enseñanza
                        </FieldLabel>

                        <ComboboxField
                            id="teaching-language"
                            aria-invalid={isInvalid("additionalInfo.teachingLanguage")}
                            value={value.teachingLanguage?.id ?? null}
                            onValueChange={(selectedValue) => {
                                const option = idiomas.find((item) => item.id === selectedValue)
                                onChange({ ...value, teachingLanguage: option ?? null })
                            }}
                            items={toSelectItemsMap(idiomaItems)}
                        >
                            <ComboboxFieldTrigger aria-invalid={isInvalid("additionalInfo.teachingLanguage")}>
                                <ComboboxFieldValue placeholder="Seleccione" />
                            </ComboboxFieldTrigger>

                            <ComboboxFieldContent>
                                {idiomaItems.map((item) => (
                                    <ComboboxFieldItem key={item.value} value={item.value}>
                                        {item.label}
                                    </ComboboxFieldItem>
                                ))}
                            </ComboboxFieldContent>
                        </ComboboxField>
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
                    <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("additionalInfo.calendar") ? "true" : undefined}>
                        <FieldLabel htmlFor="establishment-calendario">Calendario</FieldLabel>
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
                            <ComboboxFieldTrigger className="w-full" aria-invalid={isInvalid("additionalInfo.calendar")}>
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
                    </Field>
                    <Field orientation="vertical" variant="outlined" data-invalid={isInvalid("additionalInfo.costRegime") ? "true" : undefined}>
                        <FieldLabel htmlFor="cost-regime">
                            Régimen de costo
                        </FieldLabel>

                        <ComboboxField
                            id="cost-regime"
                            aria-invalid={isInvalid("additionalInfo.costRegime")}
                            value={value.costRegime?.id ?? null}
                            onValueChange={(selectedValue) => {
                                const option = costRegimen.find((item) => item.id === selectedValue)
                                onChange({ ...value, costRegime: option ?? null })
                            }}
                            items={toSelectItemsMap(costRegimenItems)}
                        >
                            <ComboboxFieldTrigger aria-invalid={isInvalid("additionalInfo.costRegime")}>
                                <ComboboxFieldValue placeholder="Seleccione" />
                            </ComboboxFieldTrigger>

                            <ComboboxFieldContent>
                                {costRegimenItems.map((item) => (
                                    <ComboboxFieldItem key={item.value} value={item.value}>
                                        {item.label}
                                    </ComboboxFieldItem>
                                ))}
                            </ComboboxFieldContent>
                        </ComboboxField>
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
                    <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("additionalInfo.populationGender") ? "true" : undefined}>
                        <FieldLabel htmlFor="establishment-genero">Género de la población atendida</FieldLabel>
                        <ComboboxField
                            id="establishment-genero"
                            aria-invalid={isInvalid("additionalInfo.populationGender")}
                            value={value.populationGender?.id ?? null}
                            onValueChange={(selectedValue) => {
                                const option = populationGenders.find((item) => item.id === selectedValue)
                                onChange({ ...value, populationGender: option ?? null })
                            }}
                            items={toSelectItemsMap(populationGenderItems)}
                        >
                            <ComboboxFieldTrigger className="w-full" aria-invalid={isInvalid("additionalInfo.populationGender")}>
                                <ComboboxFieldValue placeholder="Seleccione" />
                            </ComboboxFieldTrigger>
                            <ComboboxFieldContent>
                                {populationGenderItems.map((item) => (
                                    <ComboboxFieldItem key={item.value} value={item.value}>
                                        {item.label}
                                    </ComboboxFieldItem>
                                ))}
                            </ComboboxFieldContent>
                        </ComboboxField>
                    </Field>

                    <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("additionalInfo.tuitionRange") ? "true" : undefined}>
                        <FieldLabel htmlFor="establishment-rango">Rango tarifas</FieldLabel>
                        <ComboboxField
                            id="establishment-rango"
                            aria-invalid={isInvalid("additionalInfo.tuitionRange")}
                            value={value.tuitionRange?.id ?? null}
                            onValueChange={(selectedValue) => {
                                const option = rangosTarifas.find((item) => item.id === selectedValue)
                                onChange({ ...value, tuitionRange: option ?? null })
                            }}
                            items={toSelectItemsMap(rangoTarifaItems)}
                        >
                            <ComboboxFieldTrigger className="w-full" aria-invalid={isInvalid("additionalInfo.tuitionRange")}>
                                <ComboboxFieldValue placeholder="Seleccione" />
                            </ComboboxFieldTrigger>
                            <ComboboxFieldContent>
                                {rangoTarifaItems.map((item) => (
                                    <ComboboxFieldItem key={item.value} value={item.value}>
                                        {item.label}
                                    </ComboboxFieldItem>
                                ))}
                            </ComboboxFieldContent>
                        </ComboboxField>
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
                    <Field orientation="vertical" variant="outlined" data-invalid={isInvalid("additionalInfo.disabilityType") ? "true" : undefined}>
                        <FieldLabel htmlFor="disabilities">
                            Discapacidades atendidas
                        </FieldLabel>

                        <ComboboxField
                            id="disabilities"
                            aria-invalid={isInvalid("additionalInfo.disabilityType")}
                            value={value.disabilityType?.id ?? null}
                            onValueChange={(selectedValue) => {
                                const option = disabilities.find((item) => item.id === selectedValue)
                                onChange({ ...value, disabilityType: option ?? null })
                            }}
                            items={toSelectItemsMap(disabilityItems)}
                        >
                            <ComboboxFieldTrigger aria-invalid={isInvalid("additionalInfo.disabilityType")}>
                                <ComboboxFieldValue placeholder="Seleccione" />
                            </ComboboxFieldTrigger>

                            <ComboboxFieldContent>
                                {disabilityItems.map((item) => (
                                    <ComboboxFieldItem key={item.value} value={item.value}>
                                        {item.label}
                                    </ComboboxFieldItem>
                                ))}
                            </ComboboxFieldContent>
                        </ComboboxField>
                    </Field>

                    <Field orientation="vertical" variant="outlined" data-invalid={isInvalid("additionalInfo.licenseStatus") ? "true" : undefined}>
                        <FieldLabel htmlFor="license-status">
                            Licencia de funcionamiento
                        </FieldLabel>

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
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
                    {/* Mismo recuadro que los sí/no de periodo académico: la
                        etiqueta flota sobre el borde y el grupo comparte alto
                        con los inputs y selects de al lado. */}
                    <Field orientation="vertical" variant="outlined" className="w-full">
                        <FieldLabel>Atención a población perteneciente a etnias</FieldLabel>
                        <RadioGroup
                            value={value.ethnicAttention ? "si" : "no"}
                            onValueChange={(selectedValue) => onChange({ ...value, ethnicAttention: selectedValue === "si" })}
                            className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
                        >
                            <label className="flex items-center gap-2">
                                <RadioGroupItem value="si" id="etnias-si" />
                                Sí
                            </label>
                            <label className="flex items-center gap-2">
                                <RadioGroupItem value="no" id="etnias-no" />
                                No
                            </label>
                        </RadioGroup>
                    </Field>
                    <Field orientation="vertical" variant="outlined" data-invalid={isInvalid("additionalInfo.licenseDate") ? "true" : undefined}>
                        <FieldLabel htmlFor="license-date">
                            Fecha licencia
                        </FieldLabel>

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
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
                    <Field orientation="vertical" variant="outlined" className="w-full">
                        <FieldLabel>
                            Atención a población con talentos adicionales
                        </FieldLabel>

                        <RadioGroup
                            value={value.giftedAttention ? "si" : "no"}
                            onValueChange={(selectedValue) => onChange({ ...value, giftedAttention: selectedValue === "si" })}
                            className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
                        >

                            <label className="flex items-center gap-2">
                                <RadioGroupItem value="si" id="talentos-si" />
                                Sí
                            </label>

                            <label className="flex items-center gap-2">
                                <RadioGroupItem value="no" id="talentos-no" />
                                No
                            </label>

                        </RadioGroup>
                    </Field>
                    <Field orientation="vertical" variant="outlined" className="w-full">
                        <FieldLabel>Ofrece subsidio</FieldLabel>
                        <RadioGroup
                            value={value.subsidy ? "si" : "no"}
                            onValueChange={(selectedValue) => onChange({ ...value, subsidy: selectedValue === "si" })}
                            className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
                        >
                            <label className="flex items-center gap-2">
                                <RadioGroupItem value="si" id="subsidio-si" />
                                Sí
                            </label>
                            <label className="flex items-center gap-2">
                                <RadioGroupItem value="no" id="subsidio-no" />
                                No
                            </label>
                        </RadioGroup>
                    </Field>
                </div>
        </div>
    )
}