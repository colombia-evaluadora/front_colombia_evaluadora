import { useEffect, useState, type ReactNode } from "react"

import { DatePicker } from "@/components/date-picker"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { CaretDownIcon, CaretRightIcon, FloppyDiskIcon, InfoIcon, SpinnerIcon } from "@/components/ui/icons"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage } from "@/lib/api-client"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import {
  MENU_ACTUALIZACION,
  useConfiguracionQuery,
  useGuardarConfiguracion,
} from "@/features/coverage/actualizacion-datos/api/actualizacion"
import type { CampoActualizable, ConfiguracionActualizacion } from "@/features/coverage/actualizacion-datos/api/types"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

type Perfil = "acudiente" | "estudiante"

function Ayuda({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex align-middle text-muted-foreground" />}>
        <InfoIcon className="size-4" aria-label="Ayuda" />
      </TooltipTrigger>
      <TooltipContent className="max-w-72">{children}</TooltipContent>
    </Tooltip>
  )
}

/** Bloques en el orden en que llegan, con sus campos. */
function agrupar(campos: CampoActualizable[]) {
  const bloques = new Map<string, CampoActualizable[]>()
  for (const c of campos) bloques.set(c.bloque, [...(bloques.get(c.bloque) ?? []), c])
  return [...bloques]
}

/** Casilla de un perfil: «—» si el perfil no admite ningún campo; indeterminada si solo algunos están marcados. */
function Casilla({
  campos,
  perfil,
  etiqueta,
  disabled,
  onChange,
}: {
  campos: CampoActualizable[]
  perfil: Perfil
  etiqueta: string
  disabled: boolean
  onChange: (valor: boolean) => void
}) {
  const admitidos = campos.filter((c) => c[perfil] !== null)
  if (admitidos.length === 0)
    return (
      <span className="text-muted-foreground" title="Este perfil no puede actualizar el bloque">
        —
      </span>
    )
  const marcados = admitidos.filter((c) => c[perfil]).length
  return (
    <Checkbox
      aria-label={`${etiqueta}: ${perfil === "acudiente" ? "Acudiente" : "Estudiante"}`}
      checked={marcados === admitidos.length}
      indeterminate={marcados > 0 && marcados < admitidos.length}
      disabled={disabled}
      onCheckedChange={(v) => onChange(!!v)}
    />
  )
}

const celda = "px-3 py-3 text-center"

/**
 * Pestaña Configuración (C.6.CFG.1; Sección 2.19, Regla 69): un registro por
 * establecimiento para todas sus Sedes y Jornadas. Con solo acceso se ve en solo lectura.
 */
