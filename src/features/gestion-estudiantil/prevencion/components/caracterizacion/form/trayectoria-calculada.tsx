import { FichaDatos } from "@/components/ficha-datos"
import { LockIcon } from "@/components/ui/icons"

import type { AsistenciaCalculada, TrayectoriaCalculada } from "@/features/gestion-estudiantil/prevencion/api/types"

const siNo = (v: boolean | null | undefined) => (v == null ? null : v ? "Sí" : "No")

const asistencia = (a: AsistenciaCalculada | null | undefined) =>
  a && a.sesiones > 0
    ? `${a.porcentaje_asistencia ?? 0} % (${a.inasistencias} ${a.inasistencias === 1 ? "inasistencia" : "inasistencias"}, ${a.justificadas} justificadas, ${a.sesiones} sesiones)`
    : null

/** Lo que el sistema ya sabe de la trayectoria (solo lectura, con su procedencia): no se digita de nuevo. */
export function TrayectoriaCalculadaBloque({ c }: { c: TrayectoriaCalculada }) {
  const previo = c.anio_anterior
  const antecedentes = c.antecedentes_disciplinarios
  const areas = previo?.areas_reprobadas
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <LockIcon aria-hidden="true" className="size-4 text-muted-foreground" />
        Calculado por la plataforma
      </p>
      <FichaDatos
        datos={[
          { etiqueta: "Repitente (Cobertura educativa)", valor: siNo(c.repitente) },
          {
            etiqueta: `Resultado del año anterior${previo ? ` (${previo.anio})` : ""}`,
            valor: previo ? `${previo.resultado ?? "—"}${previo.promovido ? " · Promovido" : ""}` : null,
          },
          { etiqueta: "Grado y grupo del año anterior", valor: previo?.grado_grupo },
          { etiqueta: "Asistencia del año anterior (Gestión académica)", valor: asistencia(previo?.asistencia) },
          {
            etiqueta: "Áreas reprobadas del último período consolidado",
            valor: areas ? `${areas.areas_reprobadas} de ${areas.areas_evaluadas} (${areas.periodo})` : null,
          },
          { etiqueta: "Asistencia del año actual (Gestión académica)", valor: asistencia(c.asistencia_anio_actual) },
          {
            etiqueta: "Anotaciones negativas (Observador)",
            valor: antecedentes ? String(antecedentes.anotaciones_negativas) : null,
          },
          {
            etiqueta: "Casos de convivencia (tipo II y III)",
            valor: antecedentes ? `${antecedentes.casos_convivencia} (${antecedentes.casos_tipo_ii_iii})` : null,
          },
          { etiqueta: "Procesos disciplinarios", valor: antecedentes ? String(antecedentes.procesos_disciplinarios) : null },
        ]}
      />
    </div>
  )
}
