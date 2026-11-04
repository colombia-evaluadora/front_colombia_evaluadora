import { useRef, type ReactNode } from "react"

import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  onFile: (file: File) => void
  disabled?: boolean
  variant?: "outline" | "ghost"
}

/** Botón que abre el selector de un único archivo (PDF, JPG o PNG); la validación la hace quien lo usa. */
export function BotonArchivo({ children, onFile, disabled, variant = "outline" }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={ref}
        type="file"
        hidden
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (f) onFile(f)
        }}
      />
      <Button type="button" size="sm" variant={variant} disabled={disabled} onClick={() => ref.current?.click()}>
        {children}
      </Button>
    </>
  )
}
