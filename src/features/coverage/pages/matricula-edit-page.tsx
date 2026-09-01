import { useEffect, useMemo, useRef, useState } from "react"
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
import { useMatriculaFieldConfigQuery } from "@/features/coverage/api/query/use-matricula-field-config-query"
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
import type {
  BulkGroupChangeClassification,
  CreateMatriculaInput,
} from "@/features/coverage/api/types/matricula"
import {
  REQUIRED_MATRICULA_FIELD_LABELS,
  resolveMatriculaMunicipioDepartments,
  validateMatricula,
} from "@/features/coverage/utils/matricula-form-defaults"
import { buildMatriculaFieldSettings } from "@/features/coverage/utils/matricula-field-settings"

const EDIT_MATRICULA_FORM_ID = "edit-matricula-form"

const GRADE_KIND_LABELS: Record<GradeChangeResult["kind"], string> = {
  promocion: "Promoción anticipada",
  correccion: "Corrección de matrícula",
}

const SEDE_CLASSIFICATION_LABELS: Record<BulkGroupChangeClassification, string> = {
  cambioGrado: "Reubicación de sede",
  correccion: "Corrección de matrícula",
}

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
  const { data: fieldConfig } = useMatriculaFieldConfigQuery()
  const fieldSettings = useMemo(
    () => (fieldConfig ? buildMatriculaFieldSettings(fieldConfig) : undefined),
    [fieldConfig],
  )

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

  useEffect(() => {
    if (data?.status === "ok" && data.details && values === null && municipalities.length > 0) {
      const resolved = resolveMatriculaMunicipioDepartments(data.details, municipalities)
      setValues(resolved)
      initialGradeRef.current = resolved.academic.grade
      initialSedeRef.current = resolved.academic.campus
      initialGroupRef.current = resolved.academic.group
    }
  }, [data, values, municipalities])

  useEffect(() => {
    const nextStatus = data?.status === "ok" ? data.details?.academic.status : undefined
    if (nextStatus && values && nextStatus !== values.academic.status) {
      setValues({ ...values, academic: { ...values.academic, status: nextStatus } })
    }
  }, [data, values])

  const departments: DepartmentOption[] = (() => {
    const byName = new Map<string, DepartmentOption["municipalities"]>()
    for (const municipality of municipalities) {
      const list = byName.get(municipality.department.name) ?? []
      list.push({ id: municipality.id, name: municipality.name })
      byName.set(municipality.department.name, list)
    }
    return Array.from(byName.entries()).map(([name, municipalities]) => ({ name, municipalities }))
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
    setMissingFields(validateMatricula(values, undefined, fieldSettings))
  }, [values, hasSubmitted, fieldSettings])

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
        movementKind: "grado",
        movementLabel: GRADE_KIND_LABELS[result.kind],
        fromCampus: values.academic.campus,
        toCampus: values.academic.campus,
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

  function handleSedeChangeConfirm(classification: BulkGroupChangeClassification) {
    if (!sedeChange || !values || !data?.matricula) {
      setSedeChange(null)
      return
    }
    const currentSedeChange = sedeChange
    const studentName = `${data.matricula.firstName} ${data.matricula.lastName}`
    setSedeChange(null)
    performSave(() => {
      setGradeChangeSummary({
        studentName,
        movementKind: "sede",
        movementLabel: SEDE_CLASSIFICATION_LABELS[classification],
        fromCampus: currentSedeChange.fromSede,
        toCampus: currentSedeChange.toSede,
        fromGrade: currentSedeChange.fromGrade,
        toGrade: currentSedeChange.toGrade,
        group: values.academic.group,
        // El cambio de sede no pregunta por calificaciones (ver
        // `dialog-cambio-sede-matricula.tsx`).
        gradesAction: null,
        date: new Date(),
        userName: user?.name ?? "",
      })
    })
  }

  function handleSave() {
    if (!values) return
    setHasSubmitted(true)
    const missing = validateMatricula(values, undefined, fieldSettings)
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
                fieldSettings={fieldSettings}
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
          gradeWillChange={sedeChange.fromGrade !== sedeChange.toGrade}
          sameOrigin
          onConfirm={handleSedeChangeConfirm}
          onClose={handleSedeChangeCancel}
        />
      )}
    </TableScreen>
  )
}
