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
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { CATALOGS } from "@/lib/catalogs"
import { establishmentDetailRoute } from "@/router"

import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { useEstablishmentQuery } from "@/features/establishment/institution/api/query/use-establishment"
import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import { useOwnershipTypesQuery } from "@/features/establishment/institution/api/query/use-ownership-types"
import { usePuedeGestionarEstablecimientosQuery } from "@/features/establishment/institution/api/query/use-puede-gestionar-establecimientos"
import {
  DirectivosReadOnly,
  DirectivosSoloLecturaNota,
} from "@/features/establishment/institution/components/directivos-read-only"
import { esSectorNoOficial } from "@/features/establishment/institution/utils/sector"
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
  const { data: modalities = [] } = useCatalogQuery<CatalogItem>(CATALOGS.MODALIDADES_PRESTACION)
  const { data: puedeGestionarDirectivos } = usePuedeGestionarEstablecimientosQuery()

  const establishment = data?.establishment
  const sector = ownershipTypes.find((item) => item.id === establishment?.basicInfo.ownershipType?.id)?.sector ?? ""
  const poblacion = establishment?.additionalInfo.population
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
          <ErrorNoticeBanner error={error ?? true} fallback="No se pudo cargar el establecimiento." />
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
                            label="Naturaleza jurídica"
                            value={nameOf(ownershipTypes, establishment.basicInfo.ownershipType)}
                          />
                          <DetailItem label="Sector" value={sector} />
                          <DetailItem
                            label="Modalidad de prestación del servicio"
                            value={nameOf(modalities, establishment.basicInfo.serviceModality)}
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
                          label="Calendario"
                          value={nameOf(calendarios, establishment.additionalInfo.calendar)}
                        />
                        {/* Solo en el sector No oficial (Regla 90). */}
                        {esSectorNoOficial(sector) ? (
                          <>
                            <DetailItem
                              label="Idioma de enseñanza"
                              value={nameOf(idiomas, establishment.additionalInfo.teachingLanguage)}
                            />
                            <DetailItem
                              label="Régimen tarifario"
                              value={nameOf(costRegimen, establishment.additionalInfo.costRegime)}
                            />
                          </>
                        ) : null}
                        <DetailItem label="Género de la población atendida" value={poblacion?.gender ?? "Sin estudiantes"} />
                        <DetailItem
                          label="Licencia de funcionamiento"
                          value={establishment.additionalInfo.licenseStatus}
                        />
                        <DetailItem
                          label="Fecha licencia"
                          value={formatDate(establishment.additionalInfo.licenseDate)}
                        />
                        {/* Calculados con las matrículas (sso V571.2). */}
                        <DetailItem
                          label="Atiende población perteneciente a grupos étnicos"
                          value={yesNo(poblacion?.ethnicGroups === true)}
                        />
                        <DetailItem
                          label="Atiende población con capacidades o talentos excepcionales"
                          value={yesNo(poblacion?.exceptionalTalents === true)}
                        />
                        <DetailItem label="Ofrece subsidio" value={yesNo(poblacion?.subsidy === true)} />
                      </DetailSection>
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="datos-rector-secretaria" className="rounded-md border border-border">
              <AccordionTrigger className={accordionTriggerClassName}>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  Datos de rector y secretaria
                  {puedeGestionarDirectivos === true ? null : <DirectivosSoloLecturaNota />}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <Card className={accordionCardClassName}>
                  <CardContent>
                    <DirectivosReadOnly principal={establishment.principal} secretary={establishment.secretary} />
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </TableScreenBody>
    </TableScreen>
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
