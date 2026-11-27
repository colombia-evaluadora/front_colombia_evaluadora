import { Link } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { SpinnerIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInformesMatriculaRoute } from "@/router"

import { useMatriculaDetailQuery } from "@/features/coverage/matricula/api/query/use-matricula-detail-query"
import { useMatriculaFieldConfigQuery } from "@/features/coverage/matricula/api/query/use-matricula-field-config-query"
import { useEstablecimientoDeSede } from "@/features/coverage/matricula/api/query/use-establecimiento-de-sede"
import { useMatriculaCampusesQuery } from "@/features/coverage/matricula/api/query/use-matricula-campuses-query"
import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import { MatriculaFormBody } from "@/features/coverage/matricula/components/forms/matricula-form-body"
import { MatriculaStatusBadge } from "@/features/coverage/matricula/components/table/columns-matricula"
import type { DepartmentOption } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import { applyGradeFieldRules, buildMatriculaFieldSettings } from "@/features/coverage/matricula/utils/matricula-field-settings"
import { resolveMatriculaMunicipioDepartments } from "@/features/coverage/matricula/utils/matricula-form-defaults"

/**
 * Ver detalle desde la Consulta de matriculados (Cobertura 3.9): la matrícula
 * en solo lectura, bloques 2.1 a 2.15 y su estado, sin ninguna acción. Sirve
 * también para períodos Cerrados.
 */
export function InformeMatriculaDetallePage() {
  const { matriculaId } = coberturaInformesMatriculaRoute.useParams()
  const { data, isPending, isError, error } = useMatriculaDetailQuery(matriculaId)
  const colegio = useEstablecimientoDeSede({
    sedeId: data?.details?.sedeId,
    sedeNombre: data?.details?.academic.campus,
  })
  const { data: catalogs } = useMatriculaCampusesQuery()
  const { data: municipalities = [] } = useMunicipalitiesQuery()
  const { data: fieldConfig } = useMatriculaFieldConfigQuery({
    establecimientoId: colegio.establecimientoId,
    enabled: colegio.resuelto,
  })
  const fieldSettings = applyGradeFieldRules(
    fieldConfig ? buildMatriculaFieldSettings(fieldConfig) : undefined,
    data?.details?.academic.grade,
  )

  const byName = new Map<string, DepartmentOption["municipalities"]>()
  for (const m of municipalities) {
    const list = byName.get(m.department.name) ?? []
    list.push({ id: m.id, name: m.name })
    byName.set(m.department.name, list)
  }
  const departments: DepartmentOption[] = Array.from(byName.entries()).map(([name, municipalities]) => ({ name, municipalities }))
  const details = data?.details ? resolveMatriculaMunicipioDepartments(data.details, municipalities) : null

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button
              render={<Link to={paths.app.coberturaInformesReportes.getHref()} />}
              variant="fill"
              color="neutral"
              size="sm"
              nativeButton={false}
            >
              Cerrar
            </Button>
          }
        >
          Detalle de matrícula
        </TableScreenTitle>
      </TableScreenHeader>

      {isPending && (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <SpinnerIcon className="animate-spin" />
          Cargando…
        </div>
      )}
      {isError && <div className="p-10 text-center text-sm text-red">{getErrorMessage(error)}</div>}
      {data?.status === "error" && <div className="p-10 text-center text-sm text-red">{data.message}</div>}

      {data?.status === "ok" && data.matricula && details && (
        <TableScreenBody>
          <div className="flex flex-col gap-6 p-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Estado</span>
              <MatriculaStatusBadge status={data.matricula.status} />
            </div>
            <MatriculaFormBody
              values={details}
              onChange={() => {}}
              catalogs={catalogs}
              departments={departments}
              disabled
              fieldSettings={fieldSettings}
              datosProtegidos={
                Boolean(data.matricula.sinAutorizacion) || Boolean(data.details?.restricciones?.origenAdscripcion)
              }
            />
          </div>
        </TableScreenBody>
      )}
    </TableScreen>
  )
}
