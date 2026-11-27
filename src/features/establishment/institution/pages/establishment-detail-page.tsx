import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { format, parseISO } from "date-fns"
import { FichaDatos, type DatoFicha } from "@/components/ficha-datos"
import { BloqueBuscable, DetalleConBusqueda } from "@/components/busqueda-detalle"
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
import { PencilIcon, XIcon } from "@/components/ui/icons"
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
  // Acordeones del detalle: los que abrió la persona, y todos mientras escribe en el buscador.
  const [abiertos, setAbiertos] = useState<string[]>(ACORDEONES)
  const [buscando, setBuscando] = useState(false)
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
            // Modo ver: sin acción principal (CLAUDE.md §13). En el encabezado solo Cerrar; Modificar va en la
            // línea del buscador.
            <div className="flex items-center gap-2">
              <Button
                render={<Link to={paths.app.establishments.general.getHref()} search={(prev) => prev} />}
                nativeButton={false}
                variant="outline"
                color="neutral"
                size="sm"
              >
                <XIcon data-icon="inline-start" />
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
          // Ver detalle largo con buscador (CLAUDE.md §13); mientras se busca, los dos acordeones quedan abiertos.
          <DetalleConBusqueda
            onBuscandoChange={setBuscando}
            // Modificar (secundario) en la línea del buscador, a la derecha, como Matrícula › Detalle.
            acciones={
              puedeEditar ? (
                <Button
                  render={<Link to={paths.app.establishments.edit.getHref(id)} search={(prev) => prev} />}
                  nativeButton={false}
                  variant="outline"
                  color="neutral"
                  size="sm"
                >
                  <PencilIcon data-icon="inline-start" />
                  Modificar
                </Button>
              ) : undefined
            }
          >
          <Accordion
            multiple
            value={buscando ? ACORDEONES : abiertos}
            onValueChange={(valor) => !buscando && setAbiertos(valor as string[])}
            className="space-y-3"
          >
            <BloqueBuscable>
            <AccordionItem value="datos-establecimiento" className="rounded-md border border-border">
              <AccordionTrigger className={accordionTriggerClassName}>Datos de establecimiento</AccordionTrigger>
              <AccordionContent className="pt-4">
                <div className="space-y-4">
                  <BloqueBuscable>
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
                        <DetailSection
                          title="Identificación"
                          datos={[
                            { etiqueta: "Nombre del establecimiento", valor: texto(establishment.basicInfo.name) },
                            { etiqueta: "Código DANE", valor: texto(establishment.basicInfo.dane) },
                            { etiqueta: "NIT", valor: texto(establishment.basicInfo.nit) },
                            { etiqueta: "Naturaleza jurídica", valor: texto(nameOf(ownershipTypes, establishment.basicInfo.ownershipType)) },
                            { etiqueta: "Sector", valor: texto(sector) },
                            { etiqueta: "Modalidad de prestación del servicio", valor: texto(nameOf(modalities, establishment.basicInfo.serviceModality)) },
                          ]}
                        />
                        <DetailSection
                          title="Domicilio"
                          datos={[
                            { etiqueta: "Municipio", valor: texto(municipalityLabel(municipalities, establishment.address.municipality?.id)) },
                            { etiqueta: "Zona", valor: texto(nameOf(zones, establishment.address.zone)) },
                            { etiqueta: "Dirección", valor: texto(establishment.address.address) },
                            { etiqueta: "Barrio", valor: texto(establishment.address.district?.name) },
                            { etiqueta: "Comuna", valor: texto(establishment.address.commune?.name) },
                            { etiqueta: "Localidad", valor: texto(establishment.address.locality?.name) },
                          ]}
                        />
                        <DetailSection
                          title="Contacto"
                          datos={[
                            { etiqueta: "Correo electrónico", valor: texto(establishment.contact.email) },
                            { etiqueta: "Página web", valor: texto(establishment.contact.website) },
                            { etiqueta: "Teléfono", valor: texto(establishment.contact.phone) },
                            { etiqueta: "Fax", valor: texto(establishment.contact.fax) },
                          ]}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  </BloqueBuscable>
                  <BloqueBuscable>
                  <Card className={accordionCardClassName}>
                    <CardContent>
                      <DetailSection
                        title="Información complementaria"
                        datos={[
                          { etiqueta: "Resolución de aprobación", valor: texto(establishment.additionalInfo.approvalResolution) },
                          { etiqueta: "Calendario", valor: texto(nameOf(calendarios, establishment.additionalInfo.calendar)) },
                          // Solo en el sector No oficial (Regla 90).
                          ...(esSectorNoOficial(sector) ? [
                              { etiqueta: "Idioma de enseñanza", valor: texto(nameOf(idiomas, establishment.additionalInfo.teachingLanguage)) },
                              { etiqueta: "Régimen tarifario", valor: texto(nameOf(costRegimen, establishment.additionalInfo.costRegime)) },
                            ]
                          : []),
                          { etiqueta: "Género de la población atendida", valor: texto(poblacion?.gender ?? "Sin estudiantes") },
                          { etiqueta: "Licencia de funcionamiento", valor: texto(establishment.additionalInfo.licenseStatus) },
                          { etiqueta: "Fecha licencia", valor: texto(formatDate(establishment.additionalInfo.licenseDate)) },
                          // Calculados con las matrículas (sso V571.2).
                          { etiqueta: "Atiende población perteneciente a grupos étnicos", valor: texto(yesNo(poblacion?.ethnicGroups === true)) },
                          { etiqueta: "Atiende población con capacidades o talentos excepcionales", valor: texto(yesNo(poblacion?.exceptionalTalents === true)) },
                          { etiqueta: "Ofrece subsidio", valor: texto(yesNo(poblacion?.subsidy === true)) },
                        ]}
                      />
                    </CardContent>
                  </Card>
                  </BloqueBuscable>
                </div>
              </AccordionContent>
            </AccordionItem>
            </BloqueBuscable>

            <BloqueBuscable>
            <AccordionItem value="datos-rector-secretaria" className="rounded-md border border-border">
              <AccordionTrigger className={accordionTriggerClassName}>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  Datos de rector y secretaria
                  {puedeGestionarDirectivos === true ? null : <DirectivosSoloLecturaNota />}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <Card className={accordionCardClassName}>
                  <CardContent>
                    <DirectivosReadOnly principal={establishment.principal} secretary={establishment.secretary} />
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
            </BloqueBuscable>
          </Accordion>
          </DetalleConBusqueda>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}

/** Título y ficha de datos de los Ver detalle (`FichaDatos`, CLAUDE.md §13). */
function DetailSection({ title, datos }: { title: string; datos: DatoFicha[] }) {
  return (
    // Con el buscador, el bloque (título incluido) se oculta si ningún dato coincide.
    <BloqueBuscable contar className="flex grow flex-col">
      <section className="flex grow flex-col gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <FichaDatos datos={datos} />
      </section>
    </BloqueBuscable>
  )
}

/** Acordeones del detalle: abiertos los dos al entrar, y forzados abiertos mientras se busca. */
const ACORDEONES = ["datos-establecimiento", "datos-rector-secretaria"]

/** Valor sin espacios sobrantes; vacío queda en "" y la ficha muestra «—». */
function texto(value: string | null | undefined): string {
  return value?.trim() ?? ""
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
