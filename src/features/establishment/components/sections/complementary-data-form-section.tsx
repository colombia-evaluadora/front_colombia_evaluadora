import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FormSectionHeading } from "@/components/form-section-heading"
import { DatePicker } from "@/components/date-picker"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import type { CatalogItem } from "@/features/establishment/api/types/catalog"
import { useCatalogQuery } from "../../api/query/use-catalogs"
import { CATALOGS } from "@/lib/catalogs"
import { formatDateValue, parseDateValue } from "@/lib/date-time-value"
import type { EstablishmentDetails } from "../../api/types/establishment"

interface ComplementaryDataFormSectionProps {
    value: EstablishmentDetails["additionalInfo"]
    onChange: (value: EstablishmentDetails["additionalInfo"]) => void
    invalidFields?: string[]
    showValidation?: boolean
}

export function ComplementaryDataFormSection({ value, onChange, invalidFields = [], showValidation = false }: ComplementaryDataFormSectionProps) {
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    
    const {data: calendarios = []} = useCatalogQuery<CatalogItem>(CATALOGS.CALENDARIOS)
    const {data: rangosTarifas = []} = useCatalogQuery<CatalogItem>(CATALOGS.RANGO_TARIFAS)
    const {data: idiomas = []} = useCatalogQuery<CatalogItem>(CATALOGS.IDIOMAS)
    const {data: costRegimen = []} = useCatalogQuery<CatalogItem>(CATALOGS.COST_REGIMEN)
    const {data: disabilities = []} = useCatalogQuery<CatalogItem>(CATALOGS.DISABILITIES)
    const {data: licenseStatuses = []} = useCatalogQuery<CatalogItem>(CATALOGS.LICENSE_STATUSES)
    const {data: populationGenders = []} = useCatalogQuery<CatalogItem>(CATALOGS.POPULATION_GENDERS)

    const idiomaItems = idiomas.map((item: CatalogItem) => ({ value: item.id, label: item.name }))
    const calendarioItems = calendarios.map((c: CatalogItem) => ({ value: c.id, label: c.name }))
    const costRegimenItems = costRegimen.map((item: CatalogItem) => ({ value: item.id, label: item.name }))
    const populationGenderItems = populationGenders.map((g: CatalogItem) => ({ value: g.id, label: g.name }))
    const rangoTarifaItems = rangosTarifas.map((r: CatalogItem) => ({ value: r.id, label: r.name }))
    const disabilityItems = disabilities.map((item: CatalogItem) => ({ value: item.id, label: item.name }))
    const licenseStatusItems = licenseStatuses.map((item: CatalogItem) => ({ value: item.id, label: item.name }))

    return(
        <>
            {/* Complementary information subsection */}
            <FormSectionHeading>
                Información complementaria
            </FormSectionHeading>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field orientation="vertical" variant="outlined" data-invalid={isInvalid("additionalInfo.approvalResolution") ? "true" : undefined}>
                        <FieldLabel htmlFor="approval-resolution">
                            Resolución de aprobación
                        </FieldLabel>

                        <Input
                            id="approval-resolution"
                            placeholder="Agregar"
                            value={value.approvalResolution}
                            aria-invalid={isInvalid("additionalInfo.approvalResolution")}
                            onChange={(event) => onChange({ ...value, approvalResolution: event.target.value })}
                        />
                    </Field>

                    <Field orientation="vertical" variant="outlined" data-invalid={isInvalid("additionalInfo.teachingLanguage") ? "true" : undefined}>
                        <FieldLabel htmlFor="teaching-language">
                            Idioma de enseñanza
                        </FieldLabel>

                        <Select
                            id="teaching-language"
                            aria-invalid={isInvalid("additionalInfo.teachingLanguage")}
                            value={value.teachingLanguage.id}
                            onValueChange={(selectedValue) => {
                                const option = idiomas.find((item) => item.id === selectedValue)
                                onChange({ ...value, teachingLanguage: option ?? { id: selectedValue ?? "", code: selectedValue ?? "", name: selectedValue ?? "" } })
                            }}
                            items={idiomaItems}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>

                            <SelectContent>
                                {idiomaItems.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("additionalInfo.calendar") ? "true" : undefined}>
                        <FieldLabel htmlFor="establishment-calendario">Calendario</FieldLabel>
                        <Select
                            id="establishment-calendario"
                            aria-invalid={isInvalid("additionalInfo.calendar")}
                            value={value.calendar.id}
                            onValueChange={(selectedValue) => {
                                const option = calendarios.find((item) => item.id === selectedValue)
                                onChange({ ...value, calendar: option ?? { id: selectedValue ?? "", code: selectedValue ?? "", name: selectedValue ?? "" } })
                            }}
                            items={calendarioItems}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                                {calendarioItems.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field orientation="vertical" variant="outlined" data-invalid={isInvalid("additionalInfo.costRegime") ? "true" : undefined}>
                        <FieldLabel htmlFor="cost-regime">
                            Régimen de costo
                        </FieldLabel>

                        <Select
                            id="cost-regime"
                            aria-invalid={isInvalid("additionalInfo.costRegime")}
                            value={value.costRegime.id}
                            onValueChange={(selectedValue) => {
                                const option = costRegimen.find((item) => item.id === selectedValue)
                                onChange({ ...value, costRegime: option ?? { id: selectedValue ?? "", code: selectedValue ?? "", name: selectedValue ?? "" } })
                            }}
                            items={costRegimenItems}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>

                            <SelectContent>
                                {costRegimenItems.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("additionalInfo.populationGender") ? "true" : undefined}>
                        <FieldLabel htmlFor="establishment-genero">Género de la población atendida</FieldLabel>
                        <Select
                            id="establishment-genero"
                            aria-invalid={isInvalid("additionalInfo.populationGender")}
                            value={value.populationGender.id}
                            onValueChange={(selectedValue) => {
                                const option = populationGenders.find((item) => item.id === selectedValue)
                                onChange({ ...value, populationGender: option ?? { id: selectedValue ?? "", code: selectedValue ?? "", name: selectedValue ?? "" } })
                            }}
                            items={populationGenderItems}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                                {populationGenderItems.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("additionalInfo.tuitionRange") ? "true" : undefined}>
                        <FieldLabel htmlFor="establishment-rango">Rango tarifas</FieldLabel>
                        <Select
                            id="establishment-rango"
                            aria-invalid={isInvalid("additionalInfo.tuitionRange")}
                            value={value.tuitionRange.id}
                            onValueChange={(selectedValue) => {
                                const option = rangosTarifas.find((item) => item.id === selectedValue)
                                onChange({ ...value, tuitionRange: option ?? { id: selectedValue ?? "", code: selectedValue ?? "", name: selectedValue ?? "" } })
                            }}
                            items={rangoTarifaItems}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                                {rangoTarifaItems.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field orientation="vertical" variant="outlined" data-invalid={isInvalid("additionalInfo.disabilityType") ? "true" : undefined}>
                        <FieldLabel htmlFor="disabilities">
                            Discapacidades atendidas
                        </FieldLabel>

                        <Select
                            id="disabilities"
                            aria-invalid={isInvalid("additionalInfo.disabilityType")}
                            value={value.disabilityType.id}
                            onValueChange={(selectedValue) => {
                                const option = disabilities.find((item) => item.id === selectedValue)
                                onChange({ ...value, disabilityType: option ?? { id: selectedValue ?? "", code: selectedValue ?? "", name: selectedValue ?? "" } })
                            }}
                            items={disabilityItems}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>

                            <SelectContent>
                                {disabilityItems.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field orientation="vertical" variant="outlined" data-invalid={isInvalid("additionalInfo.licenseStatus") ? "true" : undefined}>
                        <FieldLabel htmlFor="license-status">
                            Licencia de funcionamiento
                        </FieldLabel>

                        <Select
                            id="license-status"
                            aria-invalid={isInvalid("additionalInfo.licenseStatus")}
                            value={value.licenseStatus.id}
                            onValueChange={(selectedValue) => {
                                const option = licenseStatuses.find((item) => item.id === selectedValue)
                                onChange({ ...value, licenseStatus: option ?? { id: selectedValue ?? "", code: selectedValue ?? "", name: selectedValue ?? "" } })
                            }}
                            items={licenseStatusItems}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>

                            <SelectContent>
                                {licenseStatusItems.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Mismo recuadro que los sí/no de periodo académico: la
                        etiqueta flota sobre el borde y el grupo comparte alto
                        con los inputs y selects de al lado. */}
                    <Field orientation="vertical" variant="outlined" className="w-full">
                        <FieldLabel>Atención a población perteneciente a etnias</FieldLabel>
                        <RadioGroup
                            value={value.ethnicAttention ? "si" : "no"}
                            onValueChange={(selectedValue) => onChange({ ...value, ethnicAttention: selectedValue === "si" })}
                            className="flex min-h-10 items-center gap-6 rounded-md border border-input px-3"
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
                    <Field orientation="vertical" variant="outlined">
                        <FieldLabel htmlFor="license-date">
                            Fecha licencia
                        </FieldLabel>

                        <DatePicker
                            id="license-date"
                            mode="date"
                            value={parseDateValue(value.licenseDate)}
                            onChange={(date) => onChange({ ...value, licenseDate: formatDateValue(date) })}
                        />
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field orientation="vertical" variant="outlined" className="w-full">
                        <FieldLabel>
                            Atención a población con talentos adicionales
                        </FieldLabel>

                        <RadioGroup
                            value={value.giftedAttention ? "si" : "no"}
                            onValueChange={(selectedValue) => onChange({ ...value, giftedAttention: selectedValue === "si" })}
                            className="flex min-h-10 items-center gap-6 rounded-md border border-input px-3"
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
                            className="flex min-h-10 items-center gap-6 rounded-md border border-input px-3"
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
        </>
    )
}