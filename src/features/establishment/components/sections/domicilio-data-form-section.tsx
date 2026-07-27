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
import { CATALOGS } from "@/lib/catalogs"
import type { Municipality } from "../../api/types/location"
import { useCatalogQuery } from "../../api/query/use-catalogs"
import type { CatalogItem } from "../../api/types/catalog"
import type { EstablishmentDetails } from "../../api/types/establishment"

interface DomicilioDataFormSectionProps {
    value: EstablishmentDetails["address"]
    onChange: (value: EstablishmentDetails["address"]) => void
    invalidFields?: string[]
    showValidation?: boolean
}

export function DomicilioDataFormSection({ value, onChange, invalidFields = [], showValidation = false }: DomicilioDataFormSectionProps) {
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    const { data: municipalities = [] } = useCatalogQuery<Municipality>(CATALOGS.MUNICIPALITIES)
    const { data: zones = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ZONES)

    return (
        <>
            <h3 className="text-base font-semibold">
                Domicilio
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field orientation="vertical" className="w-full" data-invalid={isInvalid("address.municipality") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-municipio">Municipio*</FieldLabel>
                    <Select
                        value={value.municipality.id}
                        aria-invalid={isInvalid("address.municipality")}
                        onValueChange={(selectedValue) => {
                            const municipality = municipalities.find((item) => item.id === selectedValue)
                            onChange({
                                ...value,
                                municipality: municipality ?? {
                                    id: selectedValue ?? "",
                                    code: selectedValue ?? "",
                                    name: selectedValue ?? "",
                                    department: { id: "", code: "", name: "" },
                                },
                            })
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione municipio" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectGroup>
                                {municipalities.map((municipality) => (
                                    <SelectItem
                                        key={municipality.id}
                                        value={municipality.id}
                                    >
                                        {municipality.id} - {municipality.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-zone">Zona</FieldLabel>
                    <Select
                        value={value.zone.id}
                        onValueChange={(selectedValue) => {
                            const option = zones.find((item) => item.id === selectedValue)
                            onChange({
                                ...value,
                                zone: option ?? { id: selectedValue ?? "", code: selectedValue ?? "", name: selectedValue ?? "" },
                            })
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Urbana" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectGroup>
                                {zones.map((zone) => (
                                    <SelectItem
                                        key={zone.id}
                                        value={zone.id}
                                    >
                                        {zone.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-barrio">Barrio</FieldLabel>
                    <Input
                        id="establishment-barrio"
                        placeholder="La Cumbre"
                        value={value.district.name}
                        onChange={(event) => onChange({ ...value, district: { ...value.district, id: event.target.value, code: event.target.value, name: event.target.value } })}
                    />
                </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-address">Dirección</FieldLabel>
                    <Input
                        id="establishment-address"
                        placeholder="Calle 56 No. 16 - 18"
                        value={value.address}
                        onChange={(event) => onChange({ ...value, address: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-comuna">Comuna</FieldLabel>
                    <Input
                        id="establishment-comuna"
                        placeholder="10"
                        value={value.commune.name}
                        onChange={(event) => onChange({ ...value, commune: { ...value.commune, id: event.target.value, code: event.target.value, name: event.target.value } })}
                    />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-localidad">Localidad</FieldLabel>
                    <Input
                        id="establishment-localidad"
                        placeholder="De la virgen y turistica"
                        value={value.locality.name}
                        onChange={(event) => onChange({ ...value, locality: { ...value.locality, id: event.target.value, code: event.target.value, name: event.target.value } })}
                    />
                </Field>
            </div>

        </>
    )
}