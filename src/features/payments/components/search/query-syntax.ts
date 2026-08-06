import { optionsTerm, textTerm, type QuerySyntax } from "@/components/search/query-syntax"

import { PAYMENT_STATUSES, type PaymentFiltersFormInput } from "../../api/schema"
import { PAYMENT_STATUS_LABELS } from "../../api/ui-mappings"

/**
 * Sintaxis del buscador de pagos: `estado:(Exitoso) monto_min:(1000)`, y lo
 * que se escribe suelto busca por email. Ver `@/components/search/query-syntax`.
 *
 * Se declara sobre el "input" del schema (montos como string, igual que el
 * form); la conversión a número la hace el zod al aplicar.
 */
export const paymentsSyntax: QuerySyntax<PaymentFiltersFormInput> = {
  empty: { email: "", statuses: [], amountMin: "", amountMax: "" },
  freeText: { key: "email", field: "email" },
  terms: [
    optionsTerm(
      "estado",
      "statuses",
      PAYMENT_STATUSES.map((status) => ({ value: status, label: PAYMENT_STATUS_LABELS[status] })),
    ),
    // Un monto que no es un número se deja como texto: el zod que corre al
    // aplicar los filtros lo rechazaría, y perder lo tecleado a mitad de
    // escribir "1.5" sería peor que no filtrar todavía.
    textTerm("monto_min", "amountMin", { parse: toAmount }),
    textTerm("monto_max", "amountMax", { parse: toAmount }),
  ],
}

function toAmount(text: string): string | undefined {
  const value = text.trim()
  return value !== "" && Number.isFinite(Number(value)) ? value : undefined
}
