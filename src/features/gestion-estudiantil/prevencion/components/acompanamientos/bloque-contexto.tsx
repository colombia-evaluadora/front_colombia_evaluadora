import { FichaDatos } from "@/components/ficha-datos"

import type { ContextoAcompanamiento } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BadgeEstadoMatricula } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/badges-acompanamiento"

const t = (v: unknown) => (typeof v === "string" && v ? v : null)

/** Datos del estudiante y contexto (solo lectura · Cobertura): se corrigen en Cobertura Educativa. */
export function BloqueContexto({ contexto }: { contexto: ContextoAcompanamiento | null }) {
  const c = contexto ?? {}
  return (
    <FichaDatos
      datos={[
        { etiqueta: "Documento", valor: t(c.documento) },
        { etiqueta: "Sede", valor: t(c.sede_nombre) },
        { etiqueta: "Jornada", valor: t(c.jornada_nombre) },
        { etiqueta: "Período académico", valor: t(c.periodo_academico) },
        { etiqueta: "Grado/Grupo", valor: t(c.grado_grupo) },
        {
          etiqueta: "Estado de matrícula",
          valor: t(c.estado_matricula_nombre) && <BadgeEstadoMatricula nombre={t(c.estado_matricula_nombre)} />,
        },
      ]}
    />
  )
}
