import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { GENDERS } from "@/mocks/db/catalogs/genders"
import type { CatalogItem } from "@/features/establishment/api/types/catalog"
import { useCatalogQuery } from "../../api/query/use-catalogs"
import { CATALOGS } from "@/lib/catalogs"
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

    return(
        <>
            {/* Complementary information subsection */}
            <h3 className="text-base font-semibold">
                Información complementaria
            </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field orientation="vertical" data-invalid={isInvalid("additionalInfo.approvalResolution") ? "true" : undefined}>
                        <FieldLabel htmlFor="approval-resolution">
                            Resolución de aprobación
                        </FieldLabel>

                        <Input
                            id="approval-resolution"
                            placeholder="Resolución No. 0123 Mayo de 2001"
                            value={value.approvalResolution}
                            aria-invalid={isInvalid("additionalInfo.approvalResolution")}
                            onChange={(event) => onChange({ ...value, approvalResolution: event.target.value })}
                        />
                    </Field>

                    <Field orientation="vertical" data-invalid={isInvalid("additionalInfo.teachingLanguage") ? "true" : undefined}>
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
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectGroup>
                                    {idiomas.map((item: CatalogItem) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field orientation="vertical" className="w-full" data-invalid={isInvalid("additionalInfo.calendar") ? "true" : undefined}>
                        <FieldLabel htmlFor="establishment-calendario">Calendario</FieldLabel>
                        <Select
                            id="establishment-calendario"
                            aria-invalid={isInvalid("additionalInfo.calendar")}
                            value={value.calendar.id}
                            onValueChange={(selectedValue) => {
                                const option = calendarios.find((item) => item.id === selectedValue)
                                onChange({ ...value, calendar: option ?? { id: selectedValue ?? "", code: selectedValue ?? "", name: selectedValue ?? "" } })
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {calendarios.map((c: CatalogItem) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field orientation="vertical" data-invalid={isInvalid("additionalInfo.costRegime") ? "true" : undefined}>
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
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectGroup>
                                    {costRegimen.map((item: CatalogItem) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field orientation="vertical" className="w-full" data-invalid={isInvalid("additionalInfo.populationGender") ? "true" : undefined}>
                        <FieldLabel htmlFor="establishment-genero">Género de la población atendida</FieldLabel>
                        <Select
                            id="establishment-genero"
                            aria-invalid={isInvalid("additionalInfo.populationGender")}
                            value={value.populationGender.id}
                            onValueChange={(selectedValue) => {
                                const option = GENDERS.find((item) => item.id === selectedValue)
                                onChange({ ...value, populationGender: option ?? { id: selectedValue ?? "", code: selectedValue ?? "", name: selectedValue ?? "" } })
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {GENDERS.map((g: CatalogItem) => (
                                        <SelectItem key={g.id} value={g.id}>
                                            {g.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field orientation="vertical" className="w-full" data-invalid={isInvalid("additionalInfo.tuitionRange") ? "true" : undefined}>
                        <FieldLabel htmlFor="establishment-rango">Rango tarifas</FieldLabel>
                        <Select
                            id="establishment-rango"
                            aria-invalid={isInvalid("additionalInfo.tuitionRange")}
                            value={value.tuitionRange.id}
                            onValueChange={(selectedValue) => {
                                const option = rangosTarifas.find((item) => item.id === selectedValue)
                                onChange({ ...value, tuitionRange: option ?? { id: selectedValue ?? "", code: selectedValue ?? "", name: selectedValue ?? "" } })
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {rangosTarifas.map((r: CatalogItem) => (
                                        <SelectItem key={r.id} value={r.id}>
                                            {r.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field orientation="vertical" data-invalid={isInvalid("additionalInfo.disabilityType") ? "true" : undefined}>
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
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectGroup>
                                    {disabilities.map((item: CatalogItem) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field orientation="vertical" data-invalid={isInvalid("additionalInfo.licenseStatus") ? "true" : undefined}>
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
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectGroup>
                                    {licenseStatuses.map((item: CatalogItem) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field orientation="vertical" className="w-full">
                        <FieldLabel>Atención a población perteneciente a etnias</FieldLabel>
                        <RadioGroup
                            value={value.ethnicAttention ? "si" : "no"}
                            onValueChange={(selectedValue) => onChange({ ...value, ethnicAttention: selectedValue === "si" })}
                            className="flex gap-3"
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
                    <Field orientation="vertical">
                        <FieldLabel htmlFor="license-date">
                            Fecha licencia
                        </FieldLabel>

                        <Input
                            id="license-date"
                            type="date"
                            value={value.licenseDate ?? ""}
                            onChange={(event) => onChange({ ...value, licenseDate: event.target.value || null })}
                        />
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field orientation="vertical" className="w-full">
                        <FieldLabel>
                            Atención a población con talentos adicionales
                        </FieldLabel>

                        <RadioGroup
                            value={value.giftedAttention ? "si" : "no"}
                            onValueChange={(selectedValue) => onChange({ ...value, giftedAttention: selectedValue === "si" })}
                            className="flex gap-3"
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
                    <Field orientation="vertical" className="w-full">
                        <FieldLabel>Ofrece subsidio</FieldLabel>
                        <RadioGroup
                            value={value.subsidy ? "si" : "no"}
                            onValueChange={(selectedValue) => onChange({ ...value, subsidy: selectedValue === "si" })}
                            className="flex gap-3"
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