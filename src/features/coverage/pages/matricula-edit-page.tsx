import { useEffect, useRef, useState } from "react"
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
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMatriculaDetailQuery } from "@/features/coverage/api/query/use-matricula-detail-query"
import { useReservationCatalogsQuery } from "@/features/coverage/api/query/use-reservation-catalogs-query"
import { useUpdateMatricula } from "@/features/coverage/api/mutations/update-matricula"
import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import { MatriculaFormBody } from "@/features/coverage/components/forms/matricula-form-body"
import { MatriculaToolbar } from "@/features/coverage/components/matricula-toolbar"
import {
  GradeChangeDialog,
  type GradeChangeResult,
} from "@/features/coverage/components/dialogs/dialog-grade-change"
import {
  GradeChangeSummaryDialog,
  type GradeChangeSummary,
} from "@/features/coverage/components/dialogs/dialog-grade-change-summary"
import { CambioSedeMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-cambio-sede-matricula"
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
  const { user } = useAuth()
  const { data, isPending, isError } = useMatriculaDetailQuery(matriculaId)
  const { data: catalogs } = useReservationCatalogsQuery()
  const { data: municipalities = [] } = useMunicipalitiesQuery()

  const [values, setValues] = useState<CreateMatriculaInput | null>(null)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  // Grado con el que arrancó el borrador (para detectar si el usuario lo
  // cambió al guardar) — un ref porque no debe resetearse en cada
  // `setValues`, solo la primera vez que llega la ficha.
  const initialGradeRef = useRef<string | null>(null)
  // Igual que `initialGradeRef`, pero para "Sede" (dispara
  // `CambioSedeMatriculaDialog` en vez de `GradeChangeDialog`).
  const initialSedeRef = useRef<string | null>(null)
  // Solo para armar la comparación "Grupo: X = X" en `CambioSedeMatriculaDialog`
  // cuando el grupo no cambió junto con la sede.
  const initialGroupRef = useRef<string | null>(null)
  // Se llena al intentar guardar si el grado cambió respecto al original —
  // dispara `GradeChangeDialog` (ver render, abajo) en vez de guardar de
  // una. El cambio de grado real (crear la matrícula nueva, pasar la vieja a
  // Promovido/Reubicado) todavía no tiene backend — por ahora el diálogo
  // solo confirma la intención; al confirmar, recién ahí se guarda.
  const [gradeChange, setGradeChange] = useState<{ from: number; to: number } | null>(null)
  // Resumen a mostrar en `GradeChangeSummaryDialog` una vez el guardado (que
  // sigue al "Confirmar cambio" del diálogo de arriba) termina bien.
  const [gradeChangeSummary, setGradeChangeSummary] = useState<GradeChangeSummary | null>(null)
  // Se llena al intentar guardar si la Sede cambió respecto a la original —
  // dispara `CambioSedeMatriculaDialog` (ver render, abajo) en vez de
  // guardar de una, mismo patrón que `gradeChange`.
  const [sedeChange, setSedeChange] = useState<{
    fromSede: string
    toSede: string
    fromGrade: number
    toGrade: number
    fromGroup: string
    toGroup: string
  } | null>(null)

  // La ficha llega asíncrona — recién ahí se puede arrancar el borrador de
  // edición. Solo la primera vez: después el usuario es dueño del estado.
  useEffect(() => {
    if (data?.status === "ok" && data.details && values === null) {
      setValues(data.details)
      initialGradeRef.current = data.details.academic.grade
      initialSedeRef.current = data.details.academic.campus
      initialGroupRef.current = data.details.academic.group
    }
  }, [data, values])

  // El estado de la matrícula es de solo lectura en este formulario (ver
  // `disabled` en `MatriculaSelectField` de "matricula-status") — cambia solo
  // vía "Retirar"/"Reingreso" en `MatriculaToolbar`, que invalida la query y
  // trae un `status` nuevo acá. Como el resto del borrador ya no se
  // resincroniza después de la carga inicial (el usuario es dueño de esos
  // campos), hay que traer el `status` actualizado aparte para que no quede
  // mostrando el valor viejo tras retirar/reingresar sin salir de esta página.
  useEffect(() => {
    const nextStatus = data?.status === "ok" ? data.details?.academic.status : undefined
    if (nextStatus && values && nextStatus !== values.academic.status) {
      setValues({ ...values, academic: { ...values.academic, status: nextStatus } })
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

  function performSave(onSaved?: () => void) {
    if (!values) return
    updateMatricula.mutate(
      { id: matriculaId, values },
      {
        onSuccess: (result) => {
          if (result.status === "error") {
            notify(result.message, { variant: "error" })
            return
          }
          if (onSaved) {
            onSaved()
            return
          }
          notify("Matrícula actualizada correctamente.")
          navigate({ to: paths.app.coberturaMatriculaDetalle.getHref(matriculaId) })
        },
      },
    )
  }

  function handleGradeChangeCancel() {
    if (gradeChange && values && initialGradeRef.current) {
      setValues({ ...values, academic: { ...values.academic, grade: initialGradeRef.current } })
    }
    setGradeChange(null)
  }

  function handleGradeChangeConfirm(result: GradeChangeResult) {
    if (!gradeChange || !values || !data?.matricula) {
      setGradeChange(null)
      return
    }
    const currentGradeChange = gradeChange
    const studentName = `${data.matricula.firstName} ${data.matricula.lastName}`
    setGradeChange(null)
    // El resumen se muestra recién cuando el guardado (con el grado ya
    // cambiado en `values`) termina bien — no antes.
    performSave(() => {
      setGradeChangeSummary({
        studentName,
        kind: result.kind,
        campus: values.academic.campus,
        fromGrade: currentGradeChange.from,
        toGrade: currentGradeChange.to,
        group: values.academic.group,
        gradesAction: result.gradesAction,
        date: new Date(),
        userName: user?.name ?? "",
      })
    })
  }

  function handleGradeChangeSummaryClose() {
    setGradeChangeSummary(null)
    navigate({ to: paths.app.coberturaMatriculaDetalle.getHref(matriculaId) })
  }

  function handleSedeChangeCancel() {
    if (sedeChange && values && initialSedeRef.current) {
      setValues({ ...values, academic: { ...values.academic, campus: initialSedeRef.current } })
    }
    setSedeChange(null)
  }

  function handleSedeChangeConfirm() {
    setSedeChange(null)
    performSave()
  }

  function handleSave() {
    if (!values) return
    setHasSubmitted(true)
    const missing = validateMatricula(values)
    setMissingFields(missing)
    if (missing.length > 0) return

    const originalSede = initialSedeRef.current
    const currentSede = values.academic.campus
    if (originalSede && currentSede && originalSede !== currentSede) {
      const originalGrade = Number(initialGradeRef.current)
      const currentGrade = Number(values.academic.grade)
      setSedeChange({
        fromSede: originalSede,
        toSede: currentSede,
        fromGrade: originalGrade,
        toGrade: currentGrade,
        fromGroup: initialGroupRef.current ?? values.academic.group,
        toGroup: values.academic.group,
      })
      return
    }

    const original = initialGradeRef.current
    const current = values.academic.grade
    if (
      original &&
      current &&
      original !== current &&
      !Number.isNaN(Number(original)) &&
      !Number.isNaN(Number(current))
    ) {
      setGradeChange({ from: Number(original), to: Number(current) })
      return
    }

    performSave()
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

      {gradeChange && (
        <GradeChangeDialog
          open
          currentGrade={gradeChange.from}
          newGrade={gradeChange.to}
          onConfirm={handleGradeChangeConfirm}
          onCancel={handleGradeChangeCancel}
        />
      )}

      <GradeChangeSummaryDialog
        open={gradeChangeSummary != null}
        summary={gradeChangeSummary}
        onClose={handleGradeChangeSummaryClose}
      />

      {sedeChange && (
        <CambioSedeMatriculaDialog
          open
          fromSede={sedeChange.fromSede}
          toSede={sedeChange.toSede}
          fromGrade={sedeChange.fromGrade}
          toGrade={sedeChange.toGrade}
          fromGroup={sedeChange.fromGroup}
          toGroup={sedeChange.toGroup}
          onConfirm={handleSedeChangeConfirm}
          onClose={handleSedeChangeCancel}
        />
      )}
    </TableScreen>
  )
}