export function ConfiguracionTab({ pestanas }: { pestanas: ReactNode }) {
  const { data, isPending, error } = useConfiguracionQuery()
  const { puedeEditar } = useMenuPermission(MENU_ACTUALIZACION)
  const guardar = useGuardarConfiguracion()
  const { notify } = useNotify()
  const [form, setForm] = useState<ConfiguracionActualizacion | null>(null)
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set())
  const [errorGuardar, setErrorGuardar] = useState<unknown>(null)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const inicio = form?.fechaInicio ? parseDateValue(form.fechaInicio) : undefined
  const cierre = form?.fechaCierre ? parseDateValue(form.fechaCierre) : undefined
  const errorCierre = inicio && cierre && cierre < inicio ? "La fecha de cierre no puede ser anterior a la fecha de inicio." : undefined
  const sucio = Boolean(form && data && JSON.stringify(form) !== JSON.stringify(data))
  const soloLectura = !puedeEditar || guardar.isPending

  const marcar = (codigos: string[], perfil: Perfil, valor: boolean) =>
    setForm((f) => f && { ...f, campos: f.campos.map((c) => (codigos.includes(c.codigo) && c[perfil] !== null ? { ...c, [perfil]: valor } : c)) })

  function onGuardar() {
    if (!form || errorCierre) return
    setErrorGuardar(null)
    guardar.mutate(form, {
      onSuccess: () => notify("Se guardó la configuración de la actualización de datos.", { variant: "success" }),
      onError: setErrorGuardar,
    })
  }

  const acciones = puedeEditar ? (
    <div className="flex gap-2">
      <Button type="button" variant="outline" color="neutral" size="sm" disabled={!sucio || guardar.isPending} onClick={() => data && setForm(data)}>
        Cancelar
      </Button>
      <Button type="button" variant="fill" color="primary" size="sm" disabled={!form || guardar.isPending} onClick={onGuardar}>
        {guardar.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FloppyDiskIcon data-icon="inline-start" />}
        Guardar
      </Button>
    </div>
  ) : null

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle action={acciones}>Actualización de datos</TableScreenTitle>
        {pestanas}
      </TableScreenHeader>
      <TableScreenBody>
        {isPending || !form ? (
          error ? (
            <p className="text-sm text-red">{getErrorMessage(error)}</p>
          ) : (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <SpinnerIcon className="animate-spin" aria-hidden />
              Cargando…
            </div>
          )
        ) : (
          <div className="grid gap-6">
            <NoticeOutlet />
            <ErrorNoticeBanner error={errorGuardar} />
            <div className="flex flex-wrap items-start gap-6">
              <div className="grid gap-2">
                <span className="text-sm" id="actualizacion-activo">
                  <span data-required-mark="">*</span> Actualización de datos{" "}
                  <Ayuda>Abre o cierra la ventana en la que el acudiente y el estudiante actualizan sus datos desde Mi cuenta.</Ayuda>
                </span>
                <Switch
                  aria-labelledby="actualizacion-activo"
                  checked={form.activo}
                  disabled={soloLectura}
                  onCheckedChange={(v) => setForm({ ...form, activo: v })}
                />
              </div>
              <Field variant="outlined" className="w-44 gap-2">
                <FieldLabel htmlFor="actualizacion-inicio">Fecha de inicio</FieldLabel>
                <DatePicker
                  id="actualizacion-inicio"
                  mode="date"
                  value={inicio}
                  maxDate={cierre}
                  disabled={soloLectura}
                  onChange={(d) => setForm({ ...form, fechaInicio: d ? formatDateValue(d) : null })}
                />
              </Field>
              <Field variant="outlined" className="w-44 gap-2" data-invalid={Boolean(errorCierre) || undefined}>
                <FieldLabel htmlFor="actualizacion-cierre">Fecha de cierre</FieldLabel>
                <DatePicker
                  id="actualizacion-cierre"
                  mode="date"
                  value={cierre}
                  minDate={inicio}
                  disabled={soloLectura}
                  aria-invalid={Boolean(errorCierre) || undefined}
                  onChange={(d) => setForm({ ...form, fechaCierre: d ? formatDateValue(d) : null })}
                />
                {errorCierre ? <FieldError>{errorCierre}</FieldError> : null}
              </Field>
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium">
                      Qué pueden actualizar{" "}
                      <Ayuda>El correo siempre se puede cambiar en Mi cuenta. Los datos de identidad se piden con una solicitud de corrección.</Ayuda>
                    </th>
                    <th className={`${celda} w-32 font-medium`}>Acudiente</th>
                    <th className={`${celda} w-32 font-medium`}>Estudiante</th>
                  </tr>
                </thead>
                <tbody>
                  {agrupar(form.campos).map(([bloque, campos]) => {
                    const expandible = campos.length > 1
                    const abierto = abiertos.has(bloque)
                    const codigos = campos.map((c) => c.codigo)
                    return [
                      <tr key={bloque} className="border-t border-border">
                        <td className="px-3 py-3">
                          {expandible ? (
                            <button
                              type="button"
                              className="flex items-center gap-1 text-left"
                              aria-expanded={abierto}
                              onClick={() =>
                                setAbiertos((s) => {
                                  const n = new Set(s)
                                  if (n.has(bloque)) n.delete(bloque)
                                  else n.add(bloque)
                                  return n
                                })
                              }
                            >
                              {abierto ? <CaretDownIcon className="size-4" /> : <CaretRightIcon className="size-4" />}
                              {bloque}
                            </button>
                          ) : (
                            <span className="pl-5">{bloque}</span>
                          )}
                        </td>
                        {(["acudiente", "estudiante"] as const).map((p) => (
                          <td key={p} className={celda}>
                            <Casilla campos={campos} perfil={p} etiqueta={bloque} disabled={soloLectura} onChange={(v) => marcar(codigos, p, v)} />
                          </td>
                        ))}
                      </tr>,
                      ...(expandible && abierto
                        ? campos.map((c) => (
                            <tr key={c.codigo} className="border-t border-border">
                              <td className="py-3 pr-3 pl-12 text-muted-foreground">{c.nombre}</td>
                              {(["acudiente", "estudiante"] as const).map((p) => (
                                <td key={p} className={celda}>
                                  <Casilla campos={[c]} perfil={p} etiqueta={c.nombre} disabled={soloLectura} onChange={(v) => marcar([c.codigo], p, v)} />
                                </td>
                              ))}
                            </tr>
                          ))
                        : []),
                    ]
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
          </div>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
