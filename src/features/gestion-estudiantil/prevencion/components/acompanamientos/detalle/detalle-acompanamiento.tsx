import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { abreviarPersona, formatFecha, formatFechaHora } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type {
  AcompAccion,
  AcompanamientoDetalle,
  AcompDetalleConsumo,
  AcompDetalleEmbarazo,
} from "@/features/gestion-estudiantil/prevencion/api/types"
import { ESTADO_ACCION_ACOMP } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import { BloqueContexto } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/bloque-contexto"

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
const num = (v: number | null) => (v == null ? null : String(v))

/** Contenido del detalle: contexto, datos del tipo, descripción, acciones, reportes vinculados y cierre o anulación. */
interface Props {
  d: AcompanamientoDetalle
  onResultado: (accion: AcompAccion) => void
  onEditarAccion: (accion: AcompAccion) => void
}

export function DetalleAcompanamiento({ d, onResultado, onEditarAccion }: Props) {
  return (
    <div className="flex flex-col gap-4 pb-6">
      {d.anulacion && (
        <Aviso titulo={`Anulado el ${formatFechaHora(d.anulacion.anulado_en)} por ${d.anulacion.anulado_por ?? "—"}`}>
          {d.anulacion.motivo}
        </Aviso>
      )}
      {d.cierre && (
        <Aviso titulo={`Cerrado el ${formatFechaHora(d.cierre.cerrado_en)} por ${d.cierre.cerrado_por ?? "—"}`}>
          {d.cierre.resumen}
        </Aviso>
      )}

      <SeccionPlegable encuadrada comoSeccion defaultAbierta titulo="Estudiante y contexto" contentClassName="px-4 py-4">
        <BloqueContexto contexto={d.contexto} />
      </SeccionPlegable>

      <SeccionPlegable
        encuadrada
        comoSeccion
        defaultAbierta
        titulo={d.tipo === "EMBARAZO" ? "Situación y fuente" : "Información y fuente"}
        contentClassName="flex flex-col gap-4 px-4 py-4"
      >
        <dl className={GRID}>
          <Dato label="Fecha de conocimiento">{formatFecha(d.fecha_conocimiento)}</Dato>
          <Dato label="Responsable">{abreviarPersona(d.responsable_nombre)}</Dato>
          {d.antecedente && (
            <Dato label="Antecedente">
              Acompañamiento del {formatFecha(d.antecedente.fecha_conocimiento)}
              {d.antecedente.cerrado_en ? `, cerrado el ${formatFecha(d.antecedente.cerrado_en)}` : ""}
            </Dato>
          )}
        </dl>
        {d.detalle && d.tipo === "EMBARAZO" && <DatosEmbarazo e={d.detalle as AcompDetalleEmbarazo} />}
        {d.detalle && d.tipo === "CONSUMO" && <DatosConsumo c={d.detalle as AcompDetalleConsumo} />}
      </SeccionPlegable>

      <SeccionPlegable encuadrada comoSeccion defaultAbierta titulo="Descripción y acuerdos" contentClassName="px-4 py-4">
        <dl className="grid grid-cols-1 gap-4">
          <Dato label={d.tipo === "EMBARAZO" ? "Descripción y necesidades de continuidad" : "Descripción de lo observado o informado"}>
            <span className="whitespace-pre-line">{d.descripcion}</span>
          </Dato>
          <Dato label="Acuerdos de continuidad educativa">
            {d.acuerdos && <span className="whitespace-pre-line">{d.acuerdos}</span>}
          </Dato>
        </dl>
      </SeccionPlegable>

      <SeccionPlegable
        encuadrada
        comoSeccion
        defaultAbierta
        titulo={`Acciones y remisiones (${d.acciones.length})`}
        contentClassName="flex flex-col gap-3 px-4 py-4"
      >
        {d.acciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay acciones registradas.</p>
        ) : (
          d.acciones.map((a) => (
            <ItemAccion
              key={a.id}
              a={a}
              // Sin resultado se puede editar (quien registra acciones) o registrar el resultado (su Responsable).
              onEditar={d.puede_registrar_accion && !a.resultado ? () => onEditarAccion(a) : undefined}
              onResultado={a.puede_registrar_resultado && !a.resultado ? () => onResultado(a) : undefined}
            />
          ))
        )}
      </SeccionPlegable>

      {d.tipo === "CONSUMO" && (
        <SeccionPlegable
          encuadrada
          comoSeccion
          defaultAbierta
          titulo={`Reportes vinculados (${d.reportes_vinculados.length})`}
          contentClassName="flex flex-col gap-3 px-4 py-4"
        >
          {d.reportes_vinculados.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay reportes vinculados.</p>
          ) : (
            d.reportes_vinculados.map((r) => (
              <div key={r.id} className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  {formatFecha(r.fecha_conocimiento)} · {abreviarPersona(r.reportado_por) || "—"} · Fuente: {r.fuente}
                </span>
                <span className="whitespace-pre-line">“{r.descripcion}”</span>
              </div>
            ))
          )}
        </SeccionPlegable>
      )}
    </div>
  )
}

