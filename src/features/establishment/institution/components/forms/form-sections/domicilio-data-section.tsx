import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CATALOGS } from "@/lib/catalogs"
import { toSelectItemsMap } from "@/lib/catalog-options"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import { toDireccionInput, toTextoInput } from "@/features/establishment/shared/text-field-rules"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

interface DomicilioDataFormSectionProps {
    value: EstablishmentDetails["address"]
    onChange: (value: EstablishmentDetails["address"]) => void
    invalidFields?: string[]
    /** Mensaje de error por ruta de campo. */
    errors?: Record<string, string>
    showValidation?: boolean
}

/**
 * Barrio, comuna y localidad no son catálogos: son texto libre con la forma de
 * `CatalogItem` para reusar el tipo de `address`. El `id` no se lee en ningún
 * otro lado, así que un 0 fijo alcanza.
 */
const textoLibre = (texto: string): CatalogItem => ({ id: 0, code: texto, name: texto })

export function DomicilioDataFormSection({ value, onChange, invalidFields = [], errors = {}, showValidation = false }: DomicilioDataFormSectionProps) {
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    // Mensaje debajo del campo: solo tras el primer submit, igual que el borde rojo.
    const errorFor = (field: string) => (showValidation ? errors[field] : undefined)
    const { data: municipalities = [] } = useMunicipalitiesQuery()
    const { data: zones = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ZONES)
    const municipalityItems = municipalities.map((municipality) => ({
        value: municipality.id,
        label: `${municipality.code} - ${municipality.department.name} - ${municipality.name}`,
    }))

    // Doce columnas: la segunda fila deja la comuna angosta, como en el diseño.
    return (
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-12">
            <Field orientation="vertical" variant="outlined" className="w-full md:col-span-4" data-invalid={isInvalid("address.municipality") ? "true" : undefined}>
                <FieldLabel htmlFor="establishment-municipio">Municipio*</FieldLabel>
                <ComboboxField
                    value={value.municipality?.id ?? null}
                    aria-invalid={isInvalid("address.municipality")}
                    onValueChange={(selectedValue) => {
                        const municipality = municipalities.find((item) => item.id === selectedValue)
                        if (municipality) onChange({ ...value, municipality })
                    }}
                    items={toSelectItemsMap(municipalityItems)}
                >
                    <ComboboxFieldTrigger aria-invalid={isInvalid("address.municipality")}>
                        <ComboboxFieldValue placeholder="Seleccione" />
                    </ComboboxFieldTrigger>
                    <ComboboxFieldContent>
                        {municipalityItems.map((item) => (
                            <ComboboxFieldItem key={item.value} value={item.value}>
                                {item.label}
                            </ComboboxFieldItem>
                        ))}
                    </ComboboxFieldContent>
                </ComboboxField>
                <FieldError>{errorFor("address.municipality")}</FieldError>
            </Field>

            {/* La zona va con radios: son pocas opciones y se leen todas de un vistazo. */}
            <Field orientation="vertical" className="w-full md:col-span-4" data-invalid={isInvalid("address.zone") ? "true" : undefined}>
                <FieldLabel id="establishment-zone-label">Zona*</FieldLabel>
                <RadioGroup
                    aria-labelledby="establishment-zone-label"
                    value={value.zone?.id != null ? String(value.zone.id) : ""}
                    onValueChange={(selectedValue) => {
                        const option = zones.find((item) => String(item.id) === selectedValue)
                        onChange({ ...value, zone: option ?? null })
                    }}
                    className="flex min-h-9 flex-wrap items-center gap-x-5 gap-y-1"
                >
                    {zones.map((zone) => (
                        <label key={zone.id} className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value={String(zone.id)} aria-invalid={isInvalid("address.zone")} />
                            {zone.name}
                        </label>
                    ))}
                </RadioGroup>
                <FieldError>{errorFor("address.zone")}</FieldError>
            </Field>

            <Field orientation="vertical" variant="outlined" className="w-full md:col-span-4" data-invalid={isInvalid("address.district") ? "true" : undefined}>
                <FieldLabel htmlFor="establishment-barrio">Barrio</FieldLabel>
                <Input
                    id="establishment-barrio"
                    placeholder="Agregar"
                    // TESTABLECIMIENTO.BARRIO es VARCHAR(130).
                    maxLength={130}
                    value={value.district?.name ?? ""}
                    aria-invalid={isInvalid("address.district")}
                    onChange={(event) => onChange({ ...value, district: textoLibre(toTextoInput(event.target.value)) })}
                />
                <FieldError>{errorFor("address.district")}</FieldError>
            </Field>

            <Field orientation="vertical" variant="outlined" className="w-full md:col-span-2" data-invalid={isInvalid("address.commune") ? "true" : undefined}>
                <FieldLabel htmlFor="establishment-comuna">Comuna</FieldLabel>
                <Input
                    id="establishment-comuna"
                    placeholder="Agregar"
                    // TESTABLECIMIENTO.COMUNA es VARCHAR(130).
                    maxLength={130}
                    value={value.commune?.name ?? ""}
                    aria-invalid={isInvalid("address.commune")}
                    onChange={(event) => onChange({ ...value, commune: textoLibre(toTextoInput(event.target.value)) })}
                />
                <FieldError>{errorFor("address.commune")}</FieldError>
            </Field>

            <Field orientation="vertical" variant="outlined" className="w-full md:col-span-5" data-invalid={isInvalid("address.locality") ? "true" : undefined}>
                <FieldLabel htmlFor="establishment-localidad">Localidad</FieldLabel>
                <Input
                    id="establishment-localidad"
                    placeholder="Agregar"
                    // TESTABLECIMIENTO.LOCALIDAD es VARCHAR(130).
                    maxLength={130}
                    value={value.locality?.name ?? ""}
                    aria-invalid={isInvalid("address.locality")}
                    onChange={(event) => onChange({ ...value, locality: textoLibre(toTextoInput(event.target.value)) })}
                />
                <FieldError>{errorFor("address.locality")}</FieldError>
            </Field>

            <Field orientation="vertical" variant="outlined" className="w-full md:col-span-5" data-invalid={isInvalid("address.address") ? "true" : undefined}>
                <FieldLabel htmlFor="establishment-address">Dirección</FieldLabel>
                <Input
                    id="establishment-address"
                    placeholder="Agregar"
                    // TESTABLECIMIENTO.DIRECCION es VARCHAR(130).
                    maxLength={130}
                    value={value.address}
                    aria-invalid={isInvalid("address.address")}
                    onChange={(event) => onChange({ ...value, address: toDireccionInput(event.target.value) })}
                />
                <FieldError>{errorFor("address.address")}</FieldError>
            </Field>
        </div>
    )
}
