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

const {data: calendarios = []} = useCatalogQuery<CatalogItem>(CATALOGS.CALENDARIOS)
const {data: rangosTarifas = []} = useCatalogQuery<CatalogItem>(CATALOGS.RANGO_TARIFAS)
const {data: idiomas = []} = useCatalogQuery<CatalogItem>(CATALOGS.IDIOMAS)
const {data: costRegimen = []} = useCatalogQuery<CatalogItem>(CATALOGS.COST_REGIMEN)
const {data: disabilities = []} = useCatalogQuery<CatalogItem>(CATALOGS.DISABILITIES)
const {data: licenseStatuses = []} = useCatalogQuery<CatalogItem>(CATALOGS.LICENSE_STATUSES)

export function ComplementaryDataFormSection() {
    return(
        <>
            {/* Complementary information subsection */}
            <h3 className="text-base font-semibold">
                Información complementaria
            </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field orientation="vertical">
                        <FieldLabel htmlFor="approval-resolution">
                            Resolución de aprobación
                        </FieldLabel>

                        <Input
                            id="approval-resolution"
                            placeholder="Resolución No. 0123 Mayo de 2001"
                        />
                    </Field>

                    <Field orientation="vertical">
                        <FieldLabel htmlFor="teaching-language">
                            Idioma de enseñanza
                        </FieldLabel>

                        <Select id="teaching-language">
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
                    <Field orientation="vertical" className="w-full">
                        <FieldLabel htmlFor="establishment-calendario">Calendario</FieldLabel>
                        <Select id="establishment-calendario">
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
                    <Field orientation="vertical">
                        <FieldLabel htmlFor="cost-regime">
                            Régimen de costo
                        </FieldLabel>

                        <Select id="cost-regime">
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
                    <Field orientation="vertical" className="w-full">
                        <FieldLabel htmlFor="establishment-genero">Género de la población atendida</FieldLabel>
                        <Select id="establishment-genero">
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

                    <Field orientation="vertical" className="w-full">
                        <FieldLabel htmlFor="establishment-rango">Rango tarifas</FieldLabel>
                        <Select id="establishment-rango">
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
                    <Field orientation="vertical">
                        <FieldLabel htmlFor="disabilities">
                            Discapacidades atendidas
                        </FieldLabel>

                        <Select id="disabilities">
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

                    <Field orientation="vertical">
                        <FieldLabel htmlFor="license-status">
                            Licencia de funcionamiento
                        </FieldLabel>

                        <Select id="license-status">
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
                        <RadioGroup defaultValue="si" className="flex gap-3">
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
                        />
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field orientation="vertical" className="w-full">
                        <FieldLabel>
                            Atención a población con talentos adicionales
                        </FieldLabel>

                        <RadioGroup defaultValue="no" className="flex gap-3">

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
                        <RadioGroup defaultValue="no" className="flex gap-3">
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