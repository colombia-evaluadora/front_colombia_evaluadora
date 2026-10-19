import { Link } from "@tanstack/react-router"
import { format } from "date-fns"

import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ProhibitIcon,
  ShieldIcon,
  WarningCircleIcon,
} from "@/components/ui/icons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import type { AccionUi, DatosTabla, EstadoAccionPendiente, Faltante } from "@/features/assistant/api/types"
import { Markdown } from "@/features/assistant/components/markdown"
import type { MensajeChat } from "@/features/assistant/hooks/use-asistente"
import { describirAccion, esRutaInterna, type ResultadoAccion } from "@/features/assistant/lib/acciones-ui"

interface RespuestaAgenteProps {
  mensaje: MensajeChat
  /** Sin conexión o con un turno en curso: los botones de acción se deshabilitan. */
  bloqueado: boolean
  /** Permiso de crear/editar en el menú `ASISTENTE`: sin él no se confirman acciones. */
  puedeAccionar?: boolean
  onResponder: (texto: string) => void
  onConfirmar: (mensaje: MensajeChat) => void
  onCancelar: (mensaje: MensajeChat) => void
  onReintentar: (mensaje: MensajeChat) => void
}

const MAX_FILAS = 50

export function RespuestaAgente({
  mensaje,
  bloqueado,
  puedeAccionar = true,
  onResponder,
  onConfirmar,
  onCancelar,
  onReintentar,
}: RespuestaAgenteProps) {
  const { respuesta, error } = mensaje

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <p className="flex items-start gap-1.5 text-sm text-red">
          <WarningCircleIcon className="mt-0.5 size-4 shrink-0" />
          {error.mensaje}
        </p>
        {error.textoOriginal && (
          <Button
            variant="outline"
            color="neutral"
            size="xs"
            className="self-start"
            disabled={bloqueado}
            onClick={() => onReintentar(mensaje)}
          >
            <ArrowCounterClockwiseIcon data-icon="inline-start" />
            Reintentar
          </Button>
        )}
      </div>
    )
  }

  if (mensaje.detenido) {
    return <p className="text-sm text-muted-foreground italic">{mensaje.texto}</p>
  }

  if (respuesta?.tipo === "BLOQUEADO" || respuesta?.tipo === "SIN_PERMISO") {
    return (
      <Alert variant={respuesta.tipo === "BLOQUEADO" ? "destructive" : "default"}>
        {respuesta.tipo === "BLOQUEADO" ? <ShieldIcon /> : <ProhibitIcon />}
        <AlertTitle>{respuesta.tipo === "BLOQUEADO" ? "Mensaje bloqueado" : "Sin permiso"}</AlertTitle>
        <AlertDescription>{respuesta.texto}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {mensaje.texto && <Markdown texto={mensaje.texto} />}

      {respuesta?.faltantes && respuesta.faltantes.length > 0 && (
        <Faltantes faltantes={respuesta.faltantes} bloqueado={bloqueado} onResponder={onResponder} />
      )}

      {respuesta?.datos && <TablaDatos datos={respuesta.datos} />}

      {respuesta?.acciones && respuesta.acciones.length > 0 && (
        <AccionesUi acciones={respuesta.acciones} resultados={mensaje.resultadosUi} />
      )}

      {respuesta?.accionPendiente && (
        <TarjetaConfirmacion
          mensaje={mensaje}
          bloqueado={bloqueado}
          puedeAccionar={puedeAccionar}
          onConfirmar={onConfirmar}
          onCancelar={onCancelar}
        />
      )}
    </div>
  )
}

