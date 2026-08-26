import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { toast } from "sonner"

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
import { cn } from "@/lib/utils"

import { paths } from "@/config/paths"
import { useMatriculaFieldConfigQuery } from "@/features/coverage/api/query/use-matricula-field-config-query"
import { useUpdateMatriculaFieldConfig } from "@/features/coverage/api/mutations/update-matricula-field-config"
import { MatriculaFormSection } from "@/features/coverage/components/forms/form-create-matricula"
import {
  MATRICULA_FIELD_CATALOG,
  type MatriculaFieldSetting,
} from "@/features/coverage/utils/matricula-field-catalog"
import type { MatriculaFieldConfigMap } from "@/features/coverage/api/types/matricula"

// Switch redondo — mismo criterio que el toggle "Habilitar reserva de
// cupos" del formulario de periodo académico (el `Switch` base es
// rectangular; acá se redondea a mano vía clases).
const ROUND_SWITCH_CLASSNAME = "rounded-full [&_[data-slot=switch-thumb]]:rounded-full"

interface FieldConfigBoxProps {
  id: string
  label: string
  setting: MatriculaFieldSetting
  /** No se puede des-requerir ni ocultar (ver `MatriculaFieldCatalogEntry.
   * locked`) — ambos switches se ven pero quedan fijos y deshabilitados. */
  locked?: boolean
  onChange: (setting: MatriculaFieldSetting) => void
}

function FieldConfigBox({ id, label, setting, locked, onChange }: FieldConfigBoxProps) {
  return (
    <Field orientation="vertical" variant="outlined" className="w-full gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
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
            checked={setting.required}
            disabled={locked || !setting.visible}
            onCheckedChange={(required) => onChange({ ...setting, required })}
          />
        </label>
        <label htmlFor={`${id}-visible`} className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Visible</span>
          <Switch
            id={`${id}-visible`}
            size="sm"
            className={ROUND_SWITCH_CLASSNAME}
            checked={setting.visible}
            disabled={locked}
            onCheckedChange={(visible) =>
              onChange({ visible, required: visible ? setting.required : false })
            }
          />
        </label>
      </div>
    </Field>
  )
}

export function MatriculaFieldConfigPage() {
  const { data, isPending, isError } = useMatriculaFieldConfigQuery()
  const [fields, setFields] = useState<MatriculaFieldConfigMap | null>(null)

  useEffect(() => {
    if (data?.status === "ok" && fields === null) {
      setFields(data.fields)
    }
  }, [data, fields])

  const updateConfig = useUpdateMatriculaFieldConfig({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
      },
      onError: () => {
        toast.error("No se pudo guardar la configuración.")
      },
    },
  })

  function patchField(id: string, setting: MatriculaFieldSetting) {
    setFields((prev) => (prev ? { ...prev, [id]: setting } : prev))
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
          Configuración de parámetros requeridos
        </TableScreenTitle>
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

          {fields &&
            MATRICULA_FIELD_CATALOG.map((section) => (
              <MatriculaFormSection key={section.title} title={section.title}>
                {section.fields.map((field) => (
                  <FieldConfigBox
                    key={field.id}
                    id={field.id}
                    label={field.label}
                    locked={field.locked}
                    setting={
                      field.locked
                        ? { required: true, visible: true }
                        : (fields[field.id] ?? { required: false, visible: true })
                    }
                    onChange={(setting) => patchField(field.id, setting)}
                  />
                ))}
              </MatriculaFormSection>
            ))}
        </div>
      </TableScreenBody>

      {fields && (
        <TableScreenFooter>
          <p className="text-sm text-muted-foreground">
            Los cambios aplican al próximo formulario de matrícula que se abra.
          </p>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={updateConfig.isPending}
            onClick={() => updateConfig.mutate(fields)}
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
