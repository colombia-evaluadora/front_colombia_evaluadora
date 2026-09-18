import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { InfoIcon, PencilIcon, SpinnerIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { UNIDAD_TAB_FALLBACK } from "@/features/planeador/components/planeador-tabs"
import type { ReferenteEnunciado } from "@/features/planeador/api/query/use-referente-curricular-query"
import type { CriterioUnidad } from "@/features/planeador/api/types/unidad-tematica"

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
  /** Rótulo real del instrumento ("Proyecto pedagógico" en Preescolar,
   *  "Unidad temática" en el resto) — mismo dato que ya resuelve el resto
   *  del form/detalle (`resolveInstrumentoLabel`/`instrumentoLabelFromReferente`).
   *  Default `UNIDAD_TAB_FALLBACK`: antes el título decía "Unidad temática
   *  seleccionada" siempre, aunque la unidad fuera un Proyecto pedagógico. */
  instrumentoLabel?: string
  /** Si se pasa, muestra el lápiz de "editar" arriba a la derecha. */
  onEditar?: () => void
  className?: string
}

/**
 * Ficha de la unidad temática elegida en una actividad — 3 columnas
 * (Descripción / Objetivos / Contenidos) con el título "<instrumento>
 * seleccionado: <nombre>" y un lápiz opcional para ir a editar la unidad.
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
  instrumentoLabel = UNIDAD_TAB_FALLBACK,
  onEditar,
  className,
}: UnidadFichaProps) {
  return (
    <fieldset className={cn("rounded-md border bg-card px-4 pb-4", className)}>
      <legend className="flex w-full items-center justify-between gap-2 px-1.5 text-sm font-semibold">
        <span>
          {instrumentoLabel}: {nombre}
        </span>
        {onEditar && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-xs"
                  aria-label={`Editar ${nombre}`}
                  onClick={onEditar}
                />
              }
            >
              <PencilIcon />
            </TooltipTrigger>
            <TooltipContent>{`Editar ${nombre}`}</TooltipContent>
          </Tooltip>
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
  /** Rótulo real del instrumento ("Unidad temática", "Proyecto pedagógico",
   *  …) — ver `resolveInstrumentoLabel` en `use-unidades-tabs-query.ts`.
   *  Nunca un literal fijo: varía por nivel educativo. */
  instrumentoLabel: string
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
 * Sección "Enunciado y evidencias del <instrumento>": un grupo por cada
 * enunciado que la UNIDAD ya relacionó (`unidad.enunciadosDba`, elegidos en
 * `UnidadInfoGeneralFields`/`CrearUnidadPopover`) — no todo el catálogo del
 * referente curricular de GRADO + ASIGNATURA (`GET /planeador/referente-
 * curricular`, `useReferenteCurricularQuery`), que trae TODOS los
 * enunciados posibles de ese nivel educativo, los haya adoptado la unidad o
 * no. El caller (`UnidadFichaYEvidencias`/`UnidadFichaYEvidenciasDetalle`)
 * ya filtra `enunciados` antes de pasarlos acá. Cada enunciado muestra un
 * checkbox por cada una de sus evidencias (nivel 2, hijas de ese enunciado).
 *
 * Los rótulos ("Enunciado"/"Evidencia" vs "Propósito"/"Imprescindible", y el
 * nombre del instrumento en el título) son SIEMPRE los que trae
 * `nivel1Etiqueta`/`nivel2Etiqueta`/`instrumentoLabel` — nunca un literal
 * fijo, varían por nivel educativo.
 */
export function EnunciadosEvidenciasChecklist({
  instrumentoLabel,
  nivel1Etiqueta,
  nivel2Etiqueta,
  enunciados,
  seleccionadas,
  onToggle,
  disabledIds = [],
  pendingId = null,
  className,
}: EnunciadosEvidenciasChecklistProps) {
  // "Propósitos e imprescindibles del…" en Preescolar, "Enunciados y
  // evidencias del…" en el resto — nunca el literal "Enunciado y
  // evidencias" fijo (lo que decía antes): el título tiene que salir de
  // `nivel1Etiqueta`/`nivel2Etiqueta`, los mismos rótulos reales que ya
  // resuelve `EnunciadosEvidenciasChecklist` para el resto de sus textos.
  const titulo = capitalizar(`${pluralizar(nivel1Etiqueta)} y ${pluralizar(nivel2Etiqueta)} del ${instrumentoLabel.toLowerCase()}`)

  if (enunciados.length === 0) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <h4 className="text-sm font-semibold">{titulo}</h4>
        <p className="text-muted-foreground text-sm">
          Esta unidad todavía no tiene {pluralizar(nivel1Etiqueta)} relacionados.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <h4 className="text-sm font-semibold">{titulo}</h4>

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

interface CriteriosUnidadChecklistProps {
  criterios: CriterioUnidad[]
  /** Ids de criterios de la unidad tildados para esta actividad. */
  seleccionados: number[]
  onToggle: (criterioId: number) => void
  /** Igual que `disabledIds` en `EnunciadosEvidenciasChecklist`: no hay
   *  endpoint confirmado para desvincular un criterio ya relacionado
   *  (`PATCH /actividades/criterios/:id` pide el pk de la RELACIÓN, que acá
   *  no se conoce), así que un criterio ya marcado queda tildado sin poder
   *  destildarse. */
  disabledIds?: number[]
  className?: string
}

/**
 * Checklist "Criterios de la unidad": relaciona criterios de la RÚBRICA DE
 * LA UNIDAD (`UnidadTematica.criterios`, `TCRITERIO_UNIDAD`) con esta
 * actividad puntual — distinto de la rúbrica PROPIA de la actividad
 * (`RubricasSection`/`InstrumentoEvaluacionSection`, que define la
 * evaluación con `PUT .../instrumento`). Solo tiene sentido con una unidad
 * elegida que ya tenga criterios cargados en su pestaña "Rúbricas".
 */
export function CriteriosUnidadChecklist({
  criterios,
  seleccionados,
  onToggle,
  disabledIds = [],
  className,
}: CriteriosUnidadChecklistProps) {
  if (criterios.length === 0) return null

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <h4 className="text-sm font-semibold">Criterios de la unidad</h4>
      <ul className="flex flex-col gap-2">
        {criterios.map((criterio) => {
          const checked = seleccionados.includes(criterio.id)
          const disabled = disabledIds.includes(criterio.id)
          return (
            <li key={criterio.id} className="flex items-start gap-2">
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={() => onToggle(criterio.id)}
                aria-label={criterio.nombre}
              />
              <span className="text-sm">{criterio.nombre}</span>
            </li>
          )
        })}
      </ul>
      <div className="border-blue-stroke bg-blue-22 text-blue flex items-start gap-2 rounded-md border p-3 text-sm">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        Seleccione los criterios de la rúbrica de la unidad que aplican a esta actividad.
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

/** Mayúscula inicial para un título armado a partir de rótulos ya en
 *  minúscula (`pluralizar`) — sin esto el `<h4>` arrancaba en minúscula. */
function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
