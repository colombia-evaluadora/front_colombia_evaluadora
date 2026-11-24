import { useState } from "react"

import { Button } from "@/components/ui/button"
import { EyeIcon, EyeSlashIcon } from "@/components/ui/icons"
import { InputOTP, InputOTPGroup } from "@/components/ui/input-otp"
import { PIN_LENGTH } from "@/lib/offline/vault"
import { cn } from "@/lib/utils"

/** Seis casillas grandes con teclado numérico; al completarlas llama `onComplete` (sin buscar un botón). */
export function PinInput({
  id,
  label,
  value,
  invalid,
  disabled,
  onChange,
  onComplete,
}: {
  id: string
  label: string
  value: string
  invalid?: boolean
  disabled?: boolean
  onChange: (value: string) => void
  onComplete: (value: string) => void
}) {
  const [ver, setVer] = useState(false)
  return (
    <div className="flex items-center justify-center gap-2">
      <InputOTP
        id={id}
        aria-label={label}
        aria-invalid={invalid || undefined}
        maxLength={PIN_LENGTH}
        pattern="^[0-9]+$"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        disabled={disabled}
        value={value}
        onChange={onChange}
        onComplete={onComplete}
      >
        <InputOTPGroup>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              aria-hidden
              className={cn(
                "grid size-10 place-items-center rounded-md border text-xl font-semibold",
                i === value.length && "border-primary ring-2 ring-primary/30",
                invalid && "border-red-stroke",
              )}
            >
              {value[i] ? (ver ? value[i] : "•") : ""}
            </div>
          ))}
        </InputOTPGroup>
      </InputOTP>
      <Button
        type="button"
        variant="ghost"
        color="neutral"
        size="icon"
        aria-label={ver ? "Ocultar PIN" : "Mostrar PIN"}
        aria-pressed={ver}
        onClick={() => setVer((v) => !v)}
      >
        {ver ? <EyeSlashIcon /> : <EyeIcon />}
      </Button>
    </div>
  )
}
