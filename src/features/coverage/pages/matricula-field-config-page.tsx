import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"

import {
  TableScreen,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { inputVariants } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { CheckIcon, SpinnerIcon } from "@/components/ui/icons"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { cn } from "@/lib/utils"

import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { useMatriculaFieldConfigQuery } from "@/features/coverage/api/query/use-matricula-field-config-query"
import {
  useUpdateMatriculaFieldConfig,
  type MatriculaFieldConfigChange,
} from "@/features/coverage/api/mutations/update-matricula-field-config"
import { MatriculaFormSection } from "@/features/coverage/components/forms/form-create-matricula"
import type { MatriculaConfigCampo, MatriculaConfigSeccion } from "@/features/coverage/api/types/matricula"

// Switch redondo — mismo criterio que el toggle "Habilitar reserva de
// cupos" del formulario de periodo académico (el `Switch` base es
// rectangular; acá se redondea a mano vía clases).
const ROUND_SWITCH_CLASSNAME = "rounded-full [&_[data-slot=switch-thumb]]:rounded-full"

interface FieldConfigBoxProps {
  campo: MatriculaConfigCampo
  onChange: (patch: { requerido: boolean; visible: boolean }) => void
}

function FieldConfigBox({ campo, onChange }: FieldConfigBoxProps) {
  const id = `campo-${campo.fkCampo}`
  const locked = !campo.editable

  return (
    <Field orientation="vertical" variant="outlined" className="w-full gap-2">
      <FieldLabel htmlFor={id}>{campo.nombre}</FieldLabel>
      <div
        className={cn(
          inputVariants({ variant: "outlined", size: "sm" }),
          "flex items-center justify-between gap-4",
        )}
      >
        <label htmlFor={`${id}-required`} className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Requerido</span>
          <Switch
            id={`${id}-required`}
            size="sm"
            className={ROUND_SWITCH_CLASSNAME}
            checked={campo.requerido}
            disabled={locked}
            onCheckedChange={(requerido) =>
              onChange({ requerido, visible: requerido ? true : campo.visible })
            }
          />
        </label>
        <label htmlFor={`${id}-visible`} className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Visible</span>
          <Switch
            id={`${id}-visible`}
            size="sm"
            className={ROUND_SWITCH_CLASSNAME}
            checked={campo.visible}
            disabled={locked}
            onCheckedChange={(visible) =>
              onChange({ visible, requerido: visible ? campo.requerido : false })
            }
          />
        </label>
      </div>
    </Field>
  )
}

/** Compara contra la última config traída del backend — solo los campos que
 * cambiaron van en el `PUT` (uno por campo, ver `updateMatriculaFieldConfig`). */
function collectChanges(
  original: MatriculaConfigSeccion[],
  edited: MatriculaConfigSeccion[],
): MatriculaFieldConfigChange[] {
  const originalById = new Map(
    original.flatMap((seccion) => seccion.campos).map((campo) => [campo.fkCampo, campo]),
  )

  const changes: MatriculaFieldConfigChange[] = []
  for (const campo of edited.flatMap((seccion) => seccion.campos)) {
    const before = originalById.get(campo.fkCampo)
    if (!before) continue
    if (before.requerido !== campo.requerido || before.visible !== campo.visible) {
      changes.push({
        fkCampo: campo.fkCampo,
        patch: { requerido: campo.requerido, visible: campo.visible },
      })
    }
  }
  return changes
}

export function MatriculaFieldConfigPage() {
  return (
    <NoticeProvider>
      <MatriculaFieldConfigPageContent />
    </NoticeProvider>
  )
}

function MatriculaFieldConfigPageContent() {
  const { data, isPending, isError, error } = useMatriculaFieldConfigQuery()
  const [secciones, setSecciones] = useState<MatriculaConfigSeccion[] | null>(null)
  const { notify } = useNotify()

  useEffect(() => {
    if (data && secciones === null) {
      setSecciones(data.secciones)
    }
  }, [data, secciones])

  useEffect(() => {
    if (isError) notify(getErrorMessage(error), { variant: "error", autoCloseMs: 0 })
  }, [isError, error, notify])

  const updateConfig = useUpdateMatriculaFieldConfig({
    mutationConfig: {
      onSuccess: (result) => {
        setSecciones(result.secciones)
        notify("Configuración guardada.")
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  function patchField(fkCampo: number, patch: { requerido: boolean; visible: boolean }) {
    setSecciones((prev) =>
      prev
        ? prev.map((seccion) => ({
            ...seccion,
            campos: seccion.campos.map((campo) =>
              campo.fkCampo === fkCampo ? { ...campo, ...patch } : campo,
            ),
          }))
        : prev,
    )
  }

  const changes = data && secciones ? collectChanges(data.secciones, secciones) : []

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
          Configuración de parámetros requeridos
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody className="rounded-b-none border-b-0">
        <div className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            Este componente corresponde al módulo de parametrización de campos dentro del sistema de
            gestión académica. Su función principal es permitir al administrador institucional definir
            la visibilidad y obligatoriedad de los campos que conforman el formulario de matrícula o
            actualización de datos del estudiante.
          </p>

          {isPending && (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <SpinnerIcon className="animate-spin" />
              Cargando…
            </div>
          )}

          {isError && (
            <div className="p-10 text-center text-sm text-destructive">
              No se pudo cargar la configuración.
            </div>
          )}

          {secciones &&
            secciones.map((seccion) => (
              <MatriculaFormSection key={seccion.seccion} title={seccion.seccion}>
                {seccion.campos.map((campo) => (
                  <FieldConfigBox
                    key={campo.fkCampo}
                    campo={campo}
                    onChange={(patch) => patchField(campo.fkCampo, patch)}
                  />
                ))}
              </MatriculaFormSection>
            ))}
        </div>
      </TableScreenBody>

      {secciones && (
        <TableScreenFooter>
          <p className="text-sm text-muted-foreground">
            Los cambios aplican al próximo formulario de matrícula que se abra.
          </p>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={updateConfig.isPending || changes.length === 0}
            onClick={() => updateConfig.mutate(changes)}
          >
            {updateConfig.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </TableScreenFooter>
      )}
    </TableScreen>
  )
}
