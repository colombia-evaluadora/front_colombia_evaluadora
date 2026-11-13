import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, PencilIcon } from "@/components/ui/icons"

import { DatosDocumento } from "@/features/gestion-estudiantil/commons/components/documento-imprimible"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { CaracterizacionDetalle, IntegranteDetalle, ItemLista } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BadgeEstadoCaracterizacion } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/badge-estado-caracterizacion"

const SIN_DATO = "—"
const nombre = (i: ItemLista | null | undefined) => i?.nombre ?? SIN_DATO
const lista = (items: ItemLista[] | undefined) => (items && items.length > 0 ? items.map((i) => i.nombre).join(", ") : SIN_DATO)
const num = (n: number | null | undefined) => (n == null ? SIN_DATO : String(n))
const siNo = (v: boolean | null | undefined) => (v == null ? SIN_DATO : v ? "Sí" : "No")

function lineaIntegrante(i: IntegranteDetalle): string {
  return [
    nombre(i.parentesco),
    i.nombre,
    i.edad != null ? `${i.edad} años` : null,
    i.escolaridad?.nombre,
    i.empleo?.nombre,
    i.vive_con_estudiante ? "Vive con él" : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

interface Props {
  caracterizacion: CaracterizacionDetalle
  /** `banderas.puede_actualizar_caracterizacion`. */
  puedeActualizar: boolean
  /** `ficha.caracterizacion_disponible` es false: no hay nada que resumir, solo el aviso. */
  sinDiligenciar: boolean
  onActualizar: () => void
}

/**
 * Caracterización familiar y de vivienda del año (G.9.CAS.2), de solo lectura: estado con quién y cuándo la
 * confirmó y el resumen del hogar, la vivienda, la trayectoria, los factores y lo registrado por el
 * establecimiento. «Actualizar caracterización» abre el formulario de Prevención.
 */
export function BloqueCaracterizacion({ caracterizacion: c, puedeActualizar, sinDiligenciar, onActualizar }: Props) {
  const h = c.hogar
  const v = c.vivienda
  const t = c.trayectoria.declarada
  const e = c.establecimiento
  const vigentes = e.factores.filter((f) => f.estado !== "DESACTIVADO")

  const filas: [string, ReactNode][] = [
    ["Personas en el hogar", num(h.personas_hogar)],
    ["Vive solo", siNo(h.vive_solo)],
    ["Tipo de vivienda", nombre(v.tipo_vivienda)],
    ["Tenencia de la vivienda", nombre(v.tenencia_vivienda)],
    ["Estado civil de los padres", nombre(h.estado_civil_padres)],
    ["Por qué no vive con sus padres", h.motivo_no_vive_padres ?? SIN_DATO],
    [
      "Integrantes",
      h.integrantes.length === 0 ? (
        SIN_DATO
      ) : (
        <ul key="integrantes" className="flex flex-col gap-0.5">
          {h.integrantes.map((i) => (
            <li key={`${i.orden}-${i.id ?? "d"}`}>{lineaIntegrante(i)}</li>
          ))}
        </ul>
      ),
    ],
    ["Servicios básicos", lista(v.servicios)],
    ["Frecuencia de cambio de domicilio", nombre(v.frecuencia_domicilio)],
    ["Ingresos mensuales del hogar", nombre(h.ingresos)],
    [
      "Personas que aportan ingresos",
      h.aportantes_convivientes == null && h.aportantes_externos == null
        ? SIN_DATO
        : String((h.aportantes_convivientes ?? 0) + (h.aportantes_externos ?? 0)),
    ],
    ["Programas sociales", lista(c.socioeconomica.programas)],
    ["Computador o tableta para estudiar", nombre(c.socioeconomica.equipo_estudiar)],
    ["Trabajo del estudiante", nombre(c.situacion.trabajo_estudiante)],
    [
      "Trayectoria escolar",
      <ul key="trayectoria" className="flex flex-col gap-0.5">
        <li>Retiros previos: {num(t.retiros_previos)}</li>
        <li>Interrupciones previas: {num(t.interrupciones_previas)}</li>
        <li>Meses fuera del sistema: {num(t.meses_fuera_sistema)}</li>
        <li>Asistencia del año anterior: {t.asistencia_anterior_pct != null ? `${t.asistencia_anterior_pct} %` : SIN_DATO}</li>
        <li>Dificultades de aprendizaje: {nombre(t.dificultades)}</li>
      </ul>,
    ],
    [
      "Factores de vulnerabilidad",
      vigentes.length === 0 ? (
        SIN_DATO
      ) : (
        <ul key="factores" className="flex flex-col gap-0.5">
          {vigentes.map((f) => (
            <li key={f.id ?? f.factor.id}>{f.factor.nombre}</li>
          ))}
        </ul>
      ),
    ],
    [
      "Revisión de factores",
      e.revision_factores
        ? `${e.revision_factores.nombre}${e.fecha_revision ? ` · ${formatFecha(e.fecha_revision)}` : ""}${e.revisada_por ? ` · ${e.revisada_por}` : ""}`
        : SIN_DATO,
    ],
    ["Asistencia del acudiente", nombre(e.asistencia_acudiente)],
    ["Observaciones", e.observaciones ?? SIN_DATO],
  ]

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base font-semibold">
          Caracterización familiar y de vivienda {c.anio}
          <BadgeEstadoCaracterizacion estado={c.estado} nombre={c.estado_nombre} />
          {c.estado === "CONFIRMADA" && c.fecha_confirmacion && (
            <span className="text-sm font-normal text-muted-foreground">
              el {formatFecha(c.fecha_confirmacion)}
              {c.confirmada_por ? ` por ${c.confirmada_por}` : ""}
            </span>
          )}
        </h2>
        <Button size="sm" type="button" variant="outline" color="neutral" disabled={!puedeActualizar} onClick={onActualizar}>
          <PencilIcon data-icon="inline-start" />
          Actualizar caracterización
        </Button>
      </div>
      {sinDiligenciar ? (
        <Alert>
          <InfoIcon aria-hidden="true" />
          <AlertDescription>El estudiante aún no tiene la caracterización familiar y de vivienda del año.</AlertDescription>
        </Alert>
      ) : (
        <DatosDocumento filas={filas} />
      )}
    </section>
  )
}
