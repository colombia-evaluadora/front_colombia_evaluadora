import { Link } from "@tanstack/react-router"

import { FichaDatos } from "@/components/ficha-datos"
import { paths } from "@/config/paths"

import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { CaracterizacionResumen } from "@/features/gestion-estudiantil/prevencion/api/types"

const lista = (v: string[] | undefined) => (v && v.length > 0 ? v.join(" · ") : "Ninguno")

/** Caracterización familiar y de vivienda del estudiante como contexto de la valoración (§9.8); solo sensibles. */
export function SeccionCaracterizacion({ resumen: r, matricula }: { resumen: CaracterizacionResumen; matricula: number }) {
  return (
    <SeccionPlegable encuadrada comoSeccion titulo="Caracterización familiar y de vivienda" contentClassName="flex flex-col gap-4 px-4 py-4">
      <FichaDatos
        datos={[
          {
            etiqueta: "Estado",
            valor: `${r.estado_nombre ?? ""}${r.fecha_confirmacion ? ` (${formatFecha(r.fecha_confirmacion)})` : ""}`,
          },
          ...(r.existe
            ? [
                { etiqueta: "Personas en el hogar", valor: r.vive_solo ? "Vive solo" : (r.personas_hogar ?? "—") },
                { etiqueta: "Tipo de vivienda", valor: r.tipo_vivienda ?? "—" },
                { etiqueta: "Tenencia de la vivienda", valor: r.tenencia_vivienda ?? "—" },
                { etiqueta: "Internet en el hogar", valor: r.internet_hogar ?? "—" },
                { etiqueta: "Equipo para estudiar", valor: r.equipo_estudiar ?? "—" },
                { etiqueta: "Trabajo del estudiante", valor: r.trabajo_estudiante ?? "—" },
                { etiqueta: "Ingresos del hogar", valor: r.ingresos ?? "—" },
                { etiqueta: "Revisión de los factores", valor: r.revision_factores ?? "—" },
                // Antes dos líneas «etiqueta: valor» debajo de la grilla; ahora filas completas de la ficha.
                { etiqueta: "Factores de vulnerabilidad vigentes", valor: lista(r.factores_vigentes), ancho: true },
                { etiqueta: "Estrategias que requiere", valor: lista(r.estrategias_requeridas), ancho: true },
              ]
            : []),
        ]}
      />
      <p className="text-sm">
        <Link to={paths.app.prevencionCaracterizacion.getHref(matricula) as never} className="text-primary hover:underline">
          Ver la caracterización completa
        </Link>
      </p>
    </SeccionPlegable>
  )
}
