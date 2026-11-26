import { cn } from "@/lib/utils"

const LOW_REMAINING_THRESHOLD = 50

interface CharacterCounterProps extends React.ComponentProps<"span"> {
  value: string
  max: number
}

export function CharacterCounter({ value, max, className, ...props }: CharacterCounterProps) {
  const remaining = max - value.length
  // El aviso en rojo es para cuando se acaba el espacio: en campos cortos (Código, 10) 50 los pintaba siempre.
  const umbral = Math.min(LOW_REMAINING_THRESHOLD, Math.ceil(max * 0.1))

  return (
    <span
      data-slot="character-counter"
      className={cn(
        "block text-right text-xs text-muted-foreground",
        remaining <= umbral && "text-red",
        className,
      )}
      {...props}
    >
      {value.length}/{max}
    </span>
  )
}
