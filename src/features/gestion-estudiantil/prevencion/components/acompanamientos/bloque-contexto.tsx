import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import type { ContextoAcompanamiento } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BadgeEstadoMatricula } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/badges-acompanamiento"

const t = (v: unknown) => (typeof v === "string" && v ? v : null)

/** Datos del estudiante y contexto (solo lectura · Cobertura): se corrigen en Cobertura Educativa. */
export function BloqueContexto({ contexto }: { contexto: ContextoAcompanamiento | null }) {
  const c = contexto ?? {}
  return (
    <dl className="grid grid-cols-1 gap-4 rounded-md border px-4 py-3 sm:grid-cols-2 xl:grid-cols-3">
      <Dato label="Documento">{t(c.documento)}</Dato>
      <Dato label="Sede">{t(c.sede_nombre)}</Dato>
      <Dato label="Jornada">{t(c.jornada_nombre)}</Dato>
      <Dato label="Período Académico">{t(c.periodo_academico)}</Dato>
      <Dato label="Grado/Grupo">{t(c.grado_grupo)}</Dato>
      <Dato label="Estado de matrícula">
        {t(c.estado_matricula_nombre) && <BadgeEstadoMatricula nombre={t(c.estado_matricula_nombre)} />}
      </Dato>
    </dl>
  )
}
