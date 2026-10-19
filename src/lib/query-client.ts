import { OfflineAwareQueryClient } from "@/lib/offline/offline-query-client"
import { queryConfig } from "@/lib/react-query"

// `networkMode` híbrido por query (sin datos → falla rápido sin red; con
// datos → pausa y conserva lo guardado): `lib/offline/offline-query-client.ts`.
export const queryClient = new OfflineAwareQueryClient({ defaultOptions: queryConfig })
