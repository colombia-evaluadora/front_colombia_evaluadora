/**
 * `QueryClient` que ninguna pantalla deja "cargando" para siempre sin red
 * (auditoría de cargas infinitas offline, `docs/offline/AUDITORIA-RUTAS.md`).
 *
 * El problema: con el `networkMode: "online"` de TanStack, una query SIN datos
 * que arranca sin red queda `pending` con `fetchStatus: "paused"` hasta que
 * vuelva la conexión. La pantalla ve `isPending` y muestra su skeleton o
 * spinner indefinidamente. Solo dos pantallas lo detectaban a mano
 * (`isOfflineWithoutData`).
 *
 * La solución es un `networkMode` HÍBRIDO, decidido por query según tenga o no
 * datos (en memoria o restaurados del persister):
 *
 * - **Sin datos → `"always"`**: el `queryFn` corre igual sin red, la request
 *   falla al instante (`Network Error`), el `retry` no reintenta sin red
 *   (`lib/react-query.ts`) y la query termina en `error`. La pantalla sale del
 *   "cargando" en milisegundos y muestra su error, que `getErrorMessage`
 *   traduce a "Sin conexión: esta información no está guardada en este equipo".
 * - **Con datos → `"online"`** (lo de siempre): el refetch se PAUSA sin red y
 *   la query sigue en `success` mostrando lo guardado. Es el contrato que ya
 *   asumen el persister (`query-persister.ts`, solo persiste éxitos) y la capa
 *   optimista de la outbox (invalidar sin red no debe convertir la planilla en
 *   un error).
 *
 * Una query que declara su propio `networkMode` (p. ej. `"always"` en la
 * sesión o el menú del guard) lo conserva: el modo automático solo aplica a
 * las que no lo fijan.
 *
 * Por qué no `"offlineFirst"` como default global (evaluado, descartado):
 * 1. Sus reintentos SÍ se pausan sin red: una query sin datos cuyo primer
 *    intento falla quedaba igual `paused` para siempre.
 * 2. Corre el `queryFn` aunque haya datos: un refetch sin red (al montar, al
 *    invalidar tras encolar en la outbox, por `refetchInterval`) dejaba la
 *    query en `error` CON datos, y las pantallas que miran `isError` antes que
 *    `data` escondían lo guardado.
 */
import {
  QueryClient,
  type DefaultError,
  type DefaultedQueryObserverOptions,
  type NetworkMode,
  type Query,
  type QueryClientConfig,
  type QueryKey,
  type QueryObserverOptions,
} from "@tanstack/react-query"

/** Marca de las opciones cuyo `networkMode` decide este módulo (y no la query). */
export const AUTO_NETWORK_MODE = "offlineAutoNetworkMode"

interface NetworkModeOptions {
  networkMode?: NetworkMode
  [AUTO_NETWORK_MODE]?: boolean
}

/** Modo según haya datos que conservar. Función pura. */
export function autoNetworkMode(hasData: boolean): NetworkMode {
  return hasData ? "online" : "always"
}

/**
 * Aplica el modo automático a unas opciones ya resueltas. Un `networkMode`
 * explícito (sin la marca) no se toca. Devuelve el MISMO objeto si no cambia
 * nada (TanStack compara opciones por referencia superficial).
 */
export function applyAutoNetworkMode<T extends NetworkModeOptions>(options: T, hasData: boolean): T {
  if (options.networkMode !== undefined && options[AUTO_NETWORK_MODE] !== true) return options
  const networkMode = autoNetworkMode(hasData)
  if (options.networkMode === networkMode) return options
  return { ...options, networkMode, [AUTO_NETWORK_MODE]: true }
}

/**
 * Las queries sin observador (restauradas del persister, sembradas con
 * `setQueryData`, precargadas) no pasan por `defaultQueryOptions` al
 * refetchearse: su propio `options.networkMode` sigue a sus datos.
 */
export function syncQueryNetworkMode(query: Query): void {
  const options = query.options as typeof query.options & NetworkModeOptions
  const next = applyAutoNetworkMode(options, query.state.data !== undefined)
  if (next !== options) query.setOptions(next)
}

export class OfflineAwareQueryClient extends QueryClient {
  constructor(config?: QueryClientConfig) {
    super(config)
    this.getQueryCache().subscribe((event) => {
      if (event.type === "added" || event.type === "updated") syncQueryNetworkMode(event.query)
    })
  }

  override defaultQueryOptions<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = never,
  >(
    options:
      | QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey, TPageParam>
      | DefaultedQueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
  ): DefaultedQueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey> {
    const defaulted = super.defaultQueryOptions(options)
    const query = defaulted.queryHash ? this.getQueryCache().get(defaulted.queryHash) : undefined
    return applyAutoNetworkMode(defaulted, query?.state.data !== undefined)
  }
}
