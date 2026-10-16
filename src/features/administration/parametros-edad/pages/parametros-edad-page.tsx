import { useState } from "react"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { Badge } from "@/components/ui/badge"
import { InfoIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage } from "@/lib/api-client"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useValoresQuery } from "@/features/administration/listas-valor/api/query/use-valores-query"
import { useDeleteParametro } from "@/features/administration/parametros-edad/api/mutations/delete-parametro"
import { useSaveParametro } from "@/features/administration/parametros-edad/api/mutations/save-parametro"
import { useParametrosEdadQuery } from "@/features/administration/parametros-edad/api/query/use-parametros-edad-query"
import { TablaCortes } from "@/features/administration/parametros-edad/components/tabla-cortes"
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

const SITUACIONES = [
  { label: "En edad", color: "success", texto: "De −1 a +1 años frente a la edad recomendada" },
  { label: "Extraedad", color: "info", texto: "+2 años o más" },
  { label: "Baja edad", color: "info", texto: "−2 años o menos" },
  {
    label: "Sin calcular",
    color: "neutral",
    texto: "Falta la edad del grado o la fecha de corte del calendario",
  },
] as const

function ParametrosEdadContent() {
  const { notify } = useNotify()
  const { puedeEditar, puedeEliminar } = useMenuPermission("PARAMETROS_EDAD")
  const [avisoVisible, setAvisoVisible] = useState(true)
  const { data, isPending, isError, error } = useParametrosEdadQuery()
  const grados = useValoresQuery("GRADOS")
  const calendarios = useValoresQuery("CALENDARIO")

  const save = useSaveParametro({
    mutationConfig: {
      onSuccess: () => notify("Parámetro guardado."),
      onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
    },
  })

  const remove = useDeleteParametro()

  // `false` deja abierto el diálogo de confirmación si el backend rechaza.
  async function eliminar(tipo: "grado" | "calendario", codigo: string) {
    try {
      await remove.mutateAsync({ tipo, codigo })
      notify("Parámetro eliminado.")
      return true
    } catch (e) {
      notify(getErrorMessage(e), { variant: "error" })
      return false
    }
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>Parámetros de edad</TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody>
        <div className="flex flex-col gap-6">
          <NoticeOutlet />
          <NoticeBanner
            variant="info"
            notice={avisoVisible ? AVISO : null}
            onClose={() => setAvisoVisible(false)}
          />

          {isError ? (
            <p role="alert" className="text-sm text-red">
              {getErrorMessage(error)}
            </p>
          ) : isPending ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-80" />
              <Skeleton className="h-48" />
            </div>
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <TablaEdades
                filas={data.grados}
                opciones={grados.data ?? []}
                puedeEditar={puedeEditar}
                guardando={save.isPending}
                onGuardar={(codigo, edad) => save.mutateAsync({ tipo: "grado", codigo, edad })}
                puedeEliminar={puedeEliminar && !remove.isPending}
                onEliminar={(codigo) => eliminar("grado", codigo)}
              />
              <div className="flex flex-col gap-6">
                <TablaCortes
                  filas={data.calendarios}
                  opciones={calendarios.data ?? []}
                  puedeEditar={puedeEditar}
                  guardando={save.isPending}
                  onGuardar={(codigo, mes, dia) =>
                    save.mutateAsync({ tipo: "calendario", codigo, mes, dia })
                  }
                  puedeEliminar={puedeEliminar && !remove.isPending}
                  onEliminar={(codigo) => eliminar("calendario", codigo)}
                />
                <section aria-labelledby="situacion-edad" className="rounded-md border p-4">
                  <h3
                    id="situacion-edad"
                    className="mb-3 flex items-center gap-1.5 text-sm font-semibold"
                  >
                    Situación de edad (referencia)
                    <Tooltip>
                      <TooltipTrigger
                        render={<span className="inline-flex text-muted-foreground" />}
                      >
                        <InfoIcon className="size-3.5" />
                        <span className="sr-only">Cómo se calcula</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Se compara la edad cumplida a la fecha de corte del año lectivo con la edad
                        recomendada del grado.
                      </TooltipContent>
                    </Tooltip>
                  </h3>
                  <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2 text-sm">
                    {SITUACIONES.map((s) => (
                      <div key={s.label} className="contents">
                        <dt>
                          <Badge variant="soft" color={s.color}>
                            {s.label}
                          </Badge>
                        </dt>
                        <dd className="text-muted-foreground">{s.texto}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
            </div>
          )}
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}
