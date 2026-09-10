import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { InfoIcon, PencilIcon, SpinnerIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import type { ReferenteEnunciado } from "@/features/planeador/api/query/use-referente-curricular-query"

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">—</p>
  }
  return (
    <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

interface UnidadFichaProps {
  nombre: string
  descripcion: string
  objetivos: string[]
  contenidos: string[]
  /** Si se pasa, muestra el lápiz de "editar" arriba a la derecha. */
  onEditar?: () => void
  className?: string
}

/**
 * Ficha de la unidad temática elegida en una actividad — 3 columnas
 * (Descripción / Objetivos / Contenidos) con el título "Unidad temática
 * seleccionada: <nombre>" y un lápiz opcional para ir a editar la unidad.
 *
 * Presentacional pura (sin fetch propio): tanto `UnidadSection`
 * (`form-editar-actividad.tsx`, al elegir la unidad en el form) como
 * `DetailSections` (panel de detalle de solo lectura) la usan con los
 * datos ya resueltos — la unidad no lleva su descripción/objetivos/
 * contenidos "congelados" en la actividad (esos campos quedan siempre
 * vacíos contra el backend real, ver `toActividadDetalle`), así que cada
 * lugar los trae de la unidad misma (`useUnidadDetalleQuery`).
 */
export function UnidadFicha({
  nombre,
  descripcion,
  objetivos,
  contenidos,
  onEditar,
  className,
}: UnidadFichaProps) {
  return (
    <fieldset className={cn("rounded-md border bg-card px-4 pb-4", className)}>
      <legend className="flex w-full items-center justify-between gap-2 px-1.5 text-sm font-semibold">
        <span>Unidad temática seleccionada: {nombre}</span>
        {onEditar && (
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-xs"
            aria-label={`Editar ${nombre}`}
            onClick={onEditar}
          >
            <PencilIcon />
          </Button>
        )}
      </legend>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="mb-2 text-sm font-semibold">Descripción</p>
          {descripcion ? (
            <p className="text-muted-foreground text-sm">{descripcion}</p>
          ) : (
            <p className="text-muted-foreground text-sm">—</p>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Objetivos de la unidad</p>
          <BulletList items={objetivos} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Contenidos</p>
          <BulletList items={contenidos} />
        </div>
      </div>
    </fieldset>
  )
}

interface EnunciadosEvidenciasChecklistProps {
  nivel1Etiqueta: string
  nivel2Etiqueta: string
  enunciados: ReferenteEnunciado[]
  /** Ids de evidencias tildadas para esta actividad. */
  seleccionadas: number[]
  onToggle: (evidenciaId: number) => void
  /** Evidencias ya relacionadas ANTES de este render (al editar una
   *  actividad existente): quedan tildadas pero no se pueden destildar —
   *  no hay endpoint confirmado para desvincular una evidencia ya marcada,
   *  solo para agregar (`POST /actividades/:id/evidencias`). */
  disabledIds?: number[]
  /** Id de la evidencia que se está guardando ahora mismo (panel de
   *  detalle, guardado inmediato) — le muestra un spinner en vez del
   *  checkbox mientras la mutación está en vuelo. */
  pendingId?: number | null
  className?: string
}

/**
 * Sección "Enunciado y evidencias de la unidad temática": un grupo por cada
 * enunciado del referente curricular de GRADO + ASIGNATURA de la actividad
 * (`GET /planeador/referente-curricular`, `useReferenteCurricularQuery` —
 * confirmado real, trae ya el árbol completo acotado a ese referente), con
 * un checkbox por cada una de sus evidencias (nivel 2, hijas de ese
 * enunciado). Al cambiar de grado/asignatura cambia el referente y con él
 * este árbol entero — no depende de qué unidad esté elegida.
 *
 * Los rótulos ("Enunciado"/"Evidencia" vs "Propósito"/"Imprescindible")
 * son SIEMPRE los que trae `nivel1Etiqueta`/`nivel2Etiqueta` — nunca un
 * literal fijo, varían por nivel educativo.
 */
export function EnunciadosEvidenciasChecklist({
  nivel1Etiqueta,
  nivel2Etiqueta,
  enunciados,
  seleccionadas,
  onToggle,
  disabledIds = [],
  pendingId = null,
  className,
}: EnunciadosEvidenciasChecklistProps) {
  if (enunciados.length === 0) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <h4 className="text-sm font-semibold">Enunciado y evidencias de la unidad temática</h4>
        <p className="text-muted-foreground text-sm">
          Esta asignatura todavía no tiene {pluralizar(nivel1Etiqueta)} definidos.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <h4 className="text-sm font-semibold">Enunciado y evidencias de la unidad temática</h4>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {enunciados.map((enunciado) => (
          <div key={enunciado.id} className="flex flex-col gap-2">
            <p className="text-sm font-semibold">{enunciado.text}</p>
            <ul className="flex flex-col gap-2">
              {enunciado.evidencias.map((evidencia) => {
                const checked = seleccionadas.includes(evidencia.id)
                const disabled = disabledIds.includes(evidencia.id)
                const pending = pendingId === evidencia.id
                return (
                  <li key={evidencia.id} className="flex items-start gap-2">
                    {pending ? (
                      <SpinnerIcon className="mt-0.5 size-4.5 shrink-0 animate-spin" />
                    ) : (
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={() => onToggle(evidencia.id)}
                        aria-label={evidencia.text}
                      />
                    )}
                    <span className="text-sm">{evidencia.text}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-blue-stroke bg-blue-22 text-blue flex items-start gap-2 rounded-md border p-3 text-sm">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        Seleccione los {pluralizar(nivel2Etiqueta)} que trabajarán en esta actividad.
      </div>
    </div>
  )
}

/** Pluralización simple: alcanza para los cuatro rótulos reales que
 *  documenta la colección Postman ("Enunciado"/"Evidencia"/"Propósito"/
 *  "Imprescindible") — todos terminan en consonante o vocal simple, "+s"
 *  funciona para los cuatro. Se separa en su propia función (en vez de un
 *  `+"s"` inline) para que quede claro que es una aproximación, no una
 *  regla general de plural en español. */
function pluralizar(etiqueta: string): string {
  return `${etiqueta.toLowerCase()}s`
}
