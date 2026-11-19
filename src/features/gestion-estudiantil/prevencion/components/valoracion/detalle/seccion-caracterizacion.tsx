import { Link } from "@tanstack/react-router"

import { paths } from "@/config/paths"

import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { CaracterizacionResumen } from "@/features/gestion-estudiantil/prevencion/api/types"

const lista = (v: string[] | undefined) => (v && v.length > 0 ? v.join(" · ") : "Ninguno")

/** Caracterización familiar y de vivienda del estudiante como contexto de la valoración (§9.8); solo sensibles. */
export function SeccionCaracterizacion({ resumen: r, matricula }: { resumen: CaracterizacionResumen; matricula: number }) {
  return (
    <SeccionPlegable encuadrada comoSeccion titulo="Caracterización familiar y de vivienda" contentClassName="flex flex-col gap-4 px-4 py-4">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Dato label="Estado">
          {r.estado_nombre}
          {r.fecha_confirmacion ? ` (${formatFecha(r.fecha_confirmacion)})` : ""}
        </Dato>
        {r.existe && (
          <>
            <Dato label="Personas en el hogar">{r.vive_solo ? "Vive solo" : (r.personas_hogar ?? "—")}</Dato>
            <Dato label="Tipo de vivienda">{r.tipo_vivienda ?? "—"}</Dato>
            <Dato label="Tenencia de la vivienda">{r.tenencia_vivienda ?? "—"}</Dato>
            <Dato label="Internet en el hogar">{r.internet_hogar ?? "—"}</Dato>
            <Dato label="Equipo para estudiar">{r.equipo_estudiar ?? "—"}</Dato>
            <Dato label="Trabajo del estudiante">{r.trabajo_estudiante ?? "—"}</Dato>
            <Dato label="Ingresos del hogar">{r.ingresos ?? "—"}</Dato>
            <Dato label="Revisión de los factores">{r.revision_factores ?? "—"}</Dato>
          </>
        )}
      </dl>
      {r.existe && (
        <>
          <p className="text-sm">
            <span className="text-muted-foreground">Factores de vulnerabilidad vigentes: </span>
            {lista(r.factores_vigentes)}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Estrategias que requiere: </span>
            {lista(r.estrategias_requeridas)}
          </p>
        </>
      )}
      <p className="text-sm">
        <Link to={paths.app.prevencionCaracterizacion.getHref(matricula) as never} className="text-primary hover:underline">
          Ver la caracterización completa
        </Link>
      </p>
    </SeccionPlegable>
  )
}
