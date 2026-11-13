import { useCallback, useMemo, useState, type ReactNode } from "react"

import { TableScreenBody, TableScreenHeader, TableScreenTabs, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, InfoIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useGuardarParametros } from "@/features/gestion-estudiantil/prevencion/api/mutations/parametros"
import { useParametrosQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-parametros-indicadores-query"
import type { ParametrosRiesgo } from "@/features/gestion-estudiantil/prevencion/api/types"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { formatDecimal } from "@/features/gestion-estudiantil/prevencion/utils/indicadores"
import {
  AVISO_PARAMETROS,
  CAIDA_RA_LABEL,
  CAMPOS_ENTEROS,
  CONDICIONES,
  hayErroresParametros,
  limpiarDecimal,
  parametrosParaBackend,
  validarParametros,
  valoresIniciales,
  type CampoParametro,
  type ValoresParametros,
} from "@/features/gestion-estudiantil/prevencion/utils/parametros"
import { toDigitsOnly } from "@/lib/text-input"

interface CampoProps {
  id: string
  label: string
  value: string
  inputMode: "numeric" | "decimal"
  ayuda: ReactNode
  placeholder?: string
  required?: boolean
  error?: string
  onChange: (value: string) => void
}

function CampoNumerico({ id, label, value, inputMode, ayuda, placeholder, required = true, error, onChange }: CampoProps) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && "*"}
      </FieldLabel>
      <Input
        id={id}
        inputMode={inputMode}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        aria-invalid={Boolean(error) || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <FieldError>{error}</FieldError> : <FieldDescription>{ayuda}</FieldDescription>}
    </Field>
  )
}

interface FormProps {
  parametros: ParametrosRiesgo
  establecimiento: number
  tabs: ReactNode
}

/** Formulario de G.10.RIE.1; se monta con los valores ya cargados y se vuelve a montar al guardar. */
function FormParametros({ parametros, establecimiento, tabs }: FormProps) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const inicial = useMemo(() => valoresIniciales(parametros), [parametros])
  const [valores, setValores] = useState<ValoresParametros>(inicial)
  const errores = useMemo(() => validarParametros(valores), [valores])
  const guardar = useGuardarParametros({
    mutationConfig: {
      onSuccess: () => {
        s.setError(null)
        notify("Parámetros de riesgo guardados.")
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const cambiar = useCallback(
    (campo: CampoParametro, valor: string) => setValores((v) => ({ ...v, [campo]: valor })),
    [],
  )
  const marcar = useCallback(
    (codigo: string, marcada: boolean) =>
      setValores((v) => ({
        ...v,
        condiciones: marcada ? [...v.condiciones, codigo] : v.condiciones.filter((c) => c !== codigo),
      })),
    [],
  )
  const cancelar = useCallback(() => {
    setValores(inicial)
    s.setIntento(false)
    s.setError(null)
  }, [inicial, s])
  const enviar = useCallback(() => {
    s.setIntento(true)
    s.setError(null)
    if (hayErroresParametros(errores)) {
      enfocarPrimerError()
      return
    }
    guardar.mutate(parametrosParaBackend(establecimiento, valores))
  }, [s, errores, guardar, establecimiento, valores])

  const err = (c: CampoParametro) => (s.intento ? errores[c] : undefined)
  const referencia = parametros.caida_ra_referencia

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" type="button" variant="outline" color="neutral" disabled={guardar.isPending} onClick={cancelar}>
                Cancelar
              </Button>
              <Button size="sm" type="button" disabled={guardar.isPending} onClick={enviar}>
                <IconoCarga cargando={guardar.isPending}>
                  <FloppyDiskIcon data-icon="inline-start" />
                </IconoCarga>
                Guardar
              </Button>
            </div>
          }
        >
          Prevención y retención
        </TableScreenTitle>
        <TableScreenTabs>{tabs}</TableScreenTabs>
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-4 pb-6">
          <ErrorNoticeBanner error={s.error} />
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertDescription>{AVISO_PARAMETROS}</AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 items-start gap-x-4 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            {CAMPOS_ENTEROS.slice(0, 1).map((c) => (
              <CampoNumerico
                key={c.campo}
                id={`parametros-${c.campo}`}
                label={c.label}
                inputMode="numeric"
                value={valores[c.campo]}
                error={err(c.campo)}
                ayuda={`${c.ayuda ?? ""} Predeterminado: ${c.predeterminado}.`.trim()}
                onChange={(v) => cambiar(c.campo, toDigitsOnly(v, 3))}
              />
            ))}
            <CampoNumerico
              id="parametros-caidaRa"
              label={CAIDA_RA_LABEL}
              inputMode="decimal"
              required={false}
              value={valores.caidaRa}
              placeholder={referencia == null ? undefined : formatDecimal(referencia)}
              error={err("caidaRa")}
              ayuda={
                referencia == null
                  ? "En puntos del Formato de calificación."
                  : `En puntos del Formato de calificación. Vacío = proporcional al formato (${formatDecimal(referencia)}).`
              }
              onChange={(v) => cambiar("caidaRa", limpiarDecimal(v))}
            />
            {CAMPOS_ENTEROS.slice(1).map((c) => (
              <CampoNumerico
                key={c.campo}
                id={`parametros-${c.campo}`}
                label={c.label}
                inputMode="numeric"
                value={valores[c.campo]}
                error={err(c.campo)}
                ayuda={`${c.ayuda ?? ""} Predeterminado: ${c.predeterminado}.`.trim()}
                onChange={(v) => cambiar(c.campo, toDigitsOnly(v, 3))}
              />
            ))}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm">Condiciones de la matrícula para alerta</legend>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
              {CONDICIONES.map((c) => (
                <label key={c.value} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={valores.condiciones.includes(c.value)} onCheckedChange={(m) => marcar(c.value, Boolean(m))} />
                  {c.label}
                </label>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Señal de contexto: sale en el tablero, pero no genera aviso por sí sola. Sin ninguna marcada, la señal no se calcula.
            </p>
          </fieldset>
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>
    </>
  )
}

/** Pestaña «Parámetros de riesgo» (§9.5, G.10.RIE.1): registro único del establecimiento, solo para quien lo administra. */
export function ParametrosTab({ tabs }: { tabs: ReactNode }) {
  const { establecimientoId } = useAmbitoPrevencion("")
  const q = useParametrosQuery(establecimientoId)

  if (q.data && establecimientoId != null) {
    return <FormParametros key={JSON.stringify(q.data)} parametros={q.data} establecimiento={establecimientoId} tabs={tabs} />
  }
  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle>Prevención y retención</TableScreenTitle>
        <TableScreenTabs>{tabs}</TableScreenTabs>
      </TableScreenHeader>
      <TableScreenBody>
        {q.isError ? <ErrorNoticeBanner error={q.error} className="m-6" /> : <Skeleton className="m-6 h-96" />}
      </TableScreenBody>
    </>
  )
}
