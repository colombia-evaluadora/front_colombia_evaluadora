import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { useUser } from "@/lib/auth"
import { useConnectivity } from "@/lib/offline/use-connectivity"
import { getDeviceMode } from "@/lib/offline/query-persister"
import { isInstalledPersonalDevice } from "@/lib/offline/device-policy"
import { requestPersistentStorage } from "@/lib/offline/storage-status"
import {
  AUTO_PREPARE_CHECK_MS,
  AUTO_PREPARE_FIRST_DELAY_MS,
  maybeAutoPrepare,
  type AutoPrepareReason,
} from "@/features/offline/lib/auto-prepare"
import { loadPrepareStatus } from "@/features/offline/lib/prepare-engine"

/**
 * Programa la autopreparación (D-14) mientras hay una sesión CON red en un
 * equipo personal: al entrar (tras dejar cargar la pantalla), cada pocas horas
 * y, en la app instalada, apenas vuelve la red. No pinta nada: el progreso lo
 * muestran `OfflineDataStatus` y `FirstPrepareBanner`.
 */
export function AutoPrepareRunner() {
  const queryClient = useQueryClient()
  const { data: user } = useUser()
  const status = useConnectivity().status
  const online = status === "online"
  const wasOffline = useRef(status === "offline")
  const userId = user?.id ?? null
  const conRed = user != null && !user.offline
  const roles = user?.roles ?? []
  const rolesKey = roles.join(",")

  // "Datos guardados: hace X" del usuario activo.
  useEffect(() => {
    if (userId) void loadPrepareStatus(userId)
  }, [userId])

  // App instalada: pedir almacenamiento persistente sin que el docente tenga
  // que abrir "Preparar" (las instaladas casi siempre lo obtienen).
  useEffect(() => {
    if (conRed && isInstalledPersonalDevice() && getDeviceMode() === "personal") void requestPersistentStorage()
  }, [conRed, userId])

  useEffect(() => {
    if (!conRed || !online) {
      if (status === "offline") wasOffline.current = true
      return
    }
    const reason: AutoPrepareReason = wasOffline.current && isInstalledPersonalDevice() ? "reconexion" : "inicio"
    wasOffline.current = false
    const rolesActuales = rolesKey ? rolesKey.split(",") : []
    const tick = (r: AutoPrepareReason) => void maybeAutoPrepare(queryClient, { roles: rolesActuales, reason: r })
    const first = setTimeout(() => tick(reason), AUTO_PREPARE_FIRST_DELAY_MS)
    const every = setInterval(() => tick("periodico"), AUTO_PREPARE_CHECK_MS)
    return () => {
      clearTimeout(first)
      clearInterval(every)
    }
  }, [conRed, online, status, queryClient, rolesKey, userId])

  return null
}
