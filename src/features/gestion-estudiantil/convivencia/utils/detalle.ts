import type { CasoAccion, CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"

/** «Sí» / «No», o vacío si no se respondió. */
export const siNoTexto = (b: boolean | null | undefined) => (b == null ? "" : b ? "Sí" : "No")

type CodigoSiuce = CasoAccion["codigos_siuce"][number]

/** Nombre del afectado de un código SIUCE: estudiante por matrícula o funcionario. */
export const nombreAfectado = (caso: CasoDetalle, c: Pick<CodigoSiuce, "fk_matricula" | "fk_funcionario">) =>
  c.fk_matricula
    ? caso.estudiantes?.find((e) => e.fk_matricula === c.fk_matricula)?.nombre
    : caso.otros_involucrados?.find((i) => i.fk_funcionario === c.fk_funcionario)?.nombre
