import { onlineManager, type UseMutationOptions, type DefaultOptions } from "@tanstack/react-query"

import { isNetworkError } from "@/lib/network-error"

export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    // Solo se reintenta lo transitorio (red/gateway), máximo 2 veces; un
    // 400/409 de negocio no va a cambiar reintentando. Sin red tampoco: el
    // reintento fallaría igual y solo alargaba el "cargando" (~3 s) antes de
    // mostrar que el dato no está guardado en el equipo.
    retry: (failureCount: number, error: unknown) =>
      isNetworkError(error) && failureCount < 2 && onlineManager.isOnline(),
    // Sin `networkMode` fijo a propósito: lo decide `OfflineAwareQueryClient`
    // por query (con datos → "online", el refetch se pausa sin red; sin datos
    // → "always", falla al instante en vez de quedar pausada para siempre).
    // Ver `lib/offline/offline-query-client.ts`.
    staleTime: 1000 * 60,
  },
  mutations: {
    // Las mutaciones nunca se reintentan solas: reenviar un guardado debe ser
    // una decisión explícita (y con la misma `Idempotency-Key`).
    retry: false,
    // Con el default ("online") una mutación sin red quedaba PAUSADA: el botón
    // se quedaba en "Guardando…" para siempre. Las escrituras que funcionan
    // sin red ya pasan por la outbox (D3: nunca mutaciones pausadas de
    // TanStack); el resto debe fallar enseguida con "esta acción necesita
    // internet" (`getErrorMessage`).
    networkMode: "always",
  },
} satisfies DefaultOptions

export type ApiFnReturnType<FnType extends (...args: any) => Promise<any>> = Awaited<
  ReturnType<FnType>
>

export type QueryConfig<T extends (...args: any[]) => any> = Omit<
  ReturnType<T>,
  "queryKey" | "queryFn"
>

export type MutationConfig<MutationFnType extends (...args: any) => Promise<any>> =
  UseMutationOptions<ApiFnReturnType<MutationFnType>, Error, Parameters<MutationFnType>[0]>
