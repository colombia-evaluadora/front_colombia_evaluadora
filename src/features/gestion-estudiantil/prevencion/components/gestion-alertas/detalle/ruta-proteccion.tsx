import { useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChatTextIcon, ControlPointIcon, FileDownloadOutlinedIcon } from "@/components/ui/icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { downloadReport } from "@/lib/report-client"

import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { GestionAlertaDetalle, GestionRuta } from "@/features/gestion-estudiantil/prevencion/api/types"
import type { ResumenRemisionRuta } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/dialogos/dialogos-remision-ruta"
import { useRemisionExternaQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-remisiones-query"

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"

const fechaDe = (x: string | { fecha: string }) => (typeof x === "string" ? x : x.fecha)
const textoDe = (x: string | { nombre?: string }) => (typeof x === "string" ? x : (x.nombre ?? ""))

interface Props {
  d: GestionAlertaDetalle
  ruta: GestionRuta
  onRegistrarGestion: (r: ResumenRemisionRuta) => void
  onRegistrarRespuesta: (r: ResumenRemisionRuta) => void
}

/**
 * Ruta de protección (G.8.GAL.6): datos de la remisión, gestiones y respuesta. El detalle común de la remisión
 * (`GET /remisiones-externas/:ID`) completa estado, ajustes y recordatorios; si no responde, queda lo que trae
 * la gestión.
 */
export function RutaProteccion({ d, ruta, onRegistrarGestion, onRegistrarRespuesta }: Props) {
  const { notify } = useNotify()
  const remQ = useRemisionExternaQuery(ruta.id_remision)
  const rem = remQ.data
  const [descargando, setDescargando] = useState(false)

  const enviada = ruta.estado === "ENVIADA"
  const vencida = typeof rem?.vencida === "boolean" ? rem.vencida : ruta.respuesta_vencida
  const resumen: ResumenRemisionRuta = useMemo(
    () => ({
      id: ruta.id_remision,
      entidad_nombre: ruta.entidad_nombre,
      estudiante_nombre: d.estudiante_nombre,
      fecha_remision: (rem?.fecha_remision as string | undefined) ?? ruta.fecha_activacion,
      fecha_esperada: rem?.fecha_esperada ?? ruta.fecha_esperada,
      estado_etiqueta: (rem?.estado_etiqueta as string | undefined) ?? (enviada ? "Enviada" : "Respondida"),
      vencida,
    }),
    [ruta, rem, d.estudiante_nombre, enviada, vencida],
  )
  const gestiones = rem?.gestiones ?? ruta.gestiones
  const recordatorios = rem ? rem.recordatorios.map((r) => r.fecha) : ruta.recordatorios.map(fechaDe)

  const descargar = async () => {
    setDescargando(true)
    const r = await downloadReport("remision-externa", { format: "pdf", filters: { FK_REMISION: ruta.id_remision } })
    setDescargando(false)
    if (r.status !== "ok") notify(r.message, { variant: "error" })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          type="button"
          variant="outline"
          color="neutral"
          disabled={!d.banderas.puede_descargar_reporte || descargando}
          onClick={descargar}
        >
          <IconoCarga cargando={descargando}>
            <FileDownloadOutlinedIcon data-icon="inline-start" />
          </IconoCarga>
          Descargar reporte de caso
        </Button>
        <Button
          size="sm"
          type="button"
          variant="outline"
          disabled={!enviada || !ruta.puede_registrar_respuesta}
          onClick={() => onRegistrarRespuesta(resumen)}
        >
          <ChatTextIcon data-icon="inline-start" />
          Registrar respuesta
        </Button>
      </div>

      <dl className={GRID}>
        <Dato label="Entidad">{ruta.entidad_nombre}</Dato>
        <Dato label="Fecha de activación">{formatFecha(ruta.fecha_activacion)}</Dato>
        <Dato label="Activada por">{abreviarPersona(ruta.activada_por_nombre) || ruta.activada_por_rol}</Dato>
        <Dato label="Fecha esperada de respuesta">{formatFecha(resumen.fecha_esperada)}</Dato>
        <Dato label="Recordatorios">{recordatorios.map((f) => formatFecha(f)).join(", ")}</Dato>
        <Dato label="Estado de la remisión">
          <span className="flex flex-wrap gap-1">
            <Badge variant="soft" color={enviada ? "info" : "success"}>
              <span>{resumen.estado_etiqueta}</span>
            </Badge>
            {enviada && vencida && (
              <Badge variant="soft" color="destructive">
                <span>Respuesta pendiente — plazo vencido</span>
              </Badge>
            )}
          </span>
        </Dato>
      </dl>
      <dl className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Dato label="Motivo del informe">{ruta.motivo && <span className="whitespace-pre-line">{ruta.motivo}</span>}</Dato>
        <Dato label="Descripción de la situación reportada">
          {ruta.descripcion && <span className="whitespace-pre-line">{ruta.descripcion}</span>}
        </Dato>
        <Dato label="Entorno familiar y antecedentes institucionales">
          {ruta.entorno_familiar && <span className="whitespace-pre-line">{ruta.entorno_familiar}</span>}
        </Dato>
        <Dato label="Situación actual de residencia, cuidado y protección">
          {ruta.situacion_residencia && <span className="whitespace-pre-line">{ruta.situacion_residencia}</span>}
        </Dato>
        <Dato label="Actuaciones institucionales">
          {ruta.actuaciones.length > 0 && (
            <ul className="list-disc pl-5">
              {ruta.actuaciones.map((a, i) => (
                <li key={i}>{textoDe(a)}</li>
              ))}
            </ul>
          )}
        </Dato>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-medium">Gestiones</h3>
        <Button
          size="sm"
          type="button"
          variant="outline"
          disabled={!enviada || !ruta.puede_registrar_gestion}
          onClick={() => onRegistrarGestion(resumen)}
        >
          <ControlPointIcon data-icon="inline-start" />
          Registrar gestión
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Registrada por</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gestiones.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Aún no hay gestiones registradas.
              </TableCell>
            </TableRow>
          ) : (
            gestiones.map((g, i) => (
              <TableRow key={g.id ?? i}>
                <TableCell>{formatFecha(g.fecha)}</TableCell>
                <TableCell className="whitespace-normal">{g.descripcion}</TableCell>
                <TableCell>{abreviarPersona(g.registrada_por) || "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {ruta.respuesta ? (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <Dato label="Fecha de respuesta">{formatFecha(ruta.fecha_respuesta)}</Dato>
          <Dato label="Respuesta recibida">
            <span className="whitespace-pre-line">{ruta.respuesta}</span>
          </Dato>
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">
          Sin respuesta registrada. Al registrarla, la remisión queda Respondida y se cancelan los recordatorios pendientes.
        </p>
      )}
    </div>
  )
}
