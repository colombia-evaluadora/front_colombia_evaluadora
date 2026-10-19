import { useQuery } from "@tanstack/react-query"
import { endOfDay, startOfDay } from "date-fns"

import { parseDateValue } from "@/lib/date-value"

import { eventosMock } from "@/features/bitacora/api/mock-bitacora"
import type { BitacoraEvento } from "@/features/bitacora/api/types/bitacora"
import type { BitacoraFilters } from "@/features/bitacora/hooks/use-bitacora-filters"

const all = ["bitacora"] as const
export const bitacoraKeys = {
  all,
  lista: (filters: BitacoraFilters) => [...all, "lista", filters] as const,
}

const normalizar = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

function coincide(e: BitacoraEvento, f: BitacoraFilters) {
  const q = normalizar(f.q.trim())
  if (q && !normalizar(e.usuario.nombre).includes(q) && !e.usuario.documento.includes(q)) return false
  if (f.sede && e.sede !== f.sede) return false
  if (f.jornada && e.jornada !== f.jornada) return false
  if (f.entidad && e.entidad !== f.entidad) return false
  if (f.accion.length && !f.accion.includes(e.accion)) return false
  const desde = parseDateValue(f.desde)
  const hasta = parseDateValue(f.hasta)
  if (desde && e.fecha < startOfDay(desde)) return false
  if (hasta && e.fecha > endOfDay(hasta)) return false
  return true
}

// TODO: reemplazar por el endpoint de la bitácora cuando exista en el back.
async function fetchBitacora(filters: BitacoraFilters) {
  await new Promise((r) => setTimeout(r, 250))
  return eventosMock(filters.modulo).filter((e) => coincide(e, filters))
}

export function useBitacoraQuery(filters: BitacoraFilters) {
  return useQuery({
    queryKey: bitacoraKeys.lista(filters),
    queryFn: () => fetchBitacora(filters),
    placeholderData: (prev) => prev,
  })
}
