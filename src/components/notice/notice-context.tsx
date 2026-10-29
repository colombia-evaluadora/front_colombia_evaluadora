"use no memo"

// El React Compiler asume que las variables que lee un efecto son puras
// respecto al render (props/estado/refs) y no una variable mutable de
// MÓDULO como `pendingNotice`, escrita imperativamente por `queueNotice()`
// desde OTRO componente. Al compilar `NoticeProvider`, el compilador
// eliminó la copia local `const queued = pendingNotice` (la vio como
// redundante) y sustituyó sus usos directamente por `pendingNotice` —
// pero para entonces la línea siguiente ya la había puesto en `null`, así
// que el `if (queued)` quedaba compilado como `if (pendingNotice)`
// evaluado DESPUÉS de vaciarla: siempre `false`. Resultado en producción:
// `queueNotice()` nunca disparaba el aviso en la pantalla de destino —ni
// el de "Actividad creada/actualizada correctamente" del Planeador, ni el
// de "Unidad creada/actualizada"— aunque en el código fuente el orden de
// las líneas es correcto. Esta directiva deja el archivo fuera de la
// optimización para que el swap "leer y vaciar" corra tal como está
// escrito.
//
// Hoy ese swap vive dentro de `pendingNoticeStore.take()` (una llamada a
// función, que el compilador no puede reordenar), pero la directiva se
// mantiene: el efecto de `NoticeProvider` sigue tocando estado de módulo
// (`activeNoticeProviders`) y no vale la pena el riesgo de reintroducir el
// bug por un archivo tan chico.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { toast } from "sonner"

import { NoticeBanner, type Notice, type NoticeVariant } from "@/components/notice/notice-banner"
import { pendingNoticeStore, type NotifyOptions } from "@/components/notice/pending-notice"
import { setSuppressGlobalErrorToast } from "@/lib/api-client"
import { resolveSuccessMessage } from "@/lib/server-message"

interface NoticeDispatch {
  notify: (message: string, options?: NotifyOptions) => void
  dismiss: () => void
}

const DEFAULT_AUTO_CLOSE: Record<NoticeVariant, number> = {
  info: 7000,
  success: 7000,
  warning: 12000,
  error: 12000,
}

const FALLBACK: NoticeDispatch = {
  notify: (localMessage, options) => {
    const message = resolveSuccessMessage(localMessage, options?.variant)
    if (options?.variant === "error") toast.error(message, options.action ? { action: options.action } : undefined)
    else if (options?.variant === "warning") toast.warning(message)
    else toast.success(message)
  },
  dismiss: () => {},
}

interface ActiveNotice extends Notice {
  variant: NoticeVariant
  autoCloseMs: number
}

const NoticeDispatchContext = createContext<NoticeDispatch>(FALLBACK)
const NoticeStateContext = createContext<ActiveNotice | null>(null)

export function useNotify(): NoticeDispatch {
  return useContext(NoticeDispatchContext)
}

let activeNoticeProviders = 0

/**
 * Encola un aviso para que lo muestre el `NoticeProvider` de la pantalla de
 * DESTINO al montarse (patrón "guardar y navegar"; ver `pending-notice.ts`).
 */
export function queueNotice(message: string, options?: NotifyOptions) {
  pendingNoticeStore.set({ message: resolveSuccessMessage(message, options?.variant), options })
}

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<ActiveNotice | null>(null)
  const idRef = useRef(0)

  const notify = useCallback((message: string, options?: NotifyOptions) => {
    const variant = options?.variant ?? "success"
    idRef.current += 1
    setNotice({
      id: idRef.current,
      // El texto del servidor (header X-Mensaje, sso V590) gana sobre el local.
      message: resolveSuccessMessage(message, variant),
      variant,
      autoCloseMs: options?.autoCloseMs ?? DEFAULT_AUTO_CLOSE[variant],
      action: options?.action,
    })
  }, [])

  useEffect(() => {
    activeNoticeProviders += 1
    setSuppressGlobalErrorToast(true)
    // El aviso encolado lo comparte cualquier `NoticeProvider` montado al
    // mismo tiempo (StrictMode re-invoca este efecto, y dos pantallas pueden
    // solaparse un instante durante la navegación): `take()` lo lee y lo
    // vacía en una sola operación, así que se muestra una sola vez.
    const queued = pendingNoticeStore.take()
    if (queued) {
      notify(queued.message, queued.options)
    }
    return () => {
      activeNoticeProviders -= 1
      if (activeNoticeProviders === 0) setSuppressGlobalErrorToast(false)
    }
  }, [notify])

  // El vencimiento vive acá y no en el banner: un `NoticeOutlet` que se
  // desmonta y vuelve a montar (un diálogo que se cierra y se reabre, un
  // formulario del que se sale a la tabla del mismo layout) reiniciaba el
  // temporizador y el aviso viejo reaparecía completo. Así vence a su hora
  // aunque nadie lo esté mostrando. `autoCloseMs: 0` = no vence.
  useEffect(() => {
    if (!notice?.autoCloseMs) return
    const { id, autoCloseMs } = notice
    const timeout = setTimeout(() => setNotice((current) => (current?.id === id ? null : current)), autoCloseMs)
    return () => clearTimeout(timeout)
  }, [notice])

  const dismiss = useCallback(() => setNotice(null), [])

  const dispatch = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <NoticeDispatchContext.Provider value={dispatch}>
      <NoticeStateContext.Provider value={notice}>
        {children}
      </NoticeStateContext.Provider>
    </NoticeDispatchContext.Provider>
  )
}

export function NoticeOutlet({ className }: { className?: string }) {
  const notice = useContext(NoticeStateContext)
  const { dismiss } = useContext(NoticeDispatchContext)

  return (
    <NoticeBanner
      key={notice?.id}
      notice={notice}
      onClose={dismiss}
      variant={notice?.variant}
      className={className}
    />
  )
}
