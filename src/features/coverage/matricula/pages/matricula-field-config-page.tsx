import { useEffect, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { MarcoOpciones } from "@/components/marco-opciones"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CheckIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { NoticeOutlet, NoticeProvider, queueNotice, useNotify } from "@/components/notice/notice-context"

import { paths } from "@/config/paths"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { getErrorMessage } from "@/lib/api-client"
import { useMatriculaFieldConfigQuery } from "@/features/coverage/matricula/api/query/use-matricula-field-config-query"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"
import {
  useUpdateMatriculaFieldConfig,
  type MatriculaFieldConfigChange,
} from "@/features/coverage/matricula/api/mutations/update-matricula-field-config"
import { MatriculaFormSection } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import type { MatriculaConfigCampo, MatriculaConfigSeccion } from "@/features/coverage/matricula/api/types/matricula"

interface FieldConfigBoxProps {
  campo: MatriculaConfigCampo
  onChange: (patch: { requerido: boolean; visible: boolean }) => void
}

function FieldConfigBox({ campo, onChange }: FieldConfigBoxProps) {
  const id = `campo-${campo.fkCampo}`
  const locked = !campo.editable

  // Interruptores en su recuadro (`MarcoOpciones`), juntos a la izquierda y cada uno antes de su texto
  // (CLAUDE.md §13), como «¿Media técnica…?». Visible primero: Requerido depende de él.
  return (
    <MarcoOpciones id={id} label={campo.nombre}>
      <label htmlFor={`${id}-visible`} className="flex cursor-pointer items-center gap-2 has-disabled:cursor-not-allowed">
        <Switch
          id={`${id}-visible`}
          size="sm"
          checked={campo.visible}
          disabled={locked}
          onCheckedChange={(visible) => onChange({ visible, requerido: visible ? campo.requerido : false })}
        />
        Visible
      </label>
      <label htmlFor={`${id}-required`} className="flex cursor-pointer items-center gap-2 has-disabled:cursor-not-allowed">
        <Switch
          id={`${id}-required`}
          size="sm"
          checked={campo.requerido}
          disabled={locked}
          onCheckedChange={(requerido) => onChange({ requerido, visible: requerido ? true : campo.visible })}
        />
        Requerido
      </label>
    </MarcoOpciones>
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
  // Un rector o secretaria de varios colegios elige cuál configurar; con uno
  // solo no hay nada que elegir y se pide sin colegio, como siempre.
  const { data: colegios = [], isPending: colegiosPending } = useEstablishmentsOptionsQuery()
  const [colegioElegido, setColegioElegido] = useState<number | null>(null)
  const varios = colegios.length > 1
  const establecimientoId = varios ? (colegioElegido ?? colegios[0].id) : null

  const { data, isPending, isError, error } = useMatriculaFieldConfigQuery({
    establecimientoId,
    enabled: !colegiosPending,
  })
  const [secciones, setSecciones] = useState<MatriculaConfigSeccion[] | null>(null)
  const { notify } = useNotify()
  const navigate = useNavigate()
  const { puedeEditar, isLoading: permisoCargando } = useMenuPermission("MATRICULA")
  // Sin Guardar, entrar por URL vuelve a la lista.
  useEffect(() => {
    if (!permisoCargando && !puedeEditar) {
      navigate({ to: paths.app.coberturaMatricula.getHref(), replace: true })
    }
  }, [permisoCargando, puedeEditar, navigate])

  useEffect(() => {
    if (data && secciones === null) {
      setSecciones(data.secciones)
    }
  }, [data, secciones])

  function elegirColegio(id: number) {
    setColegioElegido(id)
    // La edición en curso era del colegio anterior: se vuelve a cargar.
    setSecciones(null)
  }

  useEffect(() => {
    if (isError) notify(getErrorMessage(error), { variant: "error", autoCloseMs: 0 })
  }, [isError, error, notify])

  const updateConfig = useUpdateMatriculaFieldConfig({
    mutationConfig: {
      onSuccess: (result) => {
        setSecciones(result.secciones)
        queueNotice("Configuración guardada.")
        navigate({ to: paths.app.coberturaMatricula.getHref() })
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
          // Miga como en Agregar, Editar y Detalle de matrícula.
          ruta="Matrícula"
          action={
            // Guardar arriba junto a Cerrar (como Agregar/Editar matrícula). Sin cambios: Cerrar y Guardar
            // deshabilitado; con cambios: Cancelar (vuelve a lo guardado) y Guardar (CLAUDE.md §13).
            <div className="flex flex-wrap items-center justify-end gap-2">
              {changes.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  color="neutral"
                  size="sm"
                  disabled={updateConfig.isPending}
                  onClick={() => data && setSecciones(data.secciones)}
                >
                  <XIcon data-icon="inline-start" />
                  Cancelar
                </Button>
              ) : (
                <Button
                  render={<Link to={paths.app.coberturaMatricula.getHref()} />}
                  variant="outline"
                  color="neutral"
                  size="sm"
                  nativeButton={false}
                >
                  <XIcon data-icon="inline-start" />
                  Cerrar
                </Button>
              )}
              {secciones ? (
                <Button
                  type="button"
                  variant="fill"
                  color="primary"
                  size="sm"
                  disabled={updateConfig.isPending || changes.length === 0}
                  onClick={() => updateConfig.mutate({ establecimientoId, changes })}
                >
                  {updateConfig.isPending ? (
                    <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <CheckIcon data-icon="inline-start" />
                  )}
                  Guardar
                </Button>
              ) : null}
            </div>
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

          {varios && establecimientoId != null && (
            <Field orientation="vertical" variant="outlined" className="max-w-md gap-2">
              <FieldLabel htmlFor="colegio-configuracion">Establecimiento</FieldLabel>
              <Select
                items={Object.fromEntries(colegios.map((c) => [String(c.id), c.name]))}
                value={String(establecimientoId)}
                onValueChange={(value) => {
                  if (value) elegirColegio(Number(value))
                }}
                disabled={changes.length > 0 || updateConfig.isPending}
              >
                <SelectTrigger id="colegio-configuracion" variant="outlined" size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colegios.map((colegio) => (
                    <SelectItem key={colegio.id} value={String(colegio.id)}>
                      {colegio.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {changes.length > 0
                  ? "Guarda los cambios antes de pasar a otro establecimiento."
                  : "Cada establecimiento tiene su propia configuración; los cambios aplican al próximo formulario de matrícula que se abra."}
              </FieldDescription>
            </Field>
          )}

          {isPending && (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <SpinnerIcon className="animate-spin" />
              Cargando…
            </div>
          )}

          {isError && (
            <div className="p-10 text-center text-sm text-destructive">
              {getErrorMessage(error)}
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

    </TableScreen>
  )
}
