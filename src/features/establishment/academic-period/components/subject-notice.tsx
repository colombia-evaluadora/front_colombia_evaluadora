import { XIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"

export interface SubjectNotice {
  id: number
  message: string
  variant?: "info" | "error"
}

interface SubjectNoticeBannerProps {
  notice: SubjectNotice | null
  onClose: () => void
  className?: string
}

const VARIANT_CLASSES = {
  info: "border-blue-stroke bg-blue-22 text-blue",
  error: "border-transparent bg-red-22 text-foreground",
}

export function SubjectNoticeBanner({ notice, onClose, className }: SubjectNoticeBannerProps) {
  if (!notice) return null
  const variant = notice.variant ?? "info"

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      <span>{notice.message}</span>
      <button
        type="button"
        aria-label="Cerrar notificación"
        onClick={onClose}
        className="flex size-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-current/10"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  )
}
