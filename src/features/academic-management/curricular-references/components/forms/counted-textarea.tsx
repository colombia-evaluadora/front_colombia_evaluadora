import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// Conteo dentro del borde del textarea, en una franja propia: el texto que
// hace scroll no queda debajo del número. El contenedor toma el contorno.
export function CountedTextarea({
  value,
  maxLength,
  className,
  ...props
}: React.ComponentProps<typeof Textarea> & { value: string; maxLength: number }) {
  return (
    <div className="rounded-md border border-input transition-[color,border-color] hover:border-ring focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 has-[[aria-invalid=true]]:border-red has-[[aria-invalid=true]]:focus-within:ring-red/20">
      <Textarea
        value={value}
        maxLength={maxLength}
        // Crece con el texto: con 400 caracteres no hace falta scroll.
        className={cn("field-sizing-content min-h-20", className, "rounded-none border-0 pb-0 hover:border-0 focus-visible:ring-0")}
        {...props}
      />
      <div aria-hidden className="px-3 pb-1.5 text-right text-xs text-muted-foreground tabular-nums">
        {value.length} / {maxLength}
      </div>
    </div>
  )
}
