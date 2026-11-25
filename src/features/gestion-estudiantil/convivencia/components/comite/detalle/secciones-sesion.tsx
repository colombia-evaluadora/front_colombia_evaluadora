import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckIcon, FileDownloadOutlinedIcon, PaperclipIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import type { SesionDetalle } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { COLOR_ESTADO } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { formatFecha, formatHora } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { EstadoCasoCodigo } from "@/features/gestion-estudiantil/convivencia/api/types"
import { Dato, Seccion } from "@/features/gestion-estudiantil/commons/components/dato"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { BadgeQuorum } from "@/features/gestion-estudiantil/convivencia/components/comite/badge-quorum"
import { ChipArchivo } from "@/features/gestion-estudiantil/convivencia/components/procesos/detalle/chip-archivo"
import { dia, nombreActa, textoAsistentes, textoMotivoQuorum } from "@/features/gestion-estudiantil/convivencia/utils/comite"

/** Datos de la sesión: período, tipo y fecha. */
export function DatosSesion({ sesion, periodo }: { sesion: SesionDetalle; periodo: string }) {
  const motivo = sesion.con_quorum ? null : textoMotivoQuorum(sesion.motivo_quorum)
  return (
    <dl className="grid grid-cols-1 gap-4 rounded-lg border border-border p-4 sm:grid-cols-3">
      <Dato label="Período académico">{periodo}</Dato>
      <Dato label="Tipo de sesión">{sesion.tipo_nombre}</Dato>
      <Dato label="Fecha">{formatFecha(dia(sesion.fecha))}</Dato>
      <Dato label="Hora">{formatHora(sesion.hora)}</Dato>
      <Dato label="Lugar">{sesion.lugar}</Dato>
      <Dato label="Elabora el acta">
        {sesion.elabora ? `${sesion.elabora.cargo_nombre} · ${sesion.elabora.nombre}` : ""}
      </Dato>
      <Dato label="Quórum">
        <span className="flex flex-wrap items-center gap-2">
          <BadgeQuorum conQuorum={sesion.con_quorum} />
          {sesion.criterio_quorum && <span className="text-muted-foreground">Criterio de quórum: {sesion.criterio_quorum}</span>}
          {motivo && <span className="text-muted-foreground">{motivo}</span>}
        </span>
      </Dato>
      {sesion.objetivo && (
        <div className="sm:col-span-3">
          <Dato label="Objetivo">
            <span className="whitespace-pre-wrap">{sesion.objetivo}</span>
          </Dato>
        </div>
      )}
      {sesion.orden_dia && (
        <div className="sm:col-span-3">
          <Dato label="Orden del día">
            <span className="whitespace-pre-wrap">{sesion.orden_dia}</span>
          </Dato>
        </div>
      )}
    </dl>
  )
}

/** Forma de elección de cada integrante (solo sesiones de Conformación). */
export function EleccionSesion({ sesion }: { sesion: SesionDetalle }) {
  const eleccion = sesion.eleccion ?? []
  if (eleccion.length === 0) return null
  return (
    <Seccion titulo="Elección de integrantes">
      <ul className="flex flex-col gap-1.5 text-sm">
        {eleccion.map((e) => (
          <li key={e.fk_integrante}>
            <span className="font-medium">{e.cargo_nombre}</span>
            <span className="text-muted-foreground"> · {e.nombre} · </span>
            {e.forma_eleccion}
          </li>
        ))}
      </ul>
    </Seccion>
  )
}

/** Adjuntos: se ven aquí y no salen en el PDF del acta. */
export function AdjuntosSesion({ sesion }: { sesion: SesionDetalle }) {
  const adjuntos = sesion.adjuntos ?? []
  if (adjuntos.length === 0) return null
  return (
    <Seccion titulo={`Adjuntos (${adjuntos.length})`}>
      <div className="flex flex-wrap gap-2">
        {adjuntos.map((a) => (
          <ChipArchivo
            key={a.id}
            archivo={{ pk_tarchivo: a.fk_archivo, nombre: a.nombre, tamano_bytes: a.peso ?? 0, tipo_mime: a.tipo ?? "" }}
          />
        ))}
      </div>
    </Seccion>
  )
}

