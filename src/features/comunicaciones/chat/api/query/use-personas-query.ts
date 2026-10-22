import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Persona } from "@/features/comunicaciones/chat/api/types"

// La búsqueda es del servidor (nombre, correo, usuario o documento, sin tildes
// ni mayúsculas, dentro del alcance del usuario). Antes se bajaba una sola
// página sin `q` y se filtraba en el front, así que quien no entraba en esa
// página nunca aparecía.
const MIN_CARACTERES = 2
const ESPERA_MS = 300
const LIMITE = 50

function useDebounced(valor: string) {
  const [v, setV] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ESPERA_MS)
    return () => clearTimeout(t)
  }, [valor])
  return v
}

/** Normaliza para comparar en el front igual que el servidor (sin tildes ni mayúsculas). */
export function normalizarBusqueda(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim()
}

// Sin texto (o con menos de MIN_CARACTERES) trae la primera página del directorio.
// `paraGrupo`: el buscador de un grupo no ofrece acudientes (irán por invitación; comms-service
// tampoco los agrega).
export function usePersonasQuery(enabled = true, texto = "", { paraGrupo = false }: { paraGrupo?: boolean } = {}) {
  const debounced = useDebounced(texto.trim())
  const q = debounced.length >= MIN_CARACTERES ? debounced : ""
  return useQuery({
    queryKey: [...chatKeys.personas, q, ...(paraGrupo ? ["grupo"] : [])],
    queryFn: async () => {
      const params = new URLSearchParams({ limite: String(LIMITE) })
      if (q) params.set("q", q)
      if (paraGrupo) params.set("paraGrupo", "true")
      const rows = await evalCol.getRows<Persona>(`/comunicaciones/personas?${params}`)
      return paraGrupo ? rows.filter((p) => p.perfil !== "ACUDIENTE") : rows
    },
    enabled,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  })
}

/**
 * Filtro local mientras llega la respuesta: el servidor también busca por
 * documento, así que lo que él devolvió para la consulta actual se respeta.
 */
export function coincidePersona(p: Persona, consulta: string, delServidor: boolean) {
  if (delServidor) return true
  const t = normalizarBusqueda(consulta)
  return !t || normalizarBusqueda(p.nombre).includes(t) || normalizarBusqueda(p.correo ?? "").includes(t)
}
