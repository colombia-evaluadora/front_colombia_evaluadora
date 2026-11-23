import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { GestionAlertaDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { ESTADO_GESTION_COLOR, UMBRAL_GESTION_COLOR } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import { CausasMedidas } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/detalle/causas-medidas"
import { HistorialGestion } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/detalle/historial-gestion"
import { RutaProteccion } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/detalle/ruta-proteccion"
import type { ResumenRemision } from "@/features/gestion-estudiantil/commons/components/remisiones/dialogos-remision"

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
const mesAnio = (fecha: string) => formatFecha(fecha).slice(3)

interface Props {
  d: GestionAlertaDetalle
  onContacto: () => void
  onVerAnterior: (id: number) => void
  onRegistrarGestion: (r: ResumenRemision) => void
  onRegistrarRespuesta: (r: ResumenRemision) => void
}

/** Contenido del detalle de la gestión (G.8.GAL.2 y GAL.6). */
export function DetalleGestion({ d, onContacto, onVerAnterior, onRegistrarGestion, onRegistrarRespuesta }: Props) {
  const responsable = d.sin_responsable
    ? "Sin responsable"
    : [abreviarPersona(d.responsable_nombre), d.responsable_rol_nombre].filter(Boolean).join(" · ") || "—"
  return (
    <div className="flex flex-col gap-4 pb-6">
      <SeccionPlegable encuadrada comoSeccion defaultAbierta titulo="Gestión de la alerta" contentClassName="px-4 py-4">
        <dl className={GRID}>
          <Dato label="Umbral">
            <Badge variant="soft" color={UMBRAL_GESTION_COLOR[d.umbral]}>
              <span>Umbral: {d.umbral_nombre}</span>
            </Badge>
          </Dato>
          <Dato label="Plazo">
            <span className="flex flex-wrap items-center gap-2">
              {formatFecha(d.plazo) || "—"}
              {d.vencida && (
                <Badge variant="soft" color="destructive">
                  <span>Vencida</span>
                </Badge>
              )}
            </span>
          </Dato>
          <Dato label="Responsable">{responsable}</Dato>
          <Dato label="Activada">{formatFecha(d.fecha_activacion)}</Dato>
          <Dato label="Reincidencia">
            {d.gestion_anterior ? (
              <span className="flex flex-wrap items-center gap-x-2">
                Reincidente de {mesAnio(d.gestion_anterior.fecha_activacion)}
                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onVerAnterior(d.gestion_anterior!.id)}>
                  Ver gestión anterior
                </Button>
              </span>
            ) : (
              "No"
            )}
          </Dato>
          <Dato label="Estado">
            <Badge variant="soft" color={ESTADO_GESTION_COLOR[d.estado]}>
              <span>{d.estado_nombre}</span>
            </Badge>
          </Dato>
          {d.seguimiento_reforzado && (
            <Dato label="Seguimiento reforzado">{d.motivos_seguimiento.join(", ") || "Sí"}</Dato>
          )}
          {d.verificacion && (
            <Dato label="Verificación de la reincorporación">
              {formatFecha(d.verificacion.fecha)}
              {d.verificacion.resuelta_por ? ` · ${abreviarPersona(d.verificacion.resuelta_por)}` : ""}
            </Dato>
          )}
        </dl>
      </SeccionPlegable>

      <SeccionPlegable encuadrada comoSeccion defaultAbierta titulo="Historial de responsables" contentClassName="px-4 py-2">
        <HistorialGestion eventos={d.historial} />
      </SeccionPlegable>

      {d.orientaciones.length > 0 && (
        <SeccionPlegable
          encuadrada
          comoSeccion
          defaultAbierta
          titulo="Orientaciones de la entidad territorial"
          contentClassName="flex flex-col gap-3 px-4 py-4"
        >
          {d.orientaciones.map((o) => (
            <div key={o.id} className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Tema: {o.tema}</span>
                <Badge variant="soft" color={o.estado === "ATENDIDA" ? "success" : "info"}>
                  <span>{o.estado === "ATENDIDA" ? "Atendida" : "Enviada"}</span>
                </Badge>
                <span className="text-muted-foreground">
                  Enviada el {formatFecha(o.enviada_en)}
                  {o.respuesta_en ? ` · Respuesta del establecimiento el ${formatFecha(o.respuesta_en)}` : ""}
                </span>
              </span>
              <span className="whitespace-pre-line">{o.orientacion}</span>
              {o.respuesta && (
                <span className="whitespace-pre-line">
                  <span className="text-muted-foreground">Respuesta: </span>
                  {o.respuesta}
                </span>
              )}
            </div>
          ))}
        </SeccionPlegable>
      )}

      <SeccionPlegable
        encuadrada
        comoSeccion
        defaultAbierta
        titulo={`Contactos (${d.contactos.length})`}
        accion={
          <Button size="sm" type="button" variant="outline" disabled={!d.banderas.puede_registrar_contacto} onClick={onContacto}>
            <ControlPointIcon data-icon="inline-start" />
            Registrar contacto
          </Button>
        }
        contentClassName="px-4 py-2"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Medio</TableHead>
              <TableHead>Con quién</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Razón informada</TableHead>
              <TableHead>Registrado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {d.contactos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Aún no hay contactos registrados.
                </TableCell>
              </TableRow>
            ) : (
              d.contactos.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{formatFecha(c.fecha)}</TableCell>
                  <TableCell>{c.medio}</TableCell>
                  <TableCell>{c.con_quien}</TableCell>
                  <TableCell>
                    <Badge variant="soft" color={c.resultado_valor === "LOGRADO" ? "success" : "destructive"}>
                      <span>{c.resultado}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal">{c.razon || "—"}</TableCell>
                  <TableCell>{abreviarPersona(c.registrado_por) || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SeccionPlegable>

      <SeccionPlegable encuadrada comoSeccion defaultAbierta titulo="Causas y medidas" contentClassName="px-4 py-4">
        <CausasMedidas key={`${d.id}-${d.medidas}-${d.fecha_prevista}-${d.causas.length}`} d={d} />
      </SeccionPlegable>

      <SeccionPlegable encuadrada comoSeccion defaultAbierta titulo="Ruta de protección" contentClassName="px-4 py-4">
        {d.ruta ? (
          <RutaProteccion d={d} ruta={d.ruta} onRegistrarGestion={onRegistrarGestion} onRegistrarRespuesta={onRegistrarRespuesta} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {d.ruta_activada
              ? "La ruta de protección está activada; su contenido es información sensible."
              : "No se ha activado la ruta de protección."}
          </p>
        )}
      </SeccionPlegable>
    </div>
  )
}
