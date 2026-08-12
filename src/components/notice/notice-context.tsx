import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { toast } from "sonner"

import { NoticeBanner, type Notice, type NoticeVariant } from "@/components/notice/notice-banner"

interface NotifyOptions {
  variant?: NoticeVariant
  autoCloseMs?: number
}

interface NoticeDispatch {
  notify: (message: string, options?: NotifyOptions) => void
  dismiss: () => void
}

const DEFAULT_AUTO_CLOSE: Record<NoticeVariant, number> = {
  info: 4000,
  success: 4000,
  error: 6000,
}

const FALLBACK: NoticeDispatch = {
  notify: (message, options) => {
    if (options?.variant === "error") toast.error(message)
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

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<ActiveNotice | null>(null)
  const idRef = useRef(0)

  const notify = useCallback((message: string, options?: NotifyOptions) => {
    const variant = options?.variant ?? "success"
    idRef.current += 1
    setNotice({
      id: idRef.current,
      message,
      variant,
      autoCloseMs: options?.autoCloseMs ?? DEFAULT_AUTO_CLOSE[variant],
    })
  }, [])

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
      autoCloseMs={notice?.autoCloseMs}
      className={className}
    />
  )
}
