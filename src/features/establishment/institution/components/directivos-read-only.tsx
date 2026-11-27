import { format, parseISO } from "date-fns"

import { FichaDatos } from "@/components/ficha-datos"
import { BloqueBuscable } from "@/components/busqueda-detalle"
import { LockIcon } from "@/components/ui/icons"
import { CATALOGS } from "@/lib/catalogs"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { Person } from "@/features/establishment/employees/api/types/person"

function fecha(value: string | null | undefined): string {
  if (!value) return ""
  try {
    return format(parseISO(value.slice(0, 10)), "dd/MM/yyyy")
  } catch {
    return value
  }
}

/** Datos de una persona en la ficha de datos (dos pares por fila). */
function DirectivoTable({ title, person, emptyMessage }: { title: string; person: Person | null; emptyMessage: string }) {
  const { data: documentTypes = [] } = useCatalogQuery<CatalogItem>(CATALOGS.DOCUMENT_TYPES)
  const { data: genders = [] } = useCatalogQuery<CatalogItem>(CATALOGS.GENDERS)

  // En la edición, una secretaria sin registrar llega como persona en blanco.
  if (!person || !person.identification?.trim()) {
    return (
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </section>
    )
  }

  // El detalle trae los catálogos solo con su id: código y nombre salen del catálogo.
  const tipoDocumento =
    person.documentType?.code || documentTypes.find((item) => item.id === person.documentType?.id)?.code || ""
  const genero = person.gender?.name || genders.find((item) => item.id === person.gender?.id)?.name || ""
  const pares: [string, string | null | undefined][] = [
    ["Tipo de documento", tipoDocumento],
    ["Número de documento", person.identification],
    ["Primer nombre", person.firstName],
    ["Segundo nombre", person.middleName],
    ["Primer apellido", person.lastName],
    ["Segundo apellido", person.secondLastName],
    ["Correo electrónico", person.email],
    ["Género", genero],
    ["Fecha de nacimiento", fecha(person.birthDate)],
    ["Teléfono", person.phone],
  ]

  return (
    // Bloque del buscador del detalle: se oculta si ningún dato de esta persona coincide.
    <BloqueBuscable contar>
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {/* Misma ficha que el resto del detalle del establecimiento (`FichaDatos`, CLAUDE.md §13). */}
      <FichaDatos datos={pares.map(([etiqueta, valor]) => ({ etiqueta, valor: valor?.trim() ?? "" }))} />
    </section>
    </BloqueBuscable>
  )
}

/** Aviso del encabezado cuando el usuario no puede cambiar a los directivos. */
export function DirectivosSoloLecturaNota() {
  return (
    <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
      <LockIcon className="size-3.5" />
      Solo lectura: solo el Superadministrador cambia al Rector y a la Secretaria.
    </span>
  )
}

/** Rector y secretaria en tablas de solo lectura (detalle, o edición sin permiso sobre directivos). */
export function DirectivosReadOnly({ principal, secretary }: { principal: Person | null; secretary: Person | null }) {
  return (
    <div className="flex flex-col gap-5">
      <DirectivoTable title="Rector" person={principal} emptyMessage="Sin rector registrado." />
      <DirectivoTable title="Secretaria" person={secretary} emptyMessage="Sin secretaria registrada." />
    </div>
  )
}
