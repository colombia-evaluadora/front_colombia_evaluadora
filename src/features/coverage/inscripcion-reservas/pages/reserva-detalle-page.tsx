import { Link } from "@tanstack/react-router"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileTextIcon, PersonAddIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaReservaDetalleRoute } from "@/router"

import { useReservaDetalleQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-detalle-query"
import type { ReservaCupoDetalle } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"
import {
  ESTADO_RESERVA_UI,
  ESTADO_TRASLADO_LABELS,
} from "@/features/coverage/inscripcion-reservas/api/ui-mappings"
import {
  Aviso,
  CampoLectura,
  EstadoReservaBadge,
  Rejilla,
  Seccion,
  Secciones,
} from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const fecha = (iso: string) => format(parseISO(iso), "dd/MM/yyyy")
const fechaHora = (iso: string) => format(parseISO(iso), "dd/MM/yyyy · HH:mm")
const siNo = (v: boolean | null) => (v == null ? "—" : v ? "Sí" : "No")

/** Ver detalle (Cobertura, Sección 3.2): la reserva, su traslado y su historial. */
export function ReservaDetallePage() {
  const { reservaId } = coberturaReservaDetalleRoute.useParams()
  const { data, isPending, isError, error } = useReservaDetalleQuery(reservaId)

  if (isPending) {
    return (
      <TableScreen>
        <TableScreenBody>
          <Skeleton className="h-96 w-full" />
        </TableScreenBody>
      </TableScreen>
    )
  }
  if (isError) {
    return (
      <TableScreen>
        <TableScreenBody>
          <p className="p-10 text-center text-sm text-red">{getErrorMessage(error)}</p>
        </TableScreenBody>
      </TableScreen>
    )
  }

  const reservada = data.estado === "RESERVADA" && !data.trasladoEntrante

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          description={<EstadoReservaBadge estado={data.estado} />}
          action={
            reservada ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  color="neutral"
                  onClick={() => toast.info("Generar constancia de reserva: próximamente.")}
                >
                  <FileTextIcon data-icon="inline-start" />
                  Generar constancia de reserva
                </Button>
                <Button
                  nativeButton={false}
                  render={<Link to={paths.app.coberturaReservaAsignarGrupo.getHref(data.id)} />}
                >
                  <PersonAddIcon data-icon="inline-start" />
                  Asignar grupo
                </Button>
              </div>
            ) : null
          }
        >
          {data.estudiante}
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <Secciones abiertas={["reserva", "traslado", "historial"]}>
          <Seccion value="reserva" titulo="Datos de la reserva">
            <DatosReserva r={data} />
          </Seccion>

          <Seccion
            value="traslado"
            titulo="Datos del traslado"
            extra={
              <Badge
                variant="outline"
                color="neutral"
                className="text-xs font-medium tracking-normal"
              >
                {data.traslado ? ESTADO_TRASLADO_LABELS[data.traslado.estado] : "Sin traslado"}
              </Badge>
            }
          >
            <DatosTraslado r={data} />
          </Seccion>

          <Seccion value="historial" titulo="Historial de cambios" tabla>
            <Historial r={data} />
          </Seccion>
        </Secciones>
      </TableScreenBody>
    </TableScreen>
  )
}

function DatosReserva({ r }: { r: ReservaCupoDetalle }) {
  return (
    <Rejilla>
      <CampoLectura
        id="estudiante"
        label="Estudiante"
        value={`${r.estudiante} · ${r.tipoDocumento} ${r.documento}`}
      />
      <CampoLectura id="origen" label="Origen de la reserva" value={ORIGEN[r.origen]} />
      <CampoLectura id="decision" label="Decisión de prematrícula" value={r.decisionPrematricula} />
      <CampoLectura id="matricula-origen" label="Matrícula de origen" value={r.matriculaOrigen} />
      <CampoLectura id="periodo" label="Período Académico" value={r.periodoAcademico} />
      <CampoLectura id="sede-jornada" label="Sede y Jornada" value={`${r.sede} · ${r.jornada}`} />
      <CampoLectura id="grado" label="Grado" value={r.grado} />
      <CampoLectura
        id="tipo-cupo"
        label="Tipo de cupo"
        value={r.tipoCupo === "OFICIAL" ? "Oficial" : "Contratado"}
      />
      <CampoLectura id="fecha-reserva" label="Fecha de reserva" value={fecha(r.fechaReserva)} />
      <CampoLectura id="asignada-por" label="Asignada por" value={r.asignadaPor} />
      <CampoLectura
        id="confirmada"
        label="Confirmada por el acudiente"
        value={siNo(r.confirmadaPorAcudiente)}
      />
      <CampoLectura id="estado" label="Estado" value={ESTADO_RESERVA_UI[r.estado].label} />
      {r.motivoLiberacion && (
        <CampoLectura
          id="motivo-liberacion"
          label="Motivo de liberación"
          value={r.motivoLiberacion}
        />
      )}
    </Rejilla>
  )
}

const ORIGEN: Record<ReservaCupoDetalle["origen"], string> = {
  PREMATRICULA: "Prematrícula",
  RESERVAR_CUPOS: "Reservar cupos",
  TRASLADO: "Traslado",
  REDISTRIBUCION: "Redistribución",
  INSCRIPCION: "Inscripción",
}

function DatosTraslado({ r }: { r: ReservaCupoDetalle }) {
  const t = r.traslado
  if (!t) return <Aviso tono="info">Esta reserva no tiene un traslado.</Aviso>
  return (
    <Rejilla>
      <CampoLectura
        id="destino"
        label="Establecimiento de destino"
        value={t.establecimientoDestino}
      />
      <CampoLectura id="motivo-traslado" label="Motivo del traslado" value={t.motivo} />
      <CampoLectura
        id="preferencia"
        label="Jornada y sede preferidas"
        value={t.jornadaSedePreferida}
      />
      <CampoLectura id="hermano" label="Hermano verificado" value={siNo(t.hermanoVerificado)} />
      <CampoLectura
        id="compartir"
        label="Compartir archivos de soporte"
        value={siNo(t.compartirSoportes)}
      />
      <CampoLectura
        id="estado-traslado"
        label="Estado del traslado"
        value={ESTADO_TRASLADO_LABELS[t.estado]}
      />
      {t.respondidoPor && (
        <CampoLectura
          id="respuesta"
          label="Respondido por / Fecha de respuesta"
          value={`${t.respondidoPor} · ${t.fechaRespuesta ? fecha(t.fechaRespuesta) : "—"}`}
        />
      )}
      {t.motivoRechazo && (
        <CampoLectura id="rechazo" label="Motivo de rechazo" value={t.motivoRechazo} />
      )}
      {t.observacion && (
        <CampoLectura id="observacion" label="Observación para el destino" value={t.observacion} />
      )}
    </Rejilla>
  )
}

function Historial({ r }: { r: ReservaCupoDetalle }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Fecha y hora</TableHead>
          <TableHead>Usuario</TableHead>
          <TableHead>Cambio</TableHead>
          <TableHead>Valor anterior</TableHead>
          <TableHead>Valor nuevo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {r.historial.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="tabular-nums">{fechaHora(c.fecha)}</TableCell>
            <TableCell>{c.usuario}</TableCell>
            <TableCell className="whitespace-normal">{c.cambio}</TableCell>
            <TableCell>{c.valorAnterior ?? "—"}</TableCell>
            <TableCell>{c.valorNuevo ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
