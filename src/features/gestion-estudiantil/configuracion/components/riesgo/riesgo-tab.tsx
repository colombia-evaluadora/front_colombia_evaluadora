import { useMemo, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"

import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
import { TableScreenBody } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { SubjectsMultiSelect } from "@/features/establishment/academic-period/components/fields/subjects-multi-select"
import { toDigitsOnly } from "@/lib/text-input"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { useCausasReservadasQuery } from "@/features/gestion-estudiantil/configuracion/api/query/use-riesgo-servicio-query"
import type { AccesoConfiguracion, CausasReservadas } from "@/features/gestion-estudiantil/configuracion/api/types"
import { CampoNumerico, REJILLA_CAMPOS } from "@/features/gestion-estudiantil/configuracion/components/campo-numerico"
import { AccionesFormulario, EncabezadoConfiguracion } from "@/features/gestion-estudiantil/configuracion/components/encabezado-configuracion"
import { useParametrosRiesgoForm } from "@/features/gestion-estudiantil/configuracion/hooks/use-parametros-riesgo-form"
import { useParametrosQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-parametros-indicadores-query"
import type { ParametrosRiesgo } from "@/features/gestion-estudiantil/prevencion/api/types"
import { formatDecimal } from "@/features/gestion-estudiantil/prevencion/utils/indicadores"
import {
  AVISO_PARAMETROS,
  CAIDA_RA_LABEL,
  CAMPOS_ENTEROS,
  CONDICIONES,
  limpiarDecimal,
} from "@/features/gestion-estudiantil/prevencion/utils/parametros"
import { MarcoOpciones } from "@/components/marco-opciones"

/** La X de los chips del selector múltiple sigue activa aunque esté deshabilitado: sin permiso no cambia nada. */
const ignorar = () => {}

interface Props {
  tabs: ReactNode
  establecimiento: number | null
  acceso: AccesoConfiguracion
}

interface FormProps {
  parametros: ParametrosRiesgo
  causas: CausasReservadas
  establecimiento: number
  puedeEditar: boolean
  tabs: ReactNode
}

/** Formulario de G.10.RIE.1; se monta con los valores ya cargados y se vuelve a montar al guardar. */
function FormParametros({ parametros, causas, establecimiento, puedeEditar, tabs }: FormProps) {
  const f = useParametrosRiesgoForm({ parametros, causas, establecimiento })
  const avisoQ = useQuery(selectCategoryQueryOptions("AVISO_ACUDIENTE_SM_SEGUIMIENTO"))
  const causasQ = useQuery(selectCategoryQueryOptions("CAUSA_INASISTENCIA"))
  // Por VALOR: es lo que guarda el backend (AVISO_SM_SEGUIMIENTO y CAUSAS).
  const avisoOpciones = useMemo(() => (avisoQ.data ?? []).map((r) => ({ value: r.valor, label: r.nombre })), [avisoQ.data])
  const causaOpciones = useMemo(() => (causasQ.data ?? []).map((r) => ({ id: r.valor, label: r.nombre })), [causasQ.data])
  const referencia = parametros.caida_ra_referencia
  const deshabilitado = !puedeEditar

  const campoEntero = (c: (typeof CAMPOS_ENTEROS)[number]) => (
    <CampoNumerico
      key={c.campo}
      id={`parametros-${c.campo}`}
      label={c.label}
      inputMode="numeric"
      disabled={deshabilitado}
      value={f.valores[c.campo]}
      error={f.errores[c.campo]}
      ayuda={`${c.ayuda ?? ""} Predeterminado: ${c.predeterminado}.`.trim()}
      onChange={(v) => f.cambiar(c.campo, toDigitsOnly(v, 3))}
    />
  )

  return (
    <>
      <EncabezadoConfiguracion
        tabs={tabs}
        action={<AccionesFormulario guardando={f.pendiente} deshabilitado={deshabilitado} onCancelar={f.cancelar} onGuardar={f.guardar} />}
      />
      <TableScreenBody>
        <div className="flex flex-col gap-4 pt-2 pb-6">
          <ErrorNoticeBanner error={f.error} />
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertDescription>{AVISO_PARAMETROS}</AlertDescription>
          </Alert>

          <div className={REJILLA_CAMPOS}>
            {CAMPOS_ENTEROS.slice(0, 1).map(campoEntero)}
            <CampoNumerico
              id="parametros-caidaRa"
              label={CAIDA_RA_LABEL}
              inputMode="decimal"
              required={false}
              disabled={deshabilitado}
              value={f.valores.caidaRa}
              error={f.errores.caidaRa}
              ayuda={
                referencia == null
                  ? "En puntos del formato de calificación."
                  : `En puntos del formato de calificación. Vacío = proporcional al formato (${formatDecimal(referencia)}).`
              }
              onChange={(v) => f.cambiar("caidaRa", limpiarDecimal(v))}
            />
            {CAMPOS_ENTEROS.slice(1).map(campoEntero)}
          </div>

          <MarcoOpciones
            id="parametros-condiciones"
            label="Condiciones de la matrícula para alerta"
            descripcion="Señal de contexto: sale en el tablero, pero no genera aviso por sí sola."
          >
              {CONDICIONES.map((c) => (
                <label key={c.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={f.valores.condiciones.includes(c.value)}
                    disabled={deshabilitado}
                    onCheckedChange={(m) => f.marcarCondicion(c.value, Boolean(m))}
                  />
                  {c.label}
                </label>
              ))}
          </MarcoOpciones>

          <div className={REJILLA_CAMPOS}>
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor="parametros-causas">Causas de inasistencia reservadas</FieldLabel>
              <SubjectsMultiSelect
                id="parametros-causas"
                options={causaOpciones}
                value={f.reservadas}
                disabled={deshabilitado}
                placeholder="Seleccione"
                emptyMessage="No hay causas de inasistencia."
                onChange={deshabilitado ? ignorar : f.cambiarCausas}
              />
              <FieldDescription>
                Se ven como Información reservada. Las cuatro predeterminadas no se pueden quitar; solo se agregan otras.
              </FieldDescription>
            </Field>
            <div className="flex flex-col gap-2">
              <ComboOpciones
                id="parametros-aviso-sm"
                label="Aviso en salud mental (Seguimiento)"
                required
                size="default"
                todos={false}
                disabled={deshabilitado}
                value={f.valores.avisoSm}
                options={avisoOpciones}
                error={f.errores.avisoSm}
                onChange={f.cambiarAviso}
              />
              {!f.errores.avisoSm && (
                <p className="text-xs text-muted-foreground">Predeterminado: Siempre. En Crítico y Vital el aviso es siempre obligatorio.</p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>
    </>
  )
}

/** Parámetros de riesgo (§9.5, G.10.RIE.1): registro único del establecimiento, con las causas reservadas. */
export function RiesgoTab({ tabs, establecimiento, acceso }: Props) {
  const parametrosQ = useParametrosQuery(establecimiento)
  const causasQ = useCausasReservadasQuery(establecimiento)
  const error = parametrosQ.error ?? causasQ.error

  if (parametrosQ.data && causasQ.data && establecimiento != null) {
    return (
      <FormParametros
        key={JSON.stringify([parametrosQ.data, causasQ.data])}
        parametros={parametrosQ.data}
        causas={causasQ.data}
        establecimiento={establecimiento}
        puedeEditar={acceso.puede_editar && parametrosQ.data.puede_editar}
        tabs={tabs}
      />
    )
  }
  return (
    <>
      <EncabezadoConfiguracion tabs={tabs} />
      <TableScreenBody>{error ? <ErrorNoticeBanner error={error} /> : <Skeleton className="h-96 w-full" />}</TableScreenBody>
    </>
  )
}
