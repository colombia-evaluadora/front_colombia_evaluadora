import { useEffect, useRef } from "react"
import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  XIcon,
} from "@/components/ui/icons"

import { cn } from "@/lib/utils"

export interface Notice {
  /**
   * Identificador incremental de la notificación. Cambia con cada acción para
   * que, aunque el mensaje se repita, se muestre siempre la última (y se
   * reinicie el auto-cierre).
   */
  id: number
  message: string
}

export type NoticeVariant = "info" | "success" | "error"

const VARIANT_CLASSES: Record<NoticeVariant, string> = {
  info: "border-blue-stroke bg-blue-22 text-foreground",
  success: "border-green-stroke bg-green-22 text-foreground",
  error: "border-red-stroke bg-red-22 text-foreground",
}

const VARIANT_ICON: Record<NoticeVariant, typeof InfoIcon> = {
  info: InfoIcon,
  success: CheckCircleIcon,
  error: WarningCircleIcon,
}

interface NoticeBannerProps {
  notice: Notice | null
  onClose: () => void
  variant?: NoticeVariant
  /**
   * Si se indica, la notificación se cierra sola después de estos ms. El
   * temporizador se reinicia cada vez que cambia `notice.id`.
   */
  autoCloseMs?: number
  className?: string
}

/**
 * Banner de notificación inline. Muestra una única notificación: cada nueva
 * acción reemplaza a la anterior sin apilarse. Con `autoCloseMs` se descarta
 * automáticamente.
 */
export function NoticeBanner({
  notice,
  onClose,
  variant = "info",
  autoCloseMs,
  className,
}: NoticeBannerProps) {
  const noticeId = notice?.id

  // Ref para no reiniciar el temporizador en cada render por un `onClose` nuevo.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (noticeId == null || !autoCloseMs) return
    const timeout = setTimeout(() => onCloseRef.current(), autoCloseMs)
    return () => clearTimeout(timeout)
  }, [noticeId, autoCloseMs])

  if (!notice) return null

  const Icon = VARIANT_ICON[variant]

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 rounded-md border px-4 py-1 text-sm font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span className="flex-1">{notice.message}</span>
      <button
        type="button"
        aria-label="Cerrar notificación"
        onClick={onClose}
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-current transition-colors hover:bg-current/10"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  )
}
