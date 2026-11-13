import { LockIcon } from "@/components/ui/icons"

import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
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
      <dl className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Dato label="Repitente (Cobertura Educativa)">{siNo(c.repitente)}</Dato>
        <Dato label={`Resultado del año anterior${previo ? ` (${previo.anio})` : ""}`}>
          {previo ? `${previo.resultado ?? "—"}${previo.promovido ? " · Promovido" : ""}` : null}
        </Dato>
        <Dato label="Grado y grupo del año anterior">{previo?.grado_grupo}</Dato>
        <Dato label="Asistencia del año anterior (Gestión Académica)">{asistencia(previo?.asistencia)}</Dato>
        <Dato label="Áreas reprobadas del último período consolidado">
          {areas ? `${areas.areas_reprobadas} de ${areas.areas_evaluadas} (${areas.periodo})` : null}
        </Dato>
        <Dato label="Asistencia del año actual (Gestión Académica)">{asistencia(c.asistencia_anio_actual)}</Dato>
        <Dato label="Anotaciones negativas (Observador)">{antecedentes ? String(antecedentes.anotaciones_negativas) : null}</Dato>
        <Dato label="Casos de convivencia (tipo II y III)">
          {antecedentes ? `${antecedentes.casos_convivencia} (${antecedentes.casos_tipo_ii_iii})` : null}
        </Dato>
        <Dato label="Procesos disciplinarios">{antecedentes ? String(antecedentes.procesos_disciplinarios) : null}</Dato>
      </dl>
    </div>
  )
}
