import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { FichaDatos } from "@/components/ficha-datos"
import { TableScreen,TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, CheckCircleIcon, FilePdfIcon, PaperclipIcon, PencilIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getErrorMessage } from "@/lib/api-client"
import { fetchArchivoViewUrl } from "@/lib/files"
import { paths } from "@/config/paths"

import { useCompromisoQuery } from "@/features/gestion-estudiantil/citaciones/api/query/use-compromisos-query"
import type { CompromisoDetalle } from "@/features/gestion-estudiantil/citaciones/api/types"
import {
  accionesCompromiso,
  COLOR_ESTADO_COMPROMISO,
  origenEnlace,
} from "@/features/gestion-estudiantil/citaciones/api/ui-mappings"
import { useDialogosCompromiso } from "@/features/gestion-estudiantil/citaciones/components/dialogos/use-dialogos-citaciones"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { abreviarPersona } from "@/features/gestion-estudiantil/commons/utils/formatos"

function SoporteFirmado({ archivo }: { archivo: number }) {
  const { notify } = useNotify()
  const [abriendo, setAbriendo] = useState(false)
  async function abrir() {
    setAbriendo(true)
    try {
      const { url } = await fetchArchivoViewUrl(archivo)
      window.open(url, "_blank", "noopener")
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setAbriendo(false)
    }
  }
  return (
    <Button type="button" size="sm" variant="outline" color="neutral" disabled={abriendo} onClick={abrir}>
      <PaperclipIcon data-icon="inline-start" />
      Ver soporte firmado
    </Button>
  )
}

function CompromisoDetalleContent({ compromiso: c }: { compromiso: CompromisoDetalle }) {
  const navigate = useNavigate()
  const volver = () => navigate({ to: paths.app.citacionesCompromisos.getHref(), search: { tab: "compromisos" } } as never)
  const origen = origenEnlace(c.origen_tipo, c.origen_id)
  const acciones = accionesCompromiso(c)
  const dialogos = useDialogosCompromiso()

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex flex-wrap gap-2">
              {acciones.aceptacionPresencial && (
                <Button size="sm" variant="outline" color="neutral" onClick={() => dialogos.abrir("aceptacion", c)}>
                  <PencilIcon data-icon="inline-start" />
                  Registrar aceptación presencial
                </Button>
              )}
              {acciones.registrarResultado && (
                <Button size="sm" variant="outline" color="neutral" onClick={() => dialogos.abrir("resultado", c)}>
                  <CheckCircleIcon data-icon="inline-start" />
                  Registrar resultado
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                color="neutral"
                disabled={!acciones.documento}
                onClick={() => dialogos.abrir("documento", c)}
              >
                <FilePdfIcon data-icon="inline-start" />
                Descargar acta de compromiso
              </Button>
            </div>
          }
          description={
            <Button variant="ghost" color="neutral" size="sm" onClick={volver}>
              <ArrowLeftIcon data-icon="inline-start" />
              Volver a Citaciones y compromisos
            </Button>
          }
        >
          <span className="flex flex-wrap items-center gap-2">
            Compromiso de {c.estudiante_nombre}
            <Badge variant="soft" color={COLOR_ESTADO_COMPROMISO[c.estado_valor] ?? "muted"}>
              {c.estado_nombre}
            </Badge>
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-5 pb-6">
          <SeccionPlegable encuadrada comoSeccion titulo="Datos del compromiso" contentClassName="flex flex-col gap-4 px-4 py-4">
            <FichaDatos
              datos={[
                { etiqueta: "Estudiante", valor: c.estudiante_nombre },
                { etiqueta: "Grado/Grupo", valor: c.grado_grupo },
                { etiqueta: "Sede", valor: c.sede_nombre },
                { etiqueta: "Jornada", valor: c.jornada_nombre },
                { etiqueta: "Acudiente", valor: c.acudiente_nombre ?? "Sin acudiente registrado" },
                { etiqueta: "Tipo", valor: c.tipo_nombre },
                { etiqueta: "Fecha", valor: formatFecha(c.fecha) },
                { etiqueta: "Fecha de revisión", valor: formatFecha(c.fecha_revision) },
                { etiqueta: "Creado por", valor: abreviarPersona(c.crea_nombre) },
                { etiqueta: "Registro de origen", valor: origen?.texto },
                { etiqueta: "Aceptado presencialmente", valor: c.aceptado_presencialmente ? "Sí" : "No" },
                ...(c.observacion_resultado
                  ? [
                      {
                        etiqueta: "Observación del resultado",
                        valor: <span className="whitespace-pre-line">{c.observacion_resultado}</span>,
                        ancho: true,
                      },
                    ]
                  : []),
              ]}
            />
          </SeccionPlegable>

          <SeccionPlegable
            encuadrada
            comoSeccion
            titulo={`Compromisos (${c.items.length})`}
            contentClassName="px-4 py-4"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Plazo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.items.map((i, n) => (
                  <TableRow key={i.id}>
                    <TableCell>{n + 1}</TableCell>
                    <TableCell className="whitespace-normal">{i.descripcion}</TableCell>
                    <TableCell>{i.responsable}</TableCell>
                    <TableCell>{formatFecha(i.plazo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SeccionPlegable>

          <SeccionPlegable encuadrada comoSeccion titulo="Soporte firmado" contentClassName="px-4 py-4">
            {c.fk_tarchivo_soporte != null ? (
              <SoporteFirmado archivo={c.fk_tarchivo_soporte} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Aún no hay soporte firmado: el compromiso se acepta en el portal o con el soporte de la aceptación presencial.
              </p>
            )}
          </SeccionPlegable>
        </div>
      </TableScreenBody>
      {dialogos.dialogos}
    </>
  )
}

/** Detalle del compromiso (Ver detalle, §4.2): datos, compromisos con responsable y plazo, y soporte firmado. */
export function CompromisoDetallePage({ compromisoId }: { compromisoId: number }) {
  const { data, isPending, isError, error } = useCompromisoQuery(compromisoId)
  return (
    <NoticeProvider>
      <TableScreen>
        {isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : isError || !data ? (
          <ErrorNoticeBanner error={error ?? true} fallback="No se encontró el compromiso." className="m-6" />
        ) : (
          <CompromisoDetalleContent compromiso={data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