function Aviso({ titulo, children }: { titulo: string; children: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border px-4 py-3 text-sm">
      <span className="font-medium">{titulo}</span>
      <span className="whitespace-pre-line">{children}</span>
    </div>
  )
}

function DatosEmbarazo({ e }: { e: AcompDetalleEmbarazo }) {
  return (
    <dl className={GRID}>
      <Dato label="Situación de acompañamiento">{e.situacion_nombre}</Dato>
      <Dato label="Semanas de gestación informadas">{num(e.semanas_gestacion)}</Dato>
      <Dato label="Fecha estimada de parto informada">{formatFecha(e.fecha_estimada_parto)}</Dato>
      <Dato label="Fuente de la información de gestación">{e.fuente_gestacion}</Dato>
      <Dato label="Fecha de la información">{formatFecha(e.fecha_info_gestacion)}</Dato>
      <Dato label="Progenitor conocido">{e.progenitor_conocido}</Dato>
      <Dato label="Acompañamiento del progenitor">{e.acompanamiento_progenitor}</Dato>
      <Dato label="Apoyo del acudiente">{e.apoyo_acudiente}</Dato>
    </dl>
  )
}

function DatosConsumo({ c }: { c: AcompDetalleConsumo }) {
  return (
    <dl className={GRID}>
      <Dato label="Origen de la información">{c.origen_nombre}</Dato>
      <Dato label="Fuente de la información">{c.fuente_info}</Dato>
      <Dato label="Fecha de la información">{formatFecha(c.fecha_info)}</Dato>
      <Dato label="Sustancia presunta">{c.otra_sustancia ? `${c.sustancia_nombre}: ${c.otra_sustancia}` : c.sustancia_nombre}</Dato>
      <Dato label="Lugar informado">{c.otro_lugar ? `${c.lugar_nombre}: ${c.otro_lugar}` : c.lugar_nombre}</Dato>
      <Dato label="Tiempo de consumo informado (semanas)">{num(c.semanas_consumo)}</Dato>
      <Dato label="Señales de riesgo informadas">{c.senales_riesgo}</Dato>
      <Dato label="Tiempo de señales de riesgo informado (semanas)">{num(c.semanas_senales)}</Dato>
    </dl>
  )
}

function ItemAccion({ a, onEditar, onResultado }: { a: AcompAccion; onEditar?: () => void; onResultado?: () => void }) {
  const e = ESTADO_ACCION_ACOMP[a.estado]
  const rx = a.remision
  const t = (k: string) => (rx && typeof rx[k] === "string" ? (rx[k] as string) : null)
  return (
    <div className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{a.tipo_nombre}</span>
        <span className="text-muted-foreground">
          {formatFecha(a.fecha)} · {abreviarPersona(a.responsable_nombre)}
          {a.plazo ? ` · Plazo ${formatFecha(a.plazo)}` : ""}
        </span>
        <Badge variant="soft" color={e.color}>
          <span>{e.label}</span>
        </Badge>
        {(onEditar || onResultado) && !a.resultado && (
          <span className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" color="neutral" type="button" disabled={!onEditar} onClick={onEditar}>
              Modificar
            </Button>
            <Button size="sm" variant="outline" type="button" disabled={!onResultado} onClick={onResultado}>
              Registrar resultado
            </Button>
          </span>
        )}
      </div>
      {a.descripcion && <p className="whitespace-pre-line">{a.descripcion}</p>}
      {a.resultado && (
        <p className="whitespace-pre-line">
          <span className="text-muted-foreground">
            Resultado{a.realizada_en ? ` (${formatFechaHora(a.realizada_en)}${a.realizada_por ? `, ${a.realizada_por}` : ""})` : ""}:{" "}
          </span>
          {a.resultado}
        </p>
      )}
      {rx && (
        <p>
          <span className="text-muted-foreground">Remisión: </span>
          {[t("entidad_nombre"), t("motivo"), t("fecha_remision") && formatFecha(t("fecha_remision"))].filter(Boolean).join(" · ")}
          {t("respuesta") && <span className="block">Respuesta: {t("respuesta")}</span>}
        </p>
      )}
      {a.soportes.length > 0 && (
        <p className="text-muted-foreground">Soportes: {a.soportes.map((s) => s.nombre).join(", ")}</p>
      )}
    </div>
  )
}
