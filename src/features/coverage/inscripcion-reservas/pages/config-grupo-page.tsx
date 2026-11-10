import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { z } from "zod"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DotsSixVerticalIcon, FloppyDiskIcon, PlusIcon, XIcon } from "@/components/ui/icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { required } from "@/lib/forms/messages"
import { cn } from "@/lib/utils"
import { coberturaConfigGrupoRoute } from "@/router"

import { useModificarGrupoAdmision } from "@/features/coverage/inscripcion-reservas/api/mutations/configuracion"
import {
  nombreGrupo,
  useCatalogosConfiguracionQuery,
  useGrupoAdmisionConfigQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-configuracion-query"
import type {
  DesempateConfig,
  GrupoAdmisionConfig,
  ModoAdmision,
} from "@/features/coverage/inscripcion-reservas/api/types/configuracion"
import {
  Aviso,
  CampoLectura,
  SeccionFija,
} from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const FORM_ID = "config-grupo-form"
const fecha = (iso: string) => format(parseISO(iso), "dd/MM/yyyy")
const volverA = `${paths.app.coberturaInscritos.getHref()}?tab=configuracion`

/** Modificar grupo de admisión (Sección 3.7): cierre, modo, criterios, desempate y documentos. */
export function ConfigGrupoPage() {
  const { grupoId } = coberturaConfigGrupoRoute.useParams()
  const { data, isPending, isError, error } = useGrupoAdmisionConfigQuery(grupoId)

  if (isPending) {
    return (
      <TableScreen>
        <TableScreenBody>
          <Skeleton className="h-96 w-full" />
        </TableScreenBody>
      </TableScreen>
    )
  }
  if (isError) {
    return (
      <TableScreen>
        <TableScreenBody>
          <p className="p-10 text-center text-sm text-red">{getErrorMessage(error)}</p>
        </TableScreenBody>
      </TableScreen>
    )
  }
  return <ConfigGrupoForm key={data.id} grupo={data} />
}

function ConfigGrupoForm({ grupo }: { grupo: GrupoAdmisionConfig }) {
  const navigate = useNavigate()
  const volver = () => navigate({ to: volverA })
  const { data: catalogos } = useCatalogosConfiguracionQuery()
  const modificar = useModificarGrupoAdmision()

  const tope = grupo.menorFechaLimiteMatricula
  const schema = z.object({
    fechaCierre: z
      .string()
      .nullable()
      .refine((v) => Boolean(v), required("La fecha de cierre", { femenino: true }))
      .refine((v) => !v || v <= tope, `No puede ser posterior al ${fecha(tope)}.`),
    modoAdmision: z.enum(["MANUAL", "AUTOMATICA"]),
    criterios: z.array(z.string()),
    desempate: z.enum(["SORTEO", "ORDEN_INSCRIPCION"]),
    documentosRequeridos: z.array(z.string()),
  })

  const form = useAppForm({
    defaultValues: {
      fechaCierre: grupo.fechaCierre,
      modoAdmision: grupo.modoAdmision as ModoAdmision,
      criterios: grupo.criterios,
      desempate: grupo.desempate as DesempateConfig,
      documentosRequeridos: grupo.documentosRequeridos,
    },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) =>
      modificar.mutateAsync(
        { id: grupo.id, ...value },
        {
          onSuccess: () => {
            toast.success(`Se guardó la configuración de ${nombreGrupo(grupo)}.`)
            volver()
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      ),
  })

  const nombreCriterio = new Map((catalogos?.criterios ?? []).map((c) => [c.id, c.nombre]))

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                color="neutral"
                disabled={modificar.isPending}
                onClick={volver}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
              <Button type="submit" form={FORM_ID} disabled={modificar.isPending}>
                {modificar.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                Guardar
              </Button>
            </div>
          }
        >
          {nombreGrupo(grupo)}
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <form
          id={FORM_ID}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <SeccionFija titulo="Configuración de la admisión">
            <div className="grid gap-6">
              <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
                <CampoLectura
                  id="grupo"
                  label="Grupo de admisión"
                  value={`${grupo.establecimiento} · ${nombreGrupo(grupo)}`}
                />
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Períodos del grupo</span>
                  <div className="flex flex-wrap gap-2">
                    {grupo.periodos.map((p) => (
                      <Badge key={p} variant="soft" color="neutral" className="font-normal">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>

                <form.AppField name="fechaCierre">
                  {(f) => (
                    <f.DateField
                      label="Fecha de cierre de inscripción"
                      required
                      nullable
                      maxDate={parseISO(tope)}
                      description={`No puede ser posterior a la Fecha límite de matrícula más temprana de los períodos del grupo (${fecha(tope)}).`}
                    />
                  )}
                </form.AppField>

                <form.Field name="modoAdmision">
                  {(f) => (
                    <Opciones
                      legend="Modo de admisión"
                      value={f.state.value}
                      onChange={(v) => f.handleChange(v as ModoAdmision)}
                      opciones={[
                        ["MANUAL", "Manual"],
                        ["AUTOMATICA", "Automática"],
                      ]}
                    />
                  )}
                </form.Field>
              </div>

              <form.Field name="criterios">
                {(f) => (
                  <Criterios
                    value={f.state.value}
                    onChange={f.handleChange}
                    disponibles={(catalogos?.criterios ?? []).filter(
                      (c) => !f.state.value.includes(c.id),
                    )}
                    nombre={(id) => nombreCriterio.get(id) ?? id}
                    disabled={grupo.bloqueado}
                  />
                )}
              </form.Field>

              <form.Field name="desempate">
                {(f) => (
                  <Opciones
                    legend="Desempate"
                    value={f.state.value}
                    onChange={(v) => f.handleChange(v as DesempateConfig)}
                    disabled={grupo.bloqueado}
                    opciones={[
                      ["SORTEO", "Sorteo"],
                      ["ORDEN_INSCRIPCION", "Orden de inscripción"],
                    ]}
                  />
                )}
              </form.Field>

              <form.Field name="documentosRequeridos">
                {(f) => (
                  <fieldset className="grid gap-3">
                    <legend className="mb-3 text-sm font-medium">
                      Documentos requeridos para admitir
                    </legend>
                    {(catalogos?.documentos ?? []).map((d) => {
                      const marcado = f.state.value.includes(d.id)
                      return (
                        <label
                          key={d.id}
                          className="flex w-fit cursor-pointer items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={marcado}
                            onCheckedChange={(c) =>
                              f.handleChange(
                                c
                                  ? [...f.state.value, d.id]
                                  : f.state.value.filter((x) => x !== d.id),
                              )
                            }
                          />
                          {d.nombre}
                        </label>
                      )
                    })}
                  </fieldset>
                )}
              </form.Field>

              <Aviso tono="info">
                Después del sorteo o de la primera admisión ya no se pueden cambiar los criterios ni
                el desempate.
              </Aviso>
              <p className="text-xs text-muted-foreground">
                Los campos marcados con * son obligatorios
              </p>
            </div>
          </SeccionFija>
        </form>
      </TableScreenBody>
    </TableScreen>
  )
}

export function Opciones({
  legend,
  value,
  onChange,
  opciones,
  disabled,
}: {
  legend: string
  value: string
  onChange: (value: string) => void
  opciones: [string, string][]
  disabled?: boolean
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-3 text-sm font-medium">
        {legend} <span className="text-red">*</span>
      </legend>
      <RadioGroup
        className="flex flex-wrap gap-6"
        value={value}
        onValueChange={(v) => onChange(String(v))}
        disabled={disabled}
      >
        {opciones.map(([v, label]) => (
          <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
            <RadioGroupItem value={v} />
            {label}
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  )
}

/** Criterios de prioridad: el orden de la lista es el orden de prioridad (se arrastra). */
function Criterios({
  value,
  onChange,
  disponibles,
  nombre,
  disabled,
}: {
  value: string[]
  onChange: (value: string[]) => void
  disponibles: { id: string; nombre: string }[]
  nombre: (id: string) => string
  disabled: boolean
}) {
  const [arrastrado, setArrastrado] = useState<number | null>(null)
  const [abierto, setAbierto] = useState(false)

  function mover(desde: number, hasta: number) {
    if (desde === hasta) return
    const lista = [...value]
    const [item] = lista.splice(desde, 1)
    lista.splice(hasta, 0, item)
    onChange(lista)
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Criterios de prioridad</span>
        <Popover open={abierto} onOpenChange={setAbierto}>
          <PopoverTrigger
            render={
              <Button size="sm" disabled={disabled || disponibles.length === 0}>
                <PlusIcon data-icon="inline-start" />
                Agregar criterio
              </Button>
            }
          />
          <PopoverContent align="end" className="grid w-72 gap-1 p-1">
            {disponibles.map((c) => (
              <button
                key={c.id}
                type="button"
                className="rounded-sm px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                onClick={() => {
                  onChange([...value, c.id])
                  setAbierto(false)
                }}
              >
                {c.nombre}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {value.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Sin criterios: la admisión sigue solo el desempate.
        </p>
      ) : (
        <ol className="grid gap-2">
          {value.map((id, i) => (
            <li
              key={id}
              draggable={!disabled}
              onDragStart={() => setArrastrado(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (arrastrado != null) mover(arrastrado, i)
                setArrastrado(null)
              }}
              onDragEnd={() => setArrastrado(null)}
              className={cn(
                "flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-sm",
                !disabled && "cursor-grab",
                arrastrado === i && "opacity-50",
              )}
            >
              <DotsSixVerticalIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1">
                {i + 1}. {nombre(id)}
              </span>
              {!disabled && (
                <Button
                  variant="link"
                  size="sm"
                  aria-label={`Quitar ${nombre(id)}`}
                  onClick={() => onChange(value.filter((x) => x !== id))}
                >
                  <XIcon data-icon="inline-start" />
                  Quitar
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-muted-foreground">
        Solo criterios activos. El orden de la lista es el orden de prioridad.
      </p>
    </div>
  )
}
