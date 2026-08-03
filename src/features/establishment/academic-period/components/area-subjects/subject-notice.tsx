import { XIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"

export interface SubjectNotice {
  id: number
  message: string
}

interface SubjectNoticeBannerProps {
  notice: SubjectNotice | null
  onClose: () => void
  className?: string
}

export function SubjectNoticeBanner({
  notice,
  onClose,
  className,
}: SubjectNoticeBannerProps) {
  if (!notice) return null

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-blue-stroke bg-blue-22 px-4 py-3 text-sm font-medium text-blue",
        className,
      )}
    >
      <span>{notice.message}</span>
      <button
        type="button"
        aria-label="Cerrar notificación"
        onClick={onClose}
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-blue transition-colors hover:bg-blue/10"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  )
}
