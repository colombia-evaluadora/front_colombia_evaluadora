import { Link } from "@tanstack/react-router"
import { format, parseISO } from "date-fns"
import type { ReactNode } from "react"

import { NoticeOutlet } from "@/components/notice/notice-context"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PencilIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { CATALOGS } from "@/lib/catalogs"
import { establishmentDetailRoute } from "@/router"

import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { Person } from "@/features/establishment/employees/api/types/person"
import { useEstablishmentQuery } from "@/features/establishment/institution/api/query/use-establishment"
import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import { useOwnershipTypesQuery } from "@/features/establishment/institution/api/query/use-ownership-types"
import { ArchivoImage } from "@/features/files/components/archivo-image"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

// Mismos acordeones que el formulario de agregar/editar.
const accordionTriggerClassName =
  "flex-row-reverse justify-end items-center gap-3 py-2.5 text-lg **:data-[slot=accordion-trigger-icon]:ml-0 **:data-[slot=accordion-trigger-icon]:size-5"
const accordionCardClassName = "py-5"

/**
 * Detalle de solo lectura. El backend trae los catálogos como ids sueltos
 * (`toStub`), así que los nombres se resuelven contra los catálogos del form.
 */
export function EstablishmentDetailPage() {
  const { establishmentId } = establishmentDetailRoute.useParams()
  const id = Number(establishmentId)
  const { puedeEditar } = useMenuPermission("ESTABLECIMIENTO", { onlineOnlyWrites: true })
  const { data, isPending, isError, error } = useEstablishmentQuery(id, !Number.isNaN(id))

  const { data: ownershipTypes = [] } = useOwnershipTypesQuery()
  const { data: municipalities = [] } = useMunicipalitiesQuery()
  const { data: zones = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ZONES)
  const { data: idiomas = [] } = useCatalogQuery<CatalogItem>(CATALOGS.IDIOMAS)
  const { data: calendarios = [] } = useCatalogQuery<CatalogItem>(CATALOGS.CALENDARIOS)
  const { data: costRegimen = [] } = useCatalogQuery<CatalogItem>(CATALOGS.COST_REGIMEN)
  const { data: populationGenders = [] } = useCatalogQuery<CatalogItem>(CATALOGS.POPULATION_GENDERS)
  const { data: rangosTarifas = [] } = useCatalogQuery<CatalogItem>(CATALOGS.RANGO_TARIFAS)
  const { data: disabilities = [] } = useCatalogQuery<CatalogItem>(CATALOGS.DISABILITIES_ATTENDED)

  const establishment = data?.establishment
  const title = establishment ? establishment.basicInfo.name : "Detalle del establecimiento educativo"

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex items-center gap-2">
              {puedeEditar && establishment ? (
                <Button
                  render={
                    <Link
                      to={paths.app.establishments.edit.getHref(id)}
                      search={(prev) => prev}
                    />
                  }
                  nativeButton={false}
                  size="sm"
                >
                  <PencilIcon data-icon="inline-start" />
                  Editar
                </Button>
              ) : null}
              <Button
                render={<Link to={paths.app.establishments.general.getHref()} search={(prev) => prev} />}
                nativeButton={false}
                variant="fill"
                color="neutral"
                size="sm"
              >
                Cerrar
              </Button>
            </div>
          }
        >
          {title}
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        {isPending ? (
          <Skeleton className="h-96" />
        ) : isError || !establishment ? (
          <p className="text-sm text-red">
            {getErrorMessage(error) || "No se pudo cargar el establecimiento."}
          </p>
        ) : (
          <Accordion
            multiple
            defaultValue={["datos-establecimiento", "datos-rector-secretaria"]}
            className="space-y-3"
          >
            <AccordionItem value="datos-establecimiento" className="rounded-md border border-border">
              <AccordionTrigger className={accordionTriggerClassName}>Datos de establecimiento</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <Card className={accordionCardClassName}>
                    <CardContent className="flex flex-col gap-6 md:flex-row">
                      <div className="shrink-0">
                        <ArchivoImage
                          archivoId={establishment.basicInfo.logoArchivoId ?? null}
                          alt="Escudo del establecimiento"
                          className="size-32 rounded-md border border-border object-contain"
                          fallback={
                            <div className="grid size-32 place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                              Sin escudo
                            </div>
                          }
                        />
                      </div>
                      <div className="flex grow flex-col gap-6">
                        <DetailSection title="Identificación">
                          <DetailItem label="Nombre del establecimiento" value={establishment.basicInfo.name} />
                          <DetailItem label="Código DANE" value={establishment.basicInfo.dane} />
                          <DetailItem label="NIT" value={establishment.basicInfo.nit} />
                          <DetailItem
                            label="Propiedad jurídica"
                            value={nameOf(ownershipTypes, establishment.basicInfo.ownershipType)}
                          />
                        </DetailSection>
                        <DetailSection title="Domicilio">
                          <DetailItem
                            label="Municipio"
                            value={municipalityLabel(municipalities, establishment.address.municipality?.id)}
                          />
                          <DetailItem label="Zona" value={nameOf(zones, establishment.address.zone)} />
                          <DetailItem label="Dirección" value={establishment.address.address} />
                          <DetailItem label="Barrio" value={establishment.address.district?.name} />
                          <DetailItem label="Comuna" value={establishment.address.commune?.name} />
                          <DetailItem label="Localidad" value={establishment.address.locality?.name} />
                        </DetailSection>
                        <DetailSection title="Contacto">
                          <DetailItem label="Correo electrónico" value={establishment.contact.email} />
                          <DetailItem label="Página web" value={establishment.contact.website} />
                          <DetailItem label="Teléfono" value={establishment.contact.phone} />
                          <DetailItem label="Fax" value={establishment.contact.fax} />
                        </DetailSection>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={accordionCardClassName}>
                    <CardContent>
                      <DetailSection title="Información complementaria">
                        <DetailItem
                          label="Resolución de aprobación"
                          value={establishment.additionalInfo.approvalResolution}
                        />
                        <DetailItem
                          label="Idioma de enseñanza"
                          value={nameOf(idiomas, establishment.additionalInfo.teachingLanguage)}
                        />
                        <DetailItem
                          label="Calendario"
                          value={nameOf(calendarios, establishment.additionalInfo.calendar)}
                        />
                        <DetailItem
                          label="Régimen de costo"
                          value={nameOf(costRegimen, establishment.additionalInfo.costRegime)}
                        />
                        <DetailItem
                          label="Género de la población atendida"
                          value={nameOf(populationGenders, establishment.additionalInfo.populationGender)}
                        />
                        <DetailItem
                          label="Rango tarifas"
                          value={nameOf(rangosTarifas, establishment.additionalInfo.tuitionRange)}
                        />
                        <DetailItem
                          label="Discapacidades atendidas"
                          value={nameOf(disabilities, establishment.additionalInfo.disabilityType)}
                        />
                        <DetailItem
                          label="Licencia de funcionamiento"
                          value={establishment.additionalInfo.licenseStatus}
                        />
                        <DetailItem
                          label="Fecha licencia"
                          value={formatDate(establishment.additionalInfo.licenseDate)}
                        />
                        <DetailItem
                          label="Atención a población perteneciente a etnias"
                          value={yesNo(establishment.additionalInfo.ethnicAttention)}
                        />
                        <DetailItem
                          label="Atención a población con talentos adicionales"
                          value={yesNo(establishment.additionalInfo.giftedAttention)}
                        />
                        <DetailItem label="Ofrece subsidio" value={yesNo(establishment.additionalInfo.subsidy)} />
                      </DetailSection>
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="datos-rector-secretaria" className="rounded-md border border-border">
              <AccordionTrigger className={accordionTriggerClassName}>Datos de rector y secretaria</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <PersonCard title="Rector" person={establishment.principal} />
                  <PersonCard title="Secretaria" person={establishment.secretary} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}

function PersonCard({ title, person }: { title: string; person: Person | null }) {
  const { data: documentTypes = [] } = useCatalogQuery<CatalogItem>(CATALOGS.DOCUMENT_TYPES)
  const { data: genders = [] } = useCatalogQuery<CatalogItem>(CATALOGS.GENDERS)

  return (
    <Card className={accordionCardClassName}>
      <CardContent>
        {person ? (
          <div className="flex flex-col gap-6 md:flex-row">
            <ArchivoImage
              archivoId={person.photoArchivoId ?? null}
              alt={`Foto de ${title.toLowerCase()}`}
              className="size-24 shrink-0 rounded-full border border-border object-cover"
              fallback={
                <div className="grid size-24 shrink-0 place-items-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
                  Sin foto
                </div>
              }
            />
            <DetailSection title={title}>
              <DetailItem label="Tipo de documento" value={nameOf(documentTypes, person.documentType)} />
              <DetailItem label="Número de documento" value={person.identification} />
              <DetailItem
                label="Nombre"
                value={[person.firstName, person.middleName, person.lastName, person.secondLastName]
                  .filter((part) => part?.trim())
                  .join(" ")}
              />
              <DetailItem label="Correo electrónico" value={person.email} />
              <DetailItem label="Teléfono" value={person.phone} />
              <DetailItem label="Fecha de nacimiento" value={formatDate(person.birthDate)} />
              <DetailItem label="Género" value={nameOf(genders, person.gender)} />
            </DetailSection>
          </div>
        ) : (
          <DetailSection title={title}>
            <p className="text-sm text-muted-foreground">Sin asignar.</p>
          </DetailSection>
        )}
      </CardContent>
    </Card>
  )
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex grow flex-col gap-3">
      <h3 className="text-base font-semibold">{title}</h3>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  )
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  const text = value?.trim()
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{text || "—"}</dd>
    </div>
  )
}

function nameOf(items: CatalogItem[], item: CatalogItem | null | undefined): string {
  if (!item) return ""
  return item.name || items.find((it) => it.id === item.id)?.name || ""
}

function municipalityLabel(
  items: { id: number; name: string; department?: { name: string } }[],
  id: number | undefined,
): string {
  const found = items.find((it) => it.id === id)
  if (!found) return ""
  return found.department?.name ? `${found.name} (${found.department.name})` : found.name
}

function yesNo(value: boolean): string {
  return value ? "Sí" : "No"
}

function formatDate(value: string | null | undefined): string {
  if (!value) return ""
  try {
    return format(parseISO(value), "dd/MM/yyyy")
  } catch {
    return value
  }
}
