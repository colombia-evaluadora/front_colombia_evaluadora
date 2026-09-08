import { useState } from "react"

import { ClipboardCheckIcon, ClipboardTextIcon, FolderOpenIcon } from "@/components/ui/icons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Rubricas, Actividades } from "@/features/planeador/components/unidad-detalle-panel"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

type UnidadFormTab = "general" | "rubricas" | "actividades"

// Mismo panel que usa `UnidadTabs` en `unidad-detalle-panel.tsx`: sin borde
// arriba (lo dibuja la lista de pestañas) y esquina superior izquierda a
// escuadra, que es donde se apoya la primera solapa.
const PANEL =
  "min-w-0 rounded-b-lg rounded-tr-lg border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

/**
 * Pestañas "Información general / Rúbricas / Actividades" de las páginas de
 * alta y edición de unidad (`planeador-crear-unidad-page.tsx` /
 * `planeador-editar-unidad-page.tsx`) — mismas tres solapas que el panel de
 * detalle (`UnidadTabs`), reusando ahí mismo `Rubricas`/`Actividades` para
 * no mantener dos editores de listas distintos.
 *
 * Sin `unidad` (alta: la unidad todavía no existe) "Rúbricas" y
 * "Actividades" quedan deshabilitadas — no hay a qué unidad engancharles un
 * criterio o una actividad todavía. Se habilitan solas apenas la página de
 * edición las monta con la unidad ya creada.
 *
 * "Rúbricas" además se SACA (no se deshabilita) cuando `esFormativo` —
 * mismo criterio que `getVisibleTabs` en `unidad-detalle-panel.tsx`: el
 * seguimiento formativo no califica por niveles de desempeño, así que no
 * hay nada que definir ahí. El caller pasa el enfoque YA DERIVADO del
 * draft (`useEnfoquePedagogicoDerivado` en `form-unidad-info-general.tsx`),
 * no el de `unidad`, para que reaccione apenas cambia Grado/Asignatura,
 * antes de guardar.
 */
export function UnidadFormTabs({
  infoGeneralContent,
  unidad,
  esFormativo = false,
}: {
  infoGeneralContent: React.ReactNode
  unidad?: UnidadTematica
  esFormativo?: boolean
}) {
  const [tab, setTab] = useState<UnidadFormTab>("general")
  const puedeEditarListas = unidad != null

  // Si la pestaña activa deja de existir (el enfoque pasó a Formativo
  // mientras estaba parado en "Rúbricas"), vuelve a "Información general"
  // en vez de quedar en un `Tabs` sin trigger visible para ese value. Ajuste
  // de estado durante el render, no un efecto: la condición se vuelve falsa
  // apenas se aplica, así que no hay loop.
  if (esFormativo && tab === "rubricas") {
    setTab("general")
  }

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as UnidadFormTab)} className="w-full min-w-0">
      <TabsList variant="folder">
        {/* La variante "folder" pone `display: block` en el trigger (lo
            necesita el `truncate` de la etiqueta activa) — eso rompe el
            `inline-flex` que junta ícono y texto en la misma línea. El
            `span` interno fuerza ese layout horizontal sin tocar el
            `block` del trigger. */}
        <TabsTrigger value="general">
          <span className="inline-flex items-center gap-1.5">
            <ClipboardTextIcon data-icon="inline-start" />
            Información general
          </span>
        </TabsTrigger>
        {!esFormativo && (
          <TabsTrigger value="rubricas" disabled={!puedeEditarListas}>
            <span className="inline-flex items-center gap-1.5">
              <FolderOpenIcon data-icon="inline-start" />
              Rúbricas
            </span>
          </TabsTrigger>
        )}
        <TabsTrigger value="actividades" disabled={!puedeEditarListas}>
          <span className="inline-flex items-center gap-1.5">
            <ClipboardCheckIcon data-icon="inline-start" />
            Actividades
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className={PANEL}>
        {infoGeneralContent}
      </TabsContent>
      {unidad && !esFormativo && (
        <TabsContent value="rubricas" className={PANEL}>
          <Rubricas unidad={unidad} />
        </TabsContent>
      )}
      {unidad && (
        <TabsContent value="actividades" className={PANEL}>
          <Actividades unidad={unidad} />
        </TabsContent>
      )}
    </Tabs>
  )
}
