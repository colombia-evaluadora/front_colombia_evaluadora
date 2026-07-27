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

export function DomicilioDataFormSection() {
    const { data: municipalities = [] } = useCatalogQuery<Municipality>(CATALOGS.MUNICIPALITIES)
    const { data: zones = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ZONES)
    return (
        <>
            <h3 className="text-base font-semibold">
                Domicilio
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-municipio">Municipio*</FieldLabel>
                    <Select>
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
                    <Select>
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
                    <Input id="establishment-barrio" placeholder="La Cumbre" />
                </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-address">Dirección</FieldLabel>
                    <Input id="establishment-address" placeholder="Calle 56 No. 16 - 18" />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-comuna">Comuna</FieldLabel>
                    <Input id="establishment-comuna" placeholder="10" />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-localidad">Localidad</FieldLabel>
                    <Input id="establishment-localidad" placeholder="De la virgen y turistica" />
                </Field>
            </div>

        </>
    )
}