import { useState } from "react"

import {
  TableScreen,
  TableScreenBody,
  TableScreenActions,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ControlPointIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useDeleteRelacion } from "@/features/administration/relaciones-alumno-grupo/api/mutations/delete-relacion"
import { useSaveRelacion } from "@/features/administration/relaciones-alumno-grupo/api/mutations/save-relacion"
import { useRelacionesAlumnoGrupoQuery } from "@/features/administration/relaciones-alumno-grupo/api/query/use-relaciones-alumno-grupo-query"
import type { RelacionAlumnoGrupo } from "@/features/administration/relaciones-alumno-grupo/api/types"
import {
  TablaRelaciones,
  type EdicionRelacion,
} from "@/features/administration/relaciones-alumno-grupo/components/tabla-relaciones"

export function RelacionesAlumnoGrupoPage() {
  return (
    <NoticeProvider>
      <RelacionesAlumnoGrupoContent />
    </NoticeProvider>
  )
}

function RelacionesAlumnoGrupoContent() {
  const { notify } = useNotify()
  const { puedeEditar, puedeEliminar } = useMenuPermission("RELACIONES_ALUMNO_GRUPO")
  const { data, isPending, isError, error } = useRelacionesAlumnoGrupoQuery()
  const [edicion, setEdicion] = useState<EdicionRelacion | null>(null)
  const [aEliminar, setAEliminar] = useState<RelacionAlumnoGrupo | null>(null)
  const [busqueda, setBusqueda] = useState("")

  const save = useSaveRelacion({
    mutationConfig: {
      onSuccess: () => notify("Relación guardada."),
      onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
    },
  })
  const remove = useDeleteRelacion({
    mutationConfig: {
      onSuccess: () => {
        notify("Relación eliminada.")
        setAEliminar(null)
      },
      onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
    },
  })

  // Sin opciones libres no hay alta posible: todas las combinaciones tienen máximo.
  const combinaciones = (data?.niveles.length ?? 0) * (data?.zonas.length ?? 0)
  const puedeAgregar = puedeEditar && !edicion && (data?.relaciones.length ?? 0) < combinaciones
  // La zona arranca en Urbana, como en el prototipo.
  const zonaInicial = data?.zonas[0]?.value ?? ""

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Máximo de estudiantes por grupo según el nivel educativo y la zona de la sede. Solo advierte cuando el cupo de un grupo lo supera.">
          Relaciones alumno-grupo
        </TableScreenTitle>
        {/* Reglas de UI: buscador a la izquierda y el botón de crear a la derecha, en la misma línea.
            La barra también pinta los avisos de la pantalla. */}
        <TableScreenToolbar>
          <SearchQueryBar
            id="relaciones-search"
            label="Buscar por nivel o zona"
            placeholder="Buscar"
            value={busqueda}
            onValueChange={setBusqueda}
            onClearAll={() => setBusqueda("")}
            activeFilterCount={busqueda ? 1 : 0}
          />
          {puedeEditar && (
            <TableScreenActions className="ml-auto">
              <Button
                color="primary"
                size="sm"
                disabled={!puedeAgregar}
                onClick={() => setEdicion({ pkRelacion: null, nivel: "", zona: zonaInicial, maximo: "" })}
              >
                <ControlPointIcon data-icon="inline-start" />
                Nueva relación
              </Button>
            </TableScreenActions>
          )}
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        {isError ? (
          <ErrorNoticeBanner error={error} />
        ) : isPending ? (
          <Skeleton className="h-72" />
        ) : (
          <TablaRelaciones
            relaciones={data.relaciones}
            busqueda={busqueda}
            niveles={data.niveles}
            zonas={data.zonas}
            edicion={edicion}
            onEdicion={setEdicion}
            puedeEditar={puedeEditar}
            puedeEliminar={puedeEliminar}
            guardando={save.isPending}
            onGuardar={(e) =>
              save.mutateAsync({
                pkRelacion: e.pkRelacion,
                pkNivel: Number(e.nivel),
                pkZona: Number(e.zona),
                maximo: Number(e.maximo),
              })
            }
            onEliminar={setAEliminar}
          />
        )}
      </TableScreenBody>

      <AlertDialog open={aEliminar != null} onOpenChange={(open) => !open && !remove.isPending && setAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar relación</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el máximo de {aEliminar?.nivel} en zona {aEliminar?.zona}. Los grupos
              dejarán de mostrar la advertencia de Cupo; los ya guardados no cambian.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" color="neutral" disabled={remove.isPending}>
              <XIcon data-icon="inline-start" />
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              color="destructive"
              disabled={remove.isPending}
              aria-busy={remove.isPending}
              onClick={() => aEliminar && remove.mutate({ pkRelacion: aEliminar.pkRelacion })}
            >
              {remove.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <TrashIcon data-icon="inline-start" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableScreen>
  )
}
