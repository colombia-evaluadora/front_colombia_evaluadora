import { FichaDatos, type DatoFicha } from "@/components/ficha-datos"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
      {/* Anulación y cierre en sus propias filas de la ficha (antes un aviso con «Anulado el … por …»). */}
      {d.anulacion && (
        <FichaDatos
          datos={[
            { etiqueta: "Fecha de anulación", valor: formatFechaHora(d.anulacion.anulado_en) },
            { etiqueta: "Anulado por", valor: d.anulacion.anulado_por },
            {
              etiqueta: "Motivo de la anulación",
              valor: <span className="whitespace-pre-line">{d.anulacion.motivo}</span>,
              ancho: true,
            },
          ]}
        />
      )}
      {d.cierre && (
        <FichaDatos
          datos={[
            { etiqueta: "Fecha de cierre", valor: formatFechaHora(d.cierre.cerrado_en) },
            { etiqueta: "Cerrado por", valor: d.cierre.cerrado_por },
            { etiqueta: "Resumen del cierre", valor: <span className="whitespace-pre-line">{d.cierre.resumen}</span>, ancho: true },
          ]}
        />
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
        <FichaDatos
          datos={[
            { etiqueta: "Fecha de conocimiento", valor: formatFecha(d.fecha_conocimiento) },
            { etiqueta: "Responsable", valor: abreviarPersona(d.responsable_nombre) },
            ...(d.antecedente
              ? [
                  {
                    etiqueta: "Antecedente",
                    valor: `Acompañamiento del ${formatFecha(d.antecedente.fecha_conocimiento)}${
                      d.antecedente.cerrado_en ? `, cerrado el ${formatFecha(d.antecedente.cerrado_en)}` : ""
                    }`,
                  },
                ]
              : []),
            ...(d.detalle && d.tipo === "EMBARAZO" ? datosEmbarazo(d.detalle as AcompDetalleEmbarazo) : []),
            ...(d.detalle && d.tipo === "CONSUMO" ? datosConsumo(d.detalle as AcompDetalleConsumo) : []),
          ]}
        />
      </SeccionPlegable>

      <SeccionPlegable encuadrada comoSeccion defaultAbierta titulo="Descripción y acuerdos" contentClassName="px-4 py-4">
        <FichaDatos
          datos={[
            {
              etiqueta: d.tipo === "EMBARAZO" ? "Descripción y necesidades de continuidad" : "Descripción de lo observado o informado",
              valor: <span className="whitespace-pre-line">{d.descripcion}</span>,
              ancho: true,
            },
            {
              etiqueta: "Acuerdos de continuidad educativa",
              valor: d.acuerdos && <span className="whitespace-pre-line">{d.acuerdos}</span>,
              ancho: true,
            },
          ]}
        />
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

function datosEmbarazo(e: AcompDetalleEmbarazo): DatoFicha[] {
  return [
    { etiqueta: "Situación de acompañamiento", valor: e.situacion_nombre },
    { etiqueta: "Semanas de gestación informadas", valor: num(e.semanas_gestacion) },
    { etiqueta: "Fecha estimada de parto informada", valor: formatFecha(e.fecha_estimada_parto) },
    { etiqueta: "Fuente de la información de gestación", valor: e.fuente_gestacion },
    { etiqueta: "Fecha de la información", valor: formatFecha(e.fecha_info_gestacion) },
    { etiqueta: "Progenitor conocido", valor: e.progenitor_conocido },
    { etiqueta: "Acompañamiento del progenitor", valor: e.acompanamiento_progenitor },
    { etiqueta: "Apoyo del acudiente", valor: e.apoyo_acudiente },
  ]
}

function datosConsumo(c: AcompDetalleConsumo): DatoFicha[] {
  return [
    { etiqueta: "Origen de la información", valor: c.origen_nombre },
    { etiqueta: "Fuente de la información", valor: c.fuente_info },
    { etiqueta: "Fecha de la información", valor: formatFecha(c.fecha_info) },
    { etiqueta: "Sustancia presunta", valor: c.otra_sustancia ? `${c.sustancia_nombre}: ${c.otra_sustancia}` : c.sustancia_nombre },
    { etiqueta: "Lugar informado", valor: c.otro_lugar ? `${c.lugar_nombre}: ${c.otro_lugar}` : c.lugar_nombre },
    { etiqueta: "Tiempo de consumo informado (semanas)", valor: num(c.semanas_consumo) },
    { etiqueta: "Señales de riesgo informadas", valor: c.senales_riesgo },
    { etiqueta: "Tiempo de señales de riesgo informado (semanas)", valor: num(c.semanas_senales) },
  ]
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
