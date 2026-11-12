import { useCallback } from "react"

import { DatePicker } from "@/components/date-picker"
import { TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, FloppyDiskIcon, InfoIcon } from "@/components/ui/icons"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { NivelRiesgo } from "@/features/gestion-estudiantil/prevencion/api/types"
import { NIVEL_COLOR } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import { AccionPlanItem } from "@/features/gestion-estudiantil/prevencion/components/form/accion-plan-item"
import { useOpcionesPlan } from "@/features/gestion-estudiantil/prevencion/hooks/use-opciones-plan"
import { usePlanForm, type ModoPlan } from "@/features/gestion-estudiantil/prevencion/hooks/use-plan-form"
import { OBJETIVO_MAX } from "@/features/gestion-estudiantil/prevencion/utils/formularios"

interface Props {
  modo: ModoPlan
  titulo: string
  matricula: number
  establecimiento: number | null
  /** Valoración de origen a mostrar (solo lectura). */
  origen: { fecha: string; nivelNombre: string | null; nivelValor?: string | null } | null
  /** Vuelve a donde se venía (al cancelar y al guardar). */
  onClose: () => void
}

/**
 * Pantalla de Nuevo plan y Modificar plan (G.8.TAB.6): encabezado con Cancelar y Guardar, objetivo, fechas y las
 * acciones repetibles en una sección plegable. Se monta con el catálogo de tipos ya cargado.
 */
export function PantallaPlan({ modo, titulo, matricula, establecimiento, origen, onClose }: Props) {
  const { tipos, tipoOpciones, tipoPorCodigo, responsableOpciones, responsableActual, onBuscarResponsable, estrategiaOpciones, estrategiasNoDisponibles, recordarResponsable } =
    useOpcionesPlan({ modo, matricula, establecimiento })

  const form = usePlanForm({ modo, tipoPorCodigo, responsableActual, onClose })
  const { valores: v, errores, intento, cambiarAccion } = form
  const err = (c: "objetivo" | "inicio" | "fin" | "acciones") => (intento ? errores[c] : undefined)

  const alCambiarAccion = useCallback(
    (clave: string, patch: Parameters<typeof cambiarAccion>[1]) => {
      if (patch.responsable) recordarResponsable(patch.responsable)
      cambiarAccion(clave, patch)
    },
    [cambiarAccion, recordarResponsable],
  )

  const hayReunion = v.acciones.some((a) => tipos.find((t) => t.value === a.tipo)?.codigo === "REUNION_ACUDIENTE")
  const hayErroresAcciones = intento && (Boolean(errores.acciones) || errores.porAccion.some((e) => Object.keys(e).length > 0))

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" type="button" variant="outline" color="neutral" disabled={form.pending} onClick={onClose}>
                Cancelar
              </Button>
              <Button size="sm" type="button" disabled={form.pending} onClick={form.enviar}>
                <IconoCarga cargando={form.pending}>
                  <FloppyDiskIcon data-icon="inline-start" />
                </IconoCarga>
                Guardar
              </Button>
            </div>
          }
        >
          <span className="whitespace-normal">{titulo}</span>
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-4 pb-6">
          <ErrorNoticeBanner error={form.error} />
          {origen && (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span>Valoración de origen:</span>
              <span>{formatFecha(origen.fecha)}</span>
              {origen.nivelNombre && (
                <Badge variant="soft" color={NIVEL_COLOR[(origen.nivelValor ?? "") as NivelRiesgo] ?? "muted"}>
                  <span>{origen.nivelNombre}</span>
                </Badge>
              )}
            </p>
          )}
          <TextoLargo
            id="plan-objetivo"
            label="Objetivo"
            required
            max={OBJETIVO_MAX}
            placeholder="Qué se busca lograr con el acompañamiento"
            value={v.objetivo}
            error={err("objetivo")}
            onChange={(objetivo) => form.set("objetivo", objetivo)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err("inicio")) || undefined}>
              <FieldLabel htmlFor="plan-inicio">Fecha de inicio*</FieldLabel>
              <DatePicker
                id="plan-inicio"
                value={v.inicio}
                aria-invalid={Boolean(err("inicio")) || undefined}
                onChange={(d) => form.set("inicio", d)}
              />
              {err("inicio") && <FieldError>{err("inicio")}</FieldError>}
            </Field>
            <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err("fin")) || undefined}>
              <FieldLabel htmlFor="plan-fin">Fecha de fin prevista*</FieldLabel>
              <DatePicker
                id="plan-fin"
                value={v.fin}
                minDate={v.inicio}
                aria-invalid={Boolean(err("fin")) || undefined}
                onChange={(d) => form.set("fin", d)}
              />
              {err("fin") && <FieldError>{err("fin")}</FieldError>}
            </Field>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <SeccionPlegable
              titulo={`Acciones (${v.acciones.length})`}
              forzarAbierta={hayErroresAcciones}
              contentClassName="flex flex-col gap-3 p-4"
              accion={
                <Button type="button" size="sm" variant="outline" onClick={form.agregarAccion}>
                  <ControlPointIcon data-icon="inline-start" />
                  Agregar acción
                </Button>
              }
            >
              {err("acciones") && (
                <p role="alert" data-invalid className="text-sm text-red">
                  {err("acciones")}
                </p>
              )}
              {v.acciones.map((a, i) => (
                <AccionPlanItem
                  key={a.clave}
                  numero={i + 1}
                  accion={a}
                  errores={intento ? errores.porAccion[i] : undefined}
                  tipos={tipoOpciones}
                  responsables={responsableOpciones}
                  onBuscarResponsable={onBuscarResponsable}
                  estrategias={estrategiaOpciones}
                  estrategiasNoDisponibles={estrategiasNoDisponibles}
                  desde={v.inicio}
                  hasta={v.fin}
                  puedeQuitar={v.acciones.length > 1}
                  onChange={alCambiarAccion}
                  onQuitar={form.quitarAccion}
                />
              ))}
              {hayReunion && (
                <Alert>
                  <InfoIcon aria-hidden="true" />
                  <AlertDescription>La reunión con el acudiente creará una citación por programar.</AlertDescription>
                </Alert>
              )}
            </SeccionPlegable>
          </div>
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>
    </>
  )
}
