import { useNavigate } from "@tanstack/react-router"
import { format, parseISO } from "date-fns"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"

import type { ReservaEntrante } from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-ficha-query"
import { ESTADO_TRASLADO_LABELS } from "@/features/coverage/inscripcion-reservas/api/ui-mappings"
import {
  Aviso,
  CampoLectura,
  Rejilla,
  SeccionFija,
} from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const siNo = (v: boolean) => (v ? "Sí" : "No")

/**
 * Ver detalle de un traslado entrante: el destino ve solo lo de la Regla 31 (identidad, origen,
 * grados, resultado del año y datos del traslado), sin la ficha de matrícula.
 */
export function ReservaEntranteDetalle({ reserva: r }: { reserva: ReservaEntrante }) {
  const navigate = useNavigate()
  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          ruta="Inscripción y reservas"
          action={
            <Button
              type="button"
              variant="outline"
              color="neutral"
              size="sm"
              onClick={() =>
                navigate({ to: paths.app.coberturaInscritos.getHref(), search: { tab: "reservas" } })
              }
            >
              Cerrar
            </Button>
          }
        >
          Traslado entrante — {r.estudiante.nombre}
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody>
        <div className="flex flex-col gap-4">
          <Aviso tono="info">
            Solicitud de traslado desde {r.establecimientoOrigen}. Se responde con Aceptar o Rechazar traslado en la
            lista de Reservas de cupo.
          </Aviso>
          <SeccionFija titulo="Estudiante">
            <Rejilla>
              <CampoLectura id="entrante-tipo" label="Tipo de documento" value={r.estudiante.tipoDocumento} />
              <CampoLectura id="entrante-documento" label="Documento" value={r.estudiante.documento} />
              <CampoLectura id="entrante-nombre" label="Nombre" value={r.estudiante.nombre} />
            </Rejilla>
          </SeccionFija>
          <SeccionFija titulo="Traslado">
            <Rejilla>
              <CampoLectura id="entrante-origen" label="Establecimiento de origen" value={r.establecimientoOrigen} />
              <CampoLectura id="entrante-grado-actual" label="Grado actual" value={r.gradoActual ?? "—"} />
              <CampoLectura id="entrante-grado" label="Grado solicitado" value={r.gradoSolicitado} />
              <CampoLectura id="entrante-resultado" label="Resultado del año" value={r.resultadoAnio ?? "—"} />
              <CampoLectura id="entrante-motivo" label="Motivo del traslado" value={r.motivoTraslado ?? "—"} />
              <CampoLectura
                id="entrante-preferida"
                label="Sede y jornada preferidas"
                value={[r.sedePreferida, r.jornadaPreferida].filter(Boolean).join(" · ") || "—"}
              />
              <CampoLectura id="entrante-hermano" label="Hermano verificado" value={siNo(r.hermanoVerificado)} />
              <CampoLectura
                id="entrante-estado"
                label="Estado del traslado"
                value={ESTADO_TRASLADO_LABELS[r.estadoTraslado as keyof typeof ESTADO_TRASLADO_LABELS] ?? r.estadoTraslado}
              />
              <CampoLectura
                id="entrante-solicitado"
                label="Solicitado"
                value={r.solicitadoAt ? format(parseISO(r.solicitadoAt), "dd/MM/yyyy · HH:mm") : "—"}
              />
            </Rejilla>
            {r.observacion ? (
              <p className="mt-3 text-sm">
                <span className="text-muted-foreground">Observación: </span>
                {r.observacion}
              </p>
            ) : null}
          </SeccionFija>
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}
