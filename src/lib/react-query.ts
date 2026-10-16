import type { UseMutationOptions, DefaultOptions } from "@tanstack/react-query"

import { isNetworkError } from "@/lib/network-error"

export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    // Solo se reintenta lo transitorio (red/gateway), máximo 2 veces; un
    // 400/409 de negocio no va a cambiar reintentando.
    retry: (failureCount: number, error: unknown) => isNetworkError(error) && failureCount < 2,
    networkMode: "online",
    staleTime: 1000 * 60,
  },
  // Las mutaciones nunca se reintentan solas: reenviar un guardado debe ser
  // una decisión explícita (y con la misma `Idempotency-Key`).
  mutations: {
    retry: false,
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
