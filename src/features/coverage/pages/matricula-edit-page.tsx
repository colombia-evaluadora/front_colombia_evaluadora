import { useEffect, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import {
  TableScreen,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { CheckIcon, SpinnerIcon } from "@/components/ui/icons"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"

import { paths } from "@/config/paths"
import { coberturaMatriculaEditarRoute } from "@/router"
import { useMatriculaDetailQuery } from "@/features/coverage/api/query/use-matricula-detail-query"
import { useReservationCatalogsQuery } from "@/features/coverage/api/query/use-reservation-catalogs-query"
import { useUpdateMatricula } from "@/features/coverage/api/mutations/update-matricula"
import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import { MatriculaFormBody } from "@/features/coverage/components/forms/matricula-form-body"
import { MatriculaToolbar } from "@/features/coverage/components/matricula-toolbar"
import type { DepartmentOption } from "@/features/coverage/components/forms/form-create-matricula"
import type { CreateMatriculaInput } from "@/features/coverage/api/types/matricula"
import {
  REQUIRED_MATRICULA_FIELD_LABELS,
  validateMatricula,
} from "@/features/coverage/utils/matricula-form-defaults"

const EDIT_MATRICULA_FORM_ID = "edit-matricula-form"

export function MatriculaEditPage() {
  return (
    <NoticeProvider>
      <MatriculaEditPageContent />
    </NoticeProvider>
  )
}

function MatriculaEditPageContent() {
  const { matriculaId } = coberturaMatriculaEditarRoute.useParams()
  const navigate = useNavigate()
  const { notify, dismiss } = useNotify()
  const { data, isPending, isError } = useMatriculaDetailQuery(matriculaId)
  const { data: catalogs } = useReservationCatalogsQuery()
  const { data: municipalities = [] } = useMunicipalitiesQuery()

  const [values, setValues] = useState<CreateMatriculaInput | null>(null)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // La ficha llega asíncrona — recién ahí se puede arrancar el borrador de
  // edición. Solo la primera vez: después el usuario es dueño del estado.
  useEffect(() => {
    if (data?.status === "ok" && data.details && values === null) {
      setValues(data.details)
    }
  }, [data, values])

  const departments: DepartmentOption[] = (() => {
    const byName = new Map<string, Set<string>>()
    for (const municipality of municipalities) {
      const set = byName.get(municipality.department.name) ?? new Set<string>()
      set.add(municipality.name)
      byName.set(municipality.department.name, set)
    }
    return Array.from(byName.entries()).map(([name, set]) => ({
      name,
      municipalities: Array.from(set),
    }))
  })()

  const updateMatricula = useUpdateMatricula({
    mutationConfig: {
      onError: () => {
        notify("No se pudo actualizar la matrícula.", { variant: "error" })
      },
    },
  })

  useEffect(() => {
    if (!hasSubmitted || !values) return
    setMissingFields(validateMatricula(values))
  }, [values, hasSubmitted])

  useEffect(() => {
    if (missingFields.length === 0) {
      dismiss()
      return
    }
    const labels = missingFields.map((id) => REQUIRED_MATRICULA_FIELD_LABELS[id] ?? id)
    notify(`Faltan campos obligatorios: ${labels.join(", ")}.`, {
      variant: "error",
      autoCloseMs: 0,
    })
  }, [missingFields, notify, dismiss])

  function handleSave() {
    if (!values) return
    setHasSubmitted(true)
    const missing = validateMatricula(values)
    setMissingFields(missing)
    if (missing.length > 0) return

    updateMatricula.mutate(
      { id: matriculaId, values },
      {
        onSuccess: (result) => {
          if (result.status === "error") {
            notify(result.message, { variant: "error" })
            return
          }
          notify("Matrícula actualizada correctamente.")
          navigate({ to: paths.app.coberturaMatriculaDetalle.getHref(matriculaId) })
        },
      },
    )
  }

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
          Editar Matrícula
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

      {data?.status === "ok" && data.matricula && values && (
        <>
          <TableScreenBody className="rounded-b-none border-b-0">
            <div id={EDIT_MATRICULA_FORM_ID} className="flex flex-col gap-6">
              <MatriculaToolbar matricula={data.matricula} showModificar={false} />
              <MatriculaFormBody
                values={values}
                onChange={setValues}
                catalogs={catalogs}
                departments={departments}
                invalidFields={missingFields}
              />
            </div>
          </TableScreenBody>

          <TableScreenFooter>
            <p className="text-sm text-muted-foreground">Completa la información antes de guardar.</p>
            <Button
              type="button"
              variant="fill"
              color="primary"
              size="sm"
              disabled={updateMatricula.isPending}
              onClick={handleSave}
            >
              {updateMatricula.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Guardar
            </Button>
          </TableScreenFooter>
        </>
      )}

      {data?.status === "error" && (
        <div className="p-10 text-center text-sm text-destructive">{data.message}</div>
      )}
    </TableScreen>
  )
}
