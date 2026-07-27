import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ContactDataFormSection() {
    return(
        <>
            <h3 className="text-base font-semibold">
                Datos de contacto
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-email">Correo electrónico</FieldLabel>
                    <Input id="establishment-email" placeholder="iesfa@sanfrancisco.com" />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-website">Página web</FieldLabel>
                    <Input id="establishment-website" placeholder="www.sanfrancisco.com" />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-phone">Teléfono</FieldLabel>
                    <Input id="establishment-phone" placeholder="3160474000" />
                </Field>
                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-fax">fax</FieldLabel>
                    <Input id="establishment-fax" placeholder="3323879" />
                </Field>

            </div>
        </>
    )
}