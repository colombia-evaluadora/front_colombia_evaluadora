import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FormSectionHeading } from "@/components/form-section-heading"
import {
    Select,
    SelectContent,
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
    /** Mensaje de error por ruta de campo. */
    errors?: Record<string, string>
    showValidation?: boolean
}

export function DomicilioDataFormSection({ value, onChange, invalidFields = [], errors = {}, showValidation = false }: DomicilioDataFormSectionProps) {
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    // Mensaje debajo del campo: solo tras el primer submit, igual que el borde rojo.
    const errorFor = (field: string) => (showValidation ? errors[field] : undefined)
    const { data: municipalities = [] } = useCatalogQuery<Municipality>(CATALOGS.MUNICIPALITIES)
    const { data: zones = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ZONES)
    const municipalityItems = municipalities.map((municipality) => ({
        value: municipality.id,
        label: `${municipality.id} - ${municipality.name}`,
    }))
    const zoneItems = zones.map((zone) => ({ value: zone.id, label: zone.name }))

    // `gap-2` puertas adentro: encabezado y filas de esta sección van al mismo
    // paso. El salto mayor entre secciones lo pone el `gap-6` del formulario.
    return (
        <div className="grid gap-2">
            <FormSectionHeading>
                Domicilio
            </FormSectionHeading>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("address.municipality") ? "true" : undefined}>
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
                        items={municipalityItems}
                    >
                        <SelectTrigger aria-invalid={isInvalid("address.municipality")}>
                            <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>

                        <SelectContent>
                            {municipalityItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldError>{errorFor("address.municipality")}</FieldError>
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full">
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
items={zoneItems}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>

                        <SelectContent>
                            {zoneItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="establishment-barrio">Barrio</FieldLabel>
                    <Input
                        id="establishment-barrio"
                        placeholder="Agregar"
                        value={value.district.name}
                        onChange={(event) => onChange({ ...value, district: { ...value.district, id: event.target.value, code: event.target.value, name: event.target.value } })}
                    />
                </Field>
            </div>

            <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="establishment-address">Dirección</FieldLabel>
                    <Input
                        id="establishment-address"
                        placeholder="Agregar"
                        value={value.address}
                        onChange={(event) => onChange({ ...value, address: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="establishment-comuna">Comuna</FieldLabel>
                    <Input
                        id="establishment-comuna"
                        placeholder="Agregar"
                        value={value.commune.name}
                        onChange={(event) => onChange({ ...value, commune: { ...value.commune, id: event.target.value, code: event.target.value, name: event.target.value } })}
                    />
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="establishment-localidad">Localidad</FieldLabel>
                    <Input
                        id="establishment-localidad"
                        placeholder="Agregar"
                        value={value.locality.name}
                        onChange={(event) => onChange({ ...value, locality: { ...value.locality, id: event.target.value, code: event.target.value, name: event.target.value } })}
                    />
                </Field>
            </div>

        </div>
    )
}