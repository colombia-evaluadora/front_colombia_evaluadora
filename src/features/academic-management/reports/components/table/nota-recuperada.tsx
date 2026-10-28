import type * as React from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface NotaRecuperadaProps {
  /** La nota que computa después de recuperar (la resaltada). */
  vigente: React.ReactNode
  /** La nota antes de recuperar (atenuada). */
  original: React.ReactNode
  /** Rótulo corto de cada nota ("R" / "C"); sin él no se pinta. */
  etiquetaVigente?: string
  etiquetaOriginal?: string
  /** Lo que va pegado a la original (p. ej. la propuesta tras recalificar). */
  extraOriginal?: React.ReactNode
  tooltip: React.ReactNode
  /**
   * `apilada`: vigente arriba y original debajo (Habilitación en Informes,
   * Regla 68). `en-linea`: "original / vigente", la evolución de un Refuerzo
   * en la fila de su actividad original (Reglas 70/71).
   */
  layout?: "apilada" | "en-linea"
  className?: string
}

function Rotulo({ texto }: { texto?: string }) {
  return texto ? <span className="text-[10px] text-muted-foreground">{texto}</span> : null
}

/**
 * Par de notas de una recuperación: la original y la que la reemplaza. Lo
 * comparten la celda de Habilitación del informe y la de Refuerzo de las
 * planillas, para que las dos se lean igual: la vigente resaltada, la
 * original atenuada y la explicación en el tooltip.
 */
export function NotaRecuperada({
  vigente,
  original,
  etiquetaVigente,
  etiquetaOriginal,
  extraOriginal,
  tooltip,
  layout = "apilada",
  className,
}: NotaRecuperadaProps) {
  const vigenteNodo = (
    <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1 font-medium">
      <Rotulo texto={etiquetaVigente} />
      {vigente}
    </span>
  )
  const originalNodo = (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Rotulo texto={etiquetaOriginal} />
      {original}
      {extraOriginal}
    </span>
  )

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "inline-flex items-center leading-tight outline-none",
          layout === "apilada" ? "flex-col gap-0.5" : "gap-1",
          className,
        )}
      >
        {layout === "apilada" ? (
          <>
            {vigenteNodo}
            {originalNodo}
          </>
        ) : (
          <>
            {originalNodo}
            <span className="text-muted-foreground" aria-hidden>
              /
            </span>
            {vigenteNodo}
          </>
        )}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

interface NotaRefuerzoProps {
  original: number
  refuerzo: number
  /** La que computa (DEFINITIVA de la actividad). Con aplicación COMPUTAR no
   *  coincide con la del refuerzo: se dice en el tooltip. */
  computa: number | null
  formato: (nota: number) => string
  className?: string
}

/**
 * Reglas 70/71: la fila de la actividad ORIGINAL con un Refuerzo aprobado
 * muestra la evolución "original / refuerzo" (p. ej. "3,0 / 4,5"), con el
 * mismo par de notas que la Habilitación del informe.
 */
export function NotaRefuerzo({ original, refuerzo, computa, formato, className }: NotaRefuerzoProps) {
  const combinada = computa != null && formato(computa) !== formato(refuerzo)
  return (
    <NotaRecuperada
      layout="en-linea"
      className={className}
      original={formato(original)}
      vigente={formato(refuerzo)}
      tooltip={
        <span data-testid="tooltip-refuerzo">
          Nota original {formato(original)} y la del Refuerzo más reciente {formato(refuerzo)}.
          {combinada
            ? ` La nota que computa en la unidad es ${formato(computa)} (la recuperación se combina con la original).`
            : " El promedio de la unidad usa la del Refuerzo."}
        </span>
      }
    />
  )
}