/** Asistentes (N de M) a dos columnas e invitados en una línea, con su calidad. */
export function AsistentesSesion({ sesion }: { sesion: SesionDetalle }) {
  const asistieron = sesion.asistentes.filter((a) => a.asistio).length
  return (
    <Seccion titulo={`Asistentes (${textoAsistentes(asistieron, sesion.integrantes_vigentes)})`}>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {sesion.asistentes.map((a) => (
          <li key={a.fk_integrante} className="flex items-center gap-2 text-sm">
            {a.asistio ? (
              <CheckIcon className="size-4 shrink-0 text-success" aria-label="Asistió" />
            ) : (
              <XIcon className="size-4 shrink-0 text-muted-foreground" aria-label="No asistió" />
            )}
            <span>
              <span className="font-medium">{a.cargo_nombre}</span>
              <span className="text-muted-foreground">
                {a.estamento && ` · ${a.estamento}`}
                {" · "}
                {a.nombre}
                {!a.asistio && " (no asistió)"}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {sesion.invitados.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Invitados:{" "}
          {sesion.invitados.map((i, n) => (
            <span key={n}>
              {n > 0 && ", "}
              <span className="text-foreground">{i.nombre}</span> ({i.calidad})
            </span>
          ))}
        </p>
      )}
    </Seccion>
  )
}

/** Tarjetas de «Casos tratados» con enlace al caso, tipo, manifestación, estado, decisión y seguimiento. */
export function CasosSesion({ sesion }: { sesion: SesionDetalle }) {
  if (sesion.casos.length === 0) return null
  return (
    <SeccionPlegable encuadrada comoSeccion titulo={`Casos tratados (${sesion.casos.length})`} contentClassName="flex flex-col gap-3 px-4 py-4">
      <ul className="flex flex-col gap-2">
        {sesion.casos.map((c) => (
          <li key={c.fk_caso} className="flex flex-col gap-2 rounded-lg border border-border p-4 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                to={paths.app.convivenciaCaso.getHref(c.fk_caso)}
                className="underline underline-offset-3"
              >
                Caso {c.numero}
              </Link>
              <span className="text-muted-foreground">
                · {c.tipo_nombre}
                {c.manifestacion_nombre && ` · ${c.manifestacion_nombre}`} ·
              </span>
              <Badge variant="soft" color={COLOR_ESTADO[c.estado_codigo as EstadoCasoCodigo] ?? "muted"}>
                {c.estado_nombre}
              </Badge>
            </div>
            <p className="whitespace-pre-wrap">
              <span className="text-muted-foreground">Decisión: </span>
              {c.decision}
            </p>
            <p>
              <span className="text-muted-foreground">Seguimiento: </span>
              {c.fk_funcionario_responsable != null && c.fecha_seguimiento
                ? `${c.responsable_nombre ?? ""} · ${formatFecha(dia(c.fecha_seguimiento))}`
                : "no se programó"}
            </p>
          </li>
        ))}
      </ul>
    </SeccionPlegable>
  )
}

export function OtrosTemasSesion({ sesion }: { sesion: SesionDetalle }) {
  if (!sesion.otros_temas) return null
  return (
    <p className="text-sm whitespace-pre-wrap">
      <span className="text-muted-foreground">Otros temas tratados: </span>
      {sesion.otros_temas}
    </p>
  )
}

/** Acta como archivo: se genera al pedirla, por eso siempre refleja la sesión vigente. */
export function ActaSesion({ sesion, descargando, onDescargar }: { sesion: SesionDetalle; descargando: boolean; onDescargar: () => void }) {
  return (
    <Seccion titulo="Acta">
      <div className="flex w-fit items-center gap-2 rounded-lg border border-border px-3 py-1 text-sm">
        <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>{nombreActa(sesion)}</span>
        <Button size="icon-sm" variant="ghost" color="neutral" aria-label="Descargar acta" onClick={onDescargar} disabled={descargando}>
          {descargando ? <SpinnerIcon className="animate-spin" /> : <FileDownloadOutlinedIcon />}
        </Button>
      </div>
    </Seccion>
  )
}
