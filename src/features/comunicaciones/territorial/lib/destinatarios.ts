import type { ComunicadoTerritorial } from "@/features/comunicaciones/territorial/api/comunicados-territorial"
import { resumenDestinatarios } from "@/features/comunicaciones/chat/lib/destinos-comunicado"
import type { TipoDestinatario } from "@/features/comunicaciones/comunicados/api/comunicados-gestion"

type Destinatarios = Pick<ComunicadoTerritorial, "audiencia" | "destinos">

export const dirigidoA = (c: Destinatarios) => resumenDestinatarios(c.audiencia, c.destinos) || "—"

/**
 * Tipos de destinatario: la audiencia por rol más los de cada conjunto del formulario por documento.
 * Un comunicado solo para funcionarios no trae audiencia: su tipo está únicamente en los conjuntos.
 */
export const tiposTerritorial = (c: Destinatarios): TipoDestinatario[] => [
  ...new Set([...c.audiencia, ...(c.destinos?.conjuntos ?? []).flatMap((x) => x.tipos ?? [])]),
]
