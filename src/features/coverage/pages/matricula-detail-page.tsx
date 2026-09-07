import { useEffect, useMemo } from "react"
import { Link } from "@tanstack/react-router"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { SpinnerIcon } from "@/components/ui/icons"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"

import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaMatriculaDetalleRoute } from "@/router"
import { useMatriculaDetailQuery } from "@/features/coverage/api/query/use-matricula-detail-query"
import { useMatriculaFieldConfigQuery } from "@/features/coverage/api/query/use-matricula-field-config-query"
import { useMatriculaCampusesQuery } from "@/features/coverage/api/query/use-matricula-campuses-query"
import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import { MatriculaFormBody } from "@/features/coverage/components/forms/matricula-form-body"
import { MatriculaToolbar } from "@/features/coverage/components/matricula-toolbar"
import type { DepartmentOption } from "@/features/coverage/components/forms/form-create-matricula"
import { buildMatriculaFieldSettings } from "@/features/coverage/utils/matricula-field-settings"
import { resolveMatriculaMunicipioDepartments } from "@/features/coverage/utils/matricula-form-defaults"

export function MatriculaDetailPage() {
  return (
    <NoticeProvider>
      <MatriculaDetailPageContent />
    </NoticeProvider>
  )
}

function MatriculaDetailPageContent() {
  const { matriculaId } = coberturaMatriculaDetalleRoute.useParams()
  const { notify } = useNotify()
  const { data, isPending, isError, error } = useMatriculaDetailQuery(matriculaId)
  const { data: catalogs } = useMatriculaCampusesQuery()
  const { data: municipalities = [] } = useMunicipalitiesQuery()
  const {
    data: fieldConfig,
    isError: isFieldConfigError,
    error: fieldConfigError,
  } = useMatriculaFieldConfigQuery()
  const fieldSettings = fieldConfig ? buildMatriculaFieldSettings(fieldConfig) : undefined

  useEffect(() => {
    if (isError) notify(getErrorMessage(error), { variant: "error" })
  }, [isError, error, notify])
  useEffect(() => {
    if (isFieldConfigError) notify(getErrorMessage(fieldConfigError), { variant: "error" })
  }, [isFieldConfigError, fieldConfigError, notify])

  const departments: DepartmentOption[] = (() => {
    const byName = new Map<string, DepartmentOption["municipalities"]>()
    for (const municipality of municipalities) {
      const list = byName.get(municipality.department.name) ?? []
      list.push({ id: municipality.id, name: municipality.name })
      byName.set(municipality.department.name, list)
    }
    return Array.from(byName.entries()).map(([name, municipalities]) => ({ name, municipalities }))
  })()

  const details = useMemo(
    () => (data?.details ? resolveMatriculaMunicipioDepartments(data.details, municipalities) : null),
    [data?.details, municipalities],
  )

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button
              render={<Link to={paths.app.coberturaMatricula.getHref()} />}
              variant="fill"
              color="neutral"
              size="sm"
              nativeButton={false}
            >
              Cerrar
            </Button>
          }
        >
          Detalle de Matrícula
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      {isPending && (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <SpinnerIcon className="animate-spin" />
          Cargando…
        </div>
      )}

      {isError && (
        <div className="p-10 text-center text-sm text-destructive">
          No se pudo cargar la matrícula.
        </div>
      )}

      {data?.status === "ok" && data.matricula && details && (
        <TableScreenBody>
          <div className="flex flex-col gap-6">
            <MatriculaToolbar matricula={data.matricula} />
            <MatriculaFormBody
              values={details}
              onChange={() => {}}
              catalogs={catalogs}
              departments={departments}
              disabled
              fieldSettings={fieldSettings}
            />
          </div>
        </TableScreenBody>
      )}

      {data?.status === "error" && (
        <div className="p-10 text-center text-sm text-destructive">{data.message}</div>
      )}
    </TableScreen>
  )
}
