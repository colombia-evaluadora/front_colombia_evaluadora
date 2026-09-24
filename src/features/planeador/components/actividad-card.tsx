import * as React from "react"

import { Button } from "@/components/ui/button"
import { useNotify } from "@/components/notice/notice-context"
import {
  CheckIcon,
  ClipboardCheckIcon,
  FileDownloadOutlinedIcon,
  PencilIcon,
  SpinnerIcon,
} from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { statusAccentFor, statusIconFor, statusRingFor } from "@/features/planeador/api/ui-mappings"
import { esActividadFormativa } from "@/features/planeador/lib/actividad-formativa"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import { useExportarActividadesJson } from "@/features/planeador/api/mutations/exportar-actividades-json"
import { downloadJson } from "@/features/planeador/lib/download-json"

import { DialogDeleteActividad } from "@/features/planeador/components/dialogs/dialog-delete-actividad"

type AccionId = "editar" | "marcar" | "aprobar"

interface Accion {
  id: AccionId
  label: string
  Icon: React.ComponentType<{ className?: string }>
  /** Si está definido, este botón tiene handler propio y no se renderiza
   * `disabled`. Sirve para distinguir visualmente las acciones vivas de
   * las que siguen siendo read-only visual. */
  onClick?: () => void
}

// El label mostrado (tooltip + aria-label) no es fijo por acción: "Marcar"
// dice "Calificar" en general, pero "Observar" cuando la actividad es
// formativa (ahí no hay nota que calificar, solo observación). "Aprobar"
// nunca convive con formativa (se filtra más abajo), así que su label queda
// fijo en "Calificar múltiple".
function labelFor(id: AccionId, actividad: Actividad): string {
  switch (id) {
    case "editar":
      return "Editar"
    case "marcar":
      return esActividadFormativa(actividad) ? "Observar" : "Calificar"
    case "aprobar":
      return "Calificar múltiple"
  }
}

interface ActividadCardProps {
  actividad: Actividad
  /** Cuando true, la card se renderiza con el fondo de seleccionada. */
  selected?: boolean
  /** Abre esta actividad en el panel de detalle (vista informativa). */
  onSelect?: () => void
  /** Cambia el panel de detalle a la vista de calificaciones de esta
   * actividad. Se dispara desde el chulito (Marcar) de la card. */
  onShowGrades?: () => void
  /** Cambia el panel de detalle a la vista de aprobación bulk de esta
   * actividad. Se dispara desde el clipboard-check (Aprobar) de la card. */
  onShowApproval?: () => void
  /** Navega a la pantalla de edición de la actividad. Se dispara desde el
   * lápiz (Editar) de la card. */
  onEdit?: () => void
  /** Hook opcional: se ejecuta cuando termina OK el `DialogDeleteActividad`
   * (típicamente, limpiar la selección / cerrar el panel). */
  onDeleted?: () => void
}

const ACCIONES_BASE: readonly Omit<Accion, "label" | "onClick">[] = [
  { id: "editar", Icon: PencilIcon },
  { id: "marcar", Icon: CheckIcon },
  { id: "aprobar", Icon: ClipboardCheckIcon },
  // "Descargar" y "Eliminar" NO van acá: sus diálogos traen su propio
  // trigger, así que montarlos también en este loop duplicaría el botón.
] as const

/**
 * Card vertical del listado del Planeador. Click → abre el detalle en el
 * panel de la derecha de la misma pantalla.
 *
 * El status se lee por color en dos lugares: la barra vertical del borde
 * izquierdo y el círculo del ícono, que va en trazo (no relleno) para no
 * competir con el título. El avance de evaluación cierra la card con el
 * porcentaje en ese mismo color.
 *
 * Las acciones viven en una barra flotante sobre la esquina inferior derecha:
 * la columna es angosta y no hay ancho para ponerlas en línea sin aplastar el
 * título.
 *
 * Cinco acciones viven en la card (de izq. a der. en la barra flotante):
 * - **Editar**: navega a la pantalla de edición (`onEdit`).
 * - **Marcar**: cambia el panel a la vista de calificaciones (`onShowGrades`).
 * - **Aprobar**: cambia el panel a la vista de aprobación bulk (`onShowApproval`).
 * - **Descargar**: sin diálogo de formato — llama al mismo
 *   `POST /planeador/actividades/exportar` que "Exportar todo" del toolbar
 *   (`useExportarActividadesJson`), acotado a `IDS: [actividad.id]`, y baja
 *   el `.json` directo. No es el export PDF/Excel (ese quedó solo en el
 *   toolbar, vía `DialogExportActividades`).
 * - **Eliminar**: dispara el `DialogDeleteActividad`, que es un `AlertDialog`
 *   con confirmación. El trigger del AlertDialog reemplaza al botón de la
 *   barra de acciones (mismo color/tamaño que los otros), así se ve parejo.
 */
