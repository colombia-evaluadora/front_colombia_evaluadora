import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { postMultipart } from "@/lib/files"

import { BASE, PIAR, piarKeys } from "@/features/gestion-estudiantil/inclusion/piar/api/query-keys"

/** `POST /soporte` (file-service, V605): devuelve el `pk_tarchivo` que luego va en el endpoint de negocio. */
export async function subirSoportePiar(file: File): Promise<number> {
  const raw = await postMultipart<{ rows?: Record<string, unknown>[] } | Record<string, unknown>>(
    `/eval-col${BASE}/soporte`,
    {},
    { SOPORTE: file },
  )
  const fila = (raw && "rows" in raw && Array.isArray(raw.rows) ? raw.rows[0] : raw) as Record<string, unknown>
  const pk = fila?.pk_tarchivo
  if (typeof pk !== "number") throw new Error("No se pudo cargar el soporte.")
  return pk
}

export interface Operacion {
  method: "post" | "put" | "patch"
  /** Relativa a `/gestion-estudiantil/inclusion/piar`. */
  url: string
  body?: unknown
}

export const enviar = ({ method, url, body }: Operacion) => api[method](`/eval-col${PIAR}${url}`, body ?? {})

/** Toda escritura del expediente recalcula lista, ficha, historial y opciones: las reglas cruzan bloques. */
export function usePiarMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: enviar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: piarKeys.all }),
  })
}

/** Forma corta para los modales: `ejecutar("post", "/1/cerrar", cuerpo)`. */
export function useEjecutarPiar() {
  const { mutateAsync } = usePiarMutation()
  return (method: Operacion["method"], url: string, body?: unknown) => mutateAsync({ method, url, body })
}
