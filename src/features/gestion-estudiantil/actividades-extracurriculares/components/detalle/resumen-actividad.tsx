import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { ActividadDetalle } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { textoCupos } from "@/features/gestion-estudiantil/actividades-extracurriculares/utils/formatos-actividad"

/**
 * Resumen de la actividad (G.5.ACT.DET.1): Responsable · Sede · Jornada · grados · cupos; Horario · fechas ·
 * Registra asistencia; y la entidad y el supervisor externos si los hay.
 */
export function ResumenActividad({ actividad: a }: { actividad: ActividadDetalle }) {
  const grados = a.grados.map((g) => g.nombre).join(", ")
  const linea2 = [
    a.horario,
    `${formatFecha(a.fecha_inicio)} a ${formatFecha(a.fecha_fin)}`,
    a.registra_asistencia ? "Registra asistencia" : null,
  ].filter(Boolean)

  return (
    <section className="flex flex-col gap-1 text-sm" aria-label="Resumen de la actividad">
      <p className="text-muted-foreground">
        Responsable: <span className="text-foreground">{abreviarPersona(a.responsable_nombre)}</span>
        {` · ${a.sede_nombre} · ${a.jornada_nombre}`}
        {grados ? ` · ${grados}` : ""}
        {" · "}
        <strong className="font-semibold text-foreground">{textoCupos(a)}</strong>
      </p>
      <p className="text-muted-foreground">{linea2.join(" · ")}</p>
      {(a.entidad_externa || a.supervisor_externo) && (
        <p className="text-muted-foreground">
          {a.entidad_externa && <>Entidad externa: {a.entidad_externa}</>}
          {a.entidad_externa && a.supervisor_externo && " · "}
          {a.supervisor_externo && <>Supervisor externo: {a.supervisor_externo}</>}
        </p>
      )}
      {a.descripcion && <p className="pt-1">{a.descripcion}</p>}
    </section>
  )
}