export function ActividadCard({
  actividad,
  selected = false,
  onSelect,
  onShowGrades,
  onShowApproval,
  onEdit,
  onDeleted,
}: ActividadCardProps) {
  const StatusIcon = statusIconFor(actividad.status)
  const accent = statusAccentFor(actividad.status)
  const { notify } = useNotify()

  const exportarJson = useExportarActividadesJson({
    mutationConfig: {
      onSuccess: (actividadesExportadas) => {
        downloadJson(`actividad-${actividad.id}.json`, actividadesExportadas)
        notify("Actividad exportada.")
      },
      onError: () => notify("No se pudo exportar la actividad.", { variant: "error" }),
    },
  })

  // Editar / Marcar / Aprobar se montan como botones planos. Descargar y
  // Eliminar tienen sus propios widgets (Dialog y AlertDialog) que
  // también renderean el botón del trigger, así que se excluyen de este
  // loop para no duplicar el control visual.
  //
  // "Aprobar" (bulk) no aplica en preescolar: ahí no hay reporte masivo,
  // "Marcar" ya cubre observación + asistencia de a un estudiante por vez.
  // Tampoco aplica a una actividad que no es evaluativa (`esEvaluativa ===
  // false`, "N" en el backend): sin nota que calificar no hay nada que
  // aprobar en bloque, aunque la unidad en sí sea Evaluativo. Antes esto
  // dependía SOLO de `esActividadFormativa` (`es_formativa`), que el listado
  // real todavía no devuelve (reportado en vivo: el botón seguía
  // apareciendo para actividades con `es_evaluativa: "N"`) — `esEvaluativa`
  // sí viene siempre en esta fila, así que sirve de gate inmediato mientras
  // el backend no complete `es_formativa` ahí, y además es la condición más
  // precisa: "Aprobar" nunca tiene sentido sin nota, sea o no formativa.
  const acciones: Accion[] = ACCIONES_BASE.filter(
    (accion) => accion.id !== "aprobar" || (actividad.esEvaluativa && !esActividadFormativa(actividad)),
  ).map((accion) => {
    const label = labelFor(accion.id, actividad)
    if (accion.id === "editar" && onEdit) return { ...accion, label, onClick: onEdit }
    if (accion.id === "marcar" && onShowGrades) return { ...accion, label, onClick: onShowGrades }
    if (accion.id === "aprobar" && onShowApproval) return { ...accion, label, onClick: onShowApproval }
    return { ...accion, label }
  })

  // Sin estudiantes asignados el porcentaje no significa nada: se omite en
  // vez de mostrar un 0% que se leería como "nadie evaluado".
  const porcentaje =
    actividad.totalEstudiantes > 0
      ? Math.round((actividad.evaluados / actividad.totalEstudiantes) * 100)
      : null

  return (
    <article
      className={cn(
        // `overflow-hidden` para que la barra de status se recorte contra el
        // radio de la card en vez de asomar en las esquinas.
        "group/actividad relative flex flex-col gap-1 overflow-hidden rounded-sm border bg-card py-3 pr-3 pl-4 transition-colors",
        // Seleccionada: soft primary —el mismo par fondo/borde que usa la
        // variante soft del design system— en vez del gris de hover.
        selected ? "border-primary bg-primary-22" : "hover:bg-muted-22",
      )}
    >
      {/* Barra de status del borde izquierdo. */}
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1", statusRingFor(actividad.status))}
      />

      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
            accent,
          )}
        >
          <StatusIcon className="size-3.5" />
        </span>
        <h3 className="min-w-0 text-xs leading-snug font-bold break-words">{actividad.nombre}</h3>
      </div>

      {/* `esRecuperacion` ahora llega en el propio resumen del listado
          (`es_recuperacion`, antes solo se sabía abriendo el detalle) —
          badge chico, no compite con el título ni con el status. */}
      {actividad.esRecuperacion && (
        <span className="text-amber-700 dark:text-amber-400 w-fit rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[0.5625rem] font-semibold dark:border-amber-800 dark:bg-amber-950">
          Recuperación
        </span>
      )}

      <p className="text-muted-foreground text-[0.625rem] leading-snug">
        {/* `gradoGrupo` ya viene resuelto por el backend (ver el comentario
            de `Actividad.gradoGrupo`) — concatenar `grado`+`grupo` a mano
            puede duplicar el grado dentro del nombre del grupo (`"803M"`)
            o pegar mal un código negativo de Preescolar. Se cae a la
            concatenación solo si el backend todavía no lo manda. */}
        {actividad.asignatura}{" "}
        {actividad.gradoGrupo ?? [actividad.grado, actividad.grupo].filter(Boolean).join(" ")}
      </p>
      <p className="text-muted-foreground text-[0.625rem] leading-snug">
        {actividad.evaluados}/{actividad.totalEstudiantes} estudiantes evaluados
      </p>
      {porcentaje !== null && <p className={cn("text-xs font-bold", accent)}>{porcentaje}%</p>}

      {/* Acciones: barra flotante anclada ABAJO —arriba tapaba el título,
          que es lo primero que se lee—. Fondo con el mismo token sólido que
          la card en hover: uno con alfa se compondría dos veces al
          superponerse y se recortaría contra la card. */}
      <div
        className={cn(
          // `z-10` y no más: sólo tiene que quedar por encima del overlay
          // del link (`z-0`) de su propia card. Con `z-20` empataba con el
          // encabezado sticky de la pantalla y, al ir después en el DOM,
          // ganaba el desempate y la barra se dibujaba sobre el buscador.
          "absolute right-1 bottom-1 z-10 flex items-center gap-0 px-0.5 transition-opacity",
          // Los tokens `-22` llevan alfa (`--primary-22` ~8%, `--muted-22`
          // ~28%): superponerlos sobre una card que ya los tiene los
          // compondría dos veces y la barra se recortaría más oscura. Cada
          // `color-mix` es el equivalente opaco del fondo que le toca.
          selected
            ? "bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))]"
            : "bg-[color-mix(in_srgb,var(--muted)_28%,var(--card))]",
          "pointer-events-none opacity-0",
          "group-hover/actividad:pointer-events-auto group-hover/actividad:opacity-100",
          "group-focus-within/actividad:pointer-events-auto group-focus-within/actividad:opacity-100",
        )}
      >
        {acciones.map(({ id, label, Icon, onClick }) => {
          // `label` sola ("Editar"/"Calificar"/"Observar"/"Calificar
          // múltiple") no distingue de cuál actividad es el botón cuando hay
          // varias cards a la vista (mismo texto en las dos) — se le suma el
          // nombre, mismo criterio que ya usan "Exportar"/"Eliminar" acá
          // abajo.
          const labelConNombre = `${label} ${actividad.nombre}`
          return (
            <Tooltip key={id}>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    disabled={!onClick}
                    aria-label={labelConNombre}
                    className="size-6"
                    // `stopPropagation` para que el click del action no se propague
                    // al `<button>` invisible que cubre toda la card y termine
                    // disparando `onSelect` (selección de la actividad).
                    onClick={(e) => {
                      e.stopPropagation()
                      onClick?.()
                    }}
                  />
                }
              >
                <Icon />
              </TooltipTrigger>
              <TooltipContent>{labelConNombre}</TooltipContent>
            </Tooltip>
          )
        })}

        {/* Descargar: un solo click, sin diálogo de formato — ver la nota
            de "Descargar" en el docstring de arriba. */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="icon-sm"
                className="size-6"
                aria-label={`Exportar ${actividad.nombre}`}
                disabled={exportarJson.isPending}
                aria-busy={exportarJson.isPending}
                onClick={(e) => {
                  e.stopPropagation()
                  exportarJson.mutate({ ids: [actividad.id] })
                }}
              />
            }
          >
            {exportarJson.isPending ? (
              <SpinnerIcon className="animate-spin" />
            ) : (
              <FileDownloadOutlinedIcon />
            )}
          </TooltipTrigger>
          <TooltipContent>{`Exportar ${actividad.nombre}`}</TooltipContent>
        </Tooltip>

        {/* Eliminar: el `AlertDialog` del delete vive acá adentro. El
            trigger hereda el `variant/color/size` del resto de la barra
            (ghost/neutral/icon-sm) para que se vea parejo con Editar. */}
        <DialogDeleteActividad
          actividad={actividad}
          onDeleted={onDeleted}
          triggerProps={{ className: "size-6" }}
        />
      </div>

      {/* Botón invisible que cubre toda la card: el click entero abre el
          detalle en el panel de la derecha. `aria-pressed` porque es un
          toggle de selección, no un enlace a otro documento. */}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Ver detalle de ${actividad.nombre}`}
        className="focus-visible:outline-ring absolute inset-0 z-0 rounded-sm focus-visible:outline-2"
      />
    </article>
  )
}
