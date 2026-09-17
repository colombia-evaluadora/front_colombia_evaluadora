import { useRouter, useSearch } from "@tanstack/react-router"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { XIcon } from "@/components/ui/icons"

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
        <TableScreenTitle
          description={recurso.descripcion || undefined}
          // "Volver" es la acción de navegación del encabezado — mismo slot
          // que usan las páginas de detalle de Auditoría (`action` de
          // `TableScreenTitle`), no un botón suelto ANTES del título: así
          // queda alineado en la misma fila, dentro de la caja del
          // encabezado, en vez de flotar afuera con su propio margen.
          action={
            <Button
              variant="fill"
              color="neutral"
              size="sm"
              type="button"
              onClick={() => router.history.back()}
            >
              <XIcon data-icon="inline-start" />
              Cerrar
            </Button>
          }
        >
          {recurso.titulo || recurso.fuente || recurso.url || "Vista previa del recurso"}
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        {/* `TableScreenBody` crece (`grow`) para llenar el alto del viewport
            —tiene sentido para una tabla, que se estira con sus filas—, pero
            los estados vacíos (`RecursoPreviewVacio`/`EnlaceExterno`, unas
            pocas líneas) quedaban pegados arriba con un vacío enorme debajo.
            Centrar el contenido adentro de un `min-h` (no un `h` fijo:
            YouTube/DocViewer ya traen su propio alto real y no deberían
            recortarse) resuelve los dos casos con la misma envoltura. */}
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <RecursoPreview recurso={recurso} />
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}
