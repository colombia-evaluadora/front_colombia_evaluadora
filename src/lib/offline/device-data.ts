/**
 * "Borrar los datos de este equipo" (`add-offline-meses-pwa`, D-12): la única
 * forma de borrar lo guardado en la app instalada, donde cerrar sesión solo
 * bloquea. Borra TODO lo del usuario en este equipo: datos guardados (queries
 * y sesión), cambios sin sincronizar (outbox, adjuntos y registro), PIN,
 * credencial local, archivos guardados y el estado de "Preparar". Lo de otros
 * usuarios del equipo no se toca (cada uno decide sobre lo suyo).
 *
 * Quien lo llama confirma antes (doble confirmación si hay cambios sin
 * sincronizar): acá no se pregunta nada.
 */
import { deleteMeta, isIndexedDbAvailable } from "@/lib/offline/db"
import { deleteLocalCredential } from "@/lib/offline/local-credential"
import { clearOutbox } from "@/lib/offline/outbox/store"
import { clearUserData } from "@/lib/offline/query-persister"
import { destroyVault } from "@/lib/offline/vault"

/** Claves de `meta` por usuario que no son de la outbox ni de las queries. */
export const userMetaKeys = (sub: string) => [`lastPrepare:${sub}`, `autoPrepare:${sub}`]

export async function wipeDeviceData(sub: string): Promise<void> {
  await clearOutbox(sub)
  await clearUserData(sub)
  await destroyVault(sub)
  await deleteLocalCredential(sub)
  if (isIndexedDbAvailable()) {
    for (const key of userMetaKeys(sub)) await deleteMeta(key).catch(() => undefined)
  }
  try {
    localStorage.removeItem("ce-offline-last-prepare")
    localStorage.removeItem("ce-offline-prepare-checkpoint")
  } catch {
    // Sin localStorage: no había nada que borrar ahí.
  }
}
