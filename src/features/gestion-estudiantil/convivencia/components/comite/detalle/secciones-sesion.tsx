import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckIcon, FileDownloadOutlinedIcon, PaperclipIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import type { SesionDetalle } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { COLOR_ESTADO, formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { EstadoCasoCodigo } from "@/features/gestion-estudiantil/convivencia/api/types"
import { Dato, Seccion } from "@/features/gestion-estudiantil/convivencia/components/detalle/dato"
import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"
import { dia, textoAsistentes } from "@/features/gestion-estudiantil/convivencia/utils/comite"

/** Datos de la sesión: período, tipo y fecha. */
export function DatosSesion({ sesion, periodo }: { sesion: SesionDetalle; periodo: string }) {
  return (
    <dl className="grid grid-cols-1 gap-4 rounded-lg border border-border p-4 sm:grid-cols-3">
      <Dato label="Período Académico">{periodo}</Dato>
      <Dato label="Tipo de sesión">{sesion.tipo_nombre}</Dato>
      <Dato label="Fecha">{formatFecha(dia(sesion.fecha))}</Dato>
    </dl>
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
        <span>acta-comite-{dia(sesion.fecha)}.pdf</span>
        <Button size="icon-sm" variant="ghost" color="neutral" aria-label="Descargar acta" onClick={onDescargar} disabled={descargando}>
          {descargando ? <SpinnerIcon className="animate-spin" /> : <FileDownloadOutlinedIcon />}
        </Button>
      </div>
    </Seccion>
  )
}
