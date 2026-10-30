import type { z } from "zod"

import { plainTextInvalidChars } from "@/lib/text-input"

/**
 * QA 77: caracteres permitidos en los textos de elecciones, encuestas,
 * evaluaciones y votaciones. Mismos conjuntos que el planeador
 * (`PLAIN_TEXT_PATTERN` / `PLAIN_TEXT_PUNCT_PATTERN` de `@/lib/text-input`):
 * los nombres van sin puntuación; descripciones, lemas y preguntas con ella.
 * Es validación (campo en rojo con el mensaje), no un sanitizador silencioso.
 */
export function mensajeCaracteres(campo: string, invalidos: string[], puntuacion: boolean): string {
  const lista = invalidos.map((c) => (c.trim() ? `"${c}"` : "salto o tabulación")).join(" ")
  const extra = puntuacion ? ", además de . , : ; ¿ ? ¡ ! ( )" : ""
  return `${campo} solo admite letras (con tilde, diéresis o ñ), números, espacios, guiones y apóstrofos${extra}. Quita: ${lista}`
}

/** Refinamiento zod: `z.string().superRefine(caracteresPermitidos("El nombre"))`. */
export function caracteresPermitidos(campo: string, { puntuacion = false }: { puntuacion?: boolean } = {}) {
  return (valor: string, ctx: z.RefinementCtx) => {
    const invalidos = plainTextInvalidChars(valor, { puntuacion })
    if (invalidos.length > 0) {
      ctx.addIssue({ code: "custom", message: mensajeCaracteres(campo, invalidos, puntuacion) })
    }
  }
}