function Faltantes({
  faltantes,
  bloqueado,
  onResponder,
}: {
  faltantes: Faltante[]
  bloqueado: boolean
  onResponder: (texto: string) => void
}) {
  return (
    <ul className="flex flex-col gap-2">
      {faltantes.map((f) => (
        <li key={f.campo} className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{f.pregunta}</span>
          {f.opciones && f.opciones.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {f.opciones.map((opcion) => (
                <Button
                  key={opcion}
                  variant="outline"
                  color="primary"
                  size="xs"
                  disabled={bloqueado}
                  onClick={() => onResponder(opcion)}
                >
                  {opcion}
                </Button>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function formatoCelda(valor: unknown): string {
  if (valor == null) return "—"
  if (typeof valor === "object") return JSON.stringify(valor)
  return String(valor)
}

function TablaDatos({ datos }: { datos: DatosTabla }) {
  const filas = datos.filas.slice(0, MAX_FILAS)
  if (filas.length === 0) return <p className="text-sm text-muted-foreground">Sin resultados.</p>
  return (
    <div className="max-h-72 overflow-auto rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            {datos.columnas.map((columna) => (
              <TableHead key={columna} className="capitalize">
                {columna.replace(/_/g, " ")}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((fila, i) => (
            <TableRow key={i}>
              {datos.columnas.map((columna) => (
                <TableCell key={columna}>{formatoCelda(fila[columna])}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {datos.filas.length > MAX_FILAS && (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Se muestran {MAX_FILAS} de {datos.filas.length} filas.
        </p>
      )}
    </div>
  )
}

function AccionesUi({ acciones, resultados }: { acciones: AccionUi[]; resultados?: ResultadoAccion[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {acciones.map((accion, i) => {
        const resultado = resultados?.find((r) => r.accion === accion)
        return (
          <li key={i} className="flex flex-wrap items-center gap-2 text-xs">
            {resultados == null ? (
              // Restaurada del historial: no se reaplicó en esta pantalla.
              <CheckCircleIcon className="size-4 text-muted-foreground" />
            ) : resultado?.aplicada ? (
              <CheckCircleIcon className="size-4 text-green" />
            ) : (
              <WarningCircleIcon className="size-4 text-yellow" />
            )}
            <span>{describirAccion(accion)}</span>
            {resultado && !resultado.aplicada && resultado.motivo && (
              <span className="text-muted-foreground">({resultado.motivo})</span>
            )}
            {accion.op === "NAVEGAR" && esRutaInterna(accion.url) && (
              <Button
                variant="link"
                color="primary"
                size="xs"
                nativeButton={false}
                render={<Link to={accion.url as never} search={(accion.params ?? {}) as never} />}
              >
                Abrir
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function expiraLegible(expira: string): string {
  const fecha = new Date(expira)
  return Number.isNaN(fecha.getTime()) ? "" : format(fecha, "HH:mm")
}

const ETIQUETA_ESTADO_ACCION: Record<Exclude<EstadoAccionPendiente, "PENDIENTE">, string> = {
  EJECUTADA: "Ejecutada",
  FALLIDA: "Falló",
  DESCARTADA: "Cancelada",
  EXPIRADA: "Vencida",
}

function TarjetaConfirmacion({
  mensaje,
  bloqueado,
  puedeAccionar,
  onConfirmar,
  onCancelar,
}: {
  mensaje: MensajeChat
  bloqueado: boolean
  puedeAccionar: boolean
  onConfirmar: (mensaje: MensajeChat) => void
  onCancelar: (mensaje: MensajeChat) => void
}) {
  const accion = mensaje.respuesta!.accionPendiente!
  const estado = mensaje.estadoAccion ?? "PENDIENTE"
  const vencida = new Date(accion.expira).getTime() < Date.now()
  const pendiente = estado === "PENDIENTE" && !vencida && puedeAccionar
  // Estado real del backend (historial); en vivo siempre es PENDIENTE.
  const etiquetaFinal = accion.estado && accion.estado !== "PENDIENTE" ? ETIQUETA_ESTADO_ACCION[accion.estado] : null
  const hora = expiraLegible(accion.expira)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-yellow-stroke bg-yellow-22 p-3">
      <div className="flex items-center gap-2">
        <ShieldIcon className="size-4 shrink-0 text-yellow" />
        <span className="text-sm font-semibold">Confirma esta acción</span>
        {etiquetaFinal ? (
          <Badge variant="soft" color={accion.estado === "EJECUTADA" ? "success" : accion.estado === "FALLIDA" ? "destructive" : "muted"}>
            {etiquetaFinal}
          </Badge>
        ) : (
          estado === "RESUELTA" && <Badge variant="soft" color="muted">Resuelta</Badge>
        )}
        {estado === "PENDIENTE" && vencida && <Badge variant="soft" color="muted">Vencida</Badge>}
      </div>
      <p className="text-sm whitespace-pre-wrap">{accion.resumen}</p>
      {pendiente && hora && <p className="text-xs text-muted-foreground">Disponible hasta las {hora}.</p>}
      {(pendiente || estado === "CONFIRMANDO" || estado === "CANCELANDO") && (
        <div className="flex gap-2">
          <Button
            size="xs"
            variant="fill"
            color="primary"
            disabled={bloqueado || !pendiente}
            onClick={() => onConfirmar(mensaje)}
          >
            {estado === "CONFIRMANDO" ? "Confirmando…" : "Confirmar"}
          </Button>
          <Button
            size="xs"
            variant="outline"
            color="neutral"
            disabled={bloqueado || !pendiente}
            onClick={() => onCancelar(mensaje)}
          >
            {estado === "CANCELANDO" ? "Cancelando…" : "Cancelar"}
          </Button>
        </div>
      )}
      {!puedeAccionar && estado === "PENDIENTE" && !etiquetaFinal && (
        <p className="text-xs text-muted-foreground">No tienes permiso para ejecutar acciones desde el asistente.</p>
      )}
      <p className="text-xs text-muted-foreground">Escribir "sí" en el chat no ejecuta la acción: usa los botones.</p>
    </div>
  )
}
