import { useState } from "react"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useValoresQuery } from "@/features/administration/listas-valor/api/query/use-valores-query"
import { useSaveParametro } from "@/features/administration/parametros-edad/api/mutations/save-parametro"
import { useParametrosEdadQuery } from "@/features/administration/parametros-edad/api/query/use-parametros-edad-query"
import { TablaCortes } from "@/features/administration/parametros-edad/components/tabla-cortes"
import { TablaCortesDefecto } from "@/features/administration/parametros-edad/components/tabla-cortes-defecto"
import { TablaEdades } from "@/features/administration/parametros-edad/components/tabla-edades"

export function ParametrosEdadPage() {
  return (
    <NoticeProvider>
      <ParametrosEdadContent />
    </NoticeProvider>
  )
}

const AVISO = {
  id: 0,
  message:
    "La situación de edad no se guarda: cualquier cambio en estos parámetros se reflejará en todas las inscripciones y matrículas.",
}

function ParametrosEdadContent() {
  const { notify } = useNotify()
  const { puedeEditar } = useMenuPermission("PARAMETROS_EDAD")
  const [avisoVisible, setAvisoVisible] = useState(true)
  const { data, isPending, isError, error } = useParametrosEdadQuery()
  const grados = useValoresQuery("GRADOS")
  const calendarios = useValoresQuery("CALENDARIO")

  const save = useSaveParametro({
    mutationConfig: {
      onSuccess: () => notify("Parámetro guardado."),
      // El diálogo del grado muestra su propio error; las ediciones en fila, aquí.
      onError: (e, v) => {
        if (v.tipo !== "grado") notify(getErrorMessage(e), { variant: "error" })
      },
    },
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>Parámetros de edad</TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody>
        <div className="flex flex-col gap-8">
          <NoticeOutlet />
          <NoticeBanner
            variant="info"
            notice={avisoVisible ? AVISO : null}
            onClose={() => setAvisoVisible(false)}
          />

          {isError ? (
            <ErrorNoticeBanner error={error} />
          ) : isPending ? (
            <div className="flex flex-col gap-8">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </div>
              <Skeleton className="h-96" />
            </div>
          ) : (
            <>
              {/* Primero la política (cortes y fecha de corte); debajo, cómo cae en cada grado. */}
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <TablaCortesDefecto
                  cortes={data.cortesDefecto}
                  puedeEditar={puedeEditar}
                  guardando={save.isPending}
                  onGuardar={(cortes) => save.mutateAsync({ tipo: "cortes", ...cortes })}
                />
                <TablaCortes
                  filas={data.calendarios}
                  opciones={calendarios.data ?? []}
                  puedeEditar={puedeEditar}
                  guardando={save.isPending}
                  onGuardar={(codigo, mes, dia, nuevo) =>
                    save.mutateAsync({ tipo: "calendario", codigo, mes, dia, nuevo })
                  }
                />
              </div>
              <TablaEdades
                filas={data.grados}
                opciones={grados.data ?? []}
                defecto={data.cortesDefecto}
                puedeEditar={puedeEditar}
                guardando={save.isPending}
                onGuardar={(codigo, edad, cortes, nuevo) =>
                  save.mutateAsync({ tipo: "grado", codigo, edad, nuevo, ...cortes })
                }
              />
            </>
          )}
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}
