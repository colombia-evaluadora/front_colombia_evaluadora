import { useRouter, useSearch } from "@tanstack/react-router"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "@/components/ui/icons"

import type { Recurso } from "@/features/planeador/api/types/actividad"
import { RecursoPreview } from "@/features/planeador/components/recurso-preview"

/**
 * Vista previa de un recurso de "Materiales de apoyo", en pantalla
 * completa en vez de un modal: el recurso llega entero por `search` (no
 * por id) porque uno recién agregado en el form de Actividad todavía no
 * existe en el mock backend hasta que se guarda toda la actividad.
 *
 * "Volver" usa el historial del navegador en vez de una ruta fija: esta
 * página se abre tanto desde "Crear actividad" como desde "Editar
 * actividad", y en ambas tiene que volver a la que la abrió.
 */
export function PlaneadorRecursoPreviewPage() {
  const router = useRouter()
  const search = useSearch({ strict: false }) as Partial<Record<keyof Recurso, string>>

  const recurso: Recurso = {
    id: 0,
    tipo: (search.tipo as Recurso["tipo"]) || "URL",
    url: search.url ?? "",
    fuente: search.fuente ?? "",
    titulo: search.titulo ?? "",
    descripcion: search.descripcion ?? "",
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <Button
          variant="ghost"
          color="neutral"
          size="sm"
          className="w-fit"
          type="button"
          onClick={() => router.history.back()}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver
        </Button>

        <TableScreenTitle description={recurso.descripcion || undefined}>
          {recurso.titulo || recurso.fuente || recurso.url || "Vista previa del recurso"}
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <RecursoPreview recurso={recurso} />
      </TableScreenBody>
    </TableScreen>
  )
}
