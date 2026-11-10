import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
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
import { useCitacionesAccess } from "@/features/gestion-estudiantil/citaciones/hooks/use-citaciones-access"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
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
    <Button type="button" size="sm" variant="outline" disabled={abriendo} onClick={abrir}>
      <PaperclipIcon data-icon="inline-start" />
      Ver soporte firmado
    </Button>
  )
}

function CompromisoDetalleContent({ compromiso: c }: { compromiso: CompromisoDetalle }) {
  const navigate = useNavigate()
  const volver = () => navigate({ to: paths.app.citacionesCompromisos.getHref(), search: { tab: "compromisos" } } as never)
  const origen = origenEnlace(c.origen_tipo, c.origen_id)
  const permisos = useCitacionesAccess()
  const acciones = accionesCompromiso(c, permisos)
  const dialogos = useDialogosCompromiso()

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex flex-wrap gap-2">
              {acciones.aceptacionPresencial && (
                <Button size="sm" variant="outline" onClick={() => dialogos.abrir("aceptacion", c)}>
                  <PencilIcon data-icon="inline-start" />
                  Registrar aceptación presencial
                </Button>
              )}
              {acciones.registrarResultado && (
                <Button size="sm" variant="outline" onClick={() => dialogos.abrir("resultado", c)}>
                  <CheckCircleIcon data-icon="inline-start" />
                  Registrar resultado
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                color="neutral"
                disabled={!permisos.puedeVer}
                onClick={() => dialogos.abrir("documento", c)}
              >
                <FilePdfIcon data-icon="inline-start" />
                Descargar acta de compromiso
              </Button>
            </div>
          }
          description={
            <Button variant="ghost" color="neutral" size="sm" className="-ml-3" onClick={volver}>
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
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Dato label="Estudiante">{c.estudiante_nombre}</Dato>
              <Dato label="Grado/Grupo">{c.grado_grupo}</Dato>
              <Dato label="Sede">{c.sede_nombre}</Dato>
              <Dato label="Jornada">{c.jornada_nombre}</Dato>
              <Dato label="Acudiente">{c.acudiente_nombre ?? "Sin acudiente registrado"}</Dato>
              <Dato label="Tipo">{c.tipo_nombre}</Dato>
              <Dato label="Fecha">{formatFecha(c.fecha)}</Dato>
              <Dato label="Fecha de revisión">{formatFecha(c.fecha_revision)}</Dato>
              <Dato label="Creado por">{abreviarPersona(c.crea_nombre)}</Dato>
              <Dato label="Registro de origen">{origen?.texto}</Dato>
              <Dato label="Aceptado presencialmente">{c.aceptado_presencialmente ? "Sí" : "No"}</Dato>
              {c.observacion_resultado && <Dato label="Observación del resultado">{c.observacion_resultado}</Dato>}
            </dl>
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
