import type { CasoAccion, CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"

/** «Sí» / «No», o vacío si no se respondió. */
export const siNoTexto = (b: boolean | null | undefined) => (b == null ? "" : b ? "Sí" : "No")

type CodigoSiuce = CasoAccion["codigos_siuce"][number]

/** Nombre del afectado de un código SIUCE: estudiante por matrícula o funcionario. */
export const nombreAfectado = (caso: CasoDetalle, c: Pick<CodigoSiuce, "fk_matricula" | "fk_funcionario">) =>
  c.fk_matricula
    ? caso.estudiantes?.find((e) => e.fk_matricula === c.fk_matricula)?.nombre
    : caso.otros_involucrados?.find((i) => i.fk_funcionario === c.fk_funcionario)?.nombre

/** «Código X · Nombre (Afectado)» por cada código SIUCE de las acciones de Reporte al SIUCE. */
export function codigosReportados(caso: CasoDetalle, codigoAccion: string) {
  return (caso.acciones ?? [])
    .filter((a) => a.accion_codigo === codigoAccion)
    .flatMap((a) => a.codigos_siuce)
    .map((c) => `Código ${c.codigo} · ${c.afectado_nombre ?? nombreAfectado(caso, c) ?? "Afectado"} (Afectado)`)
}

/** Etiqueta del paso de cierre: en Tipo II/III se hace después de la sesión del Comité. */
export const etiquetaPasoCierre = (grave: boolean) => (grave ? "Paso de cierre · después de la sesión del Comité" : "de cierre")
