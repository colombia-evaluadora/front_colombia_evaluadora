import { useCallback, useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon } from "@/components/ui/icons"
import { parseDateValue } from "@/lib/date-value"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useGuardarGestion } from "@/features/gestion-estudiantil/prevencion/api/mutations/gestion-alertas"
import type { GestionAlertaDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { CampoFecha } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-fecha"
import { useOpcionesGestion } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/dialogos/use-opciones-gestion"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import { causasParaBackend, MEDIDAS_MAX } from "@/features/gestion-estudiantil/prevencion/utils/formularios-gestion"

type CausaElegida = { causa: number; estado: string }

const inicialCausas = (d: GestionAlertaDetalle): CausaElegida[] =>
  d.causas.map((c) => ({ causa: c.fk_tlv_causa ?? 0, estado: c.fk_tlv_estado_causa ? String(c.fk_tlv_estado_causa) : "" }))

const mismoConjunto = (a: CausaElegida[], b: CausaElegida[]) =>
  a.length === b.length && a.every((x, i) => x.causa === b[i].causa && x.estado === b[i].estado)

/**
 * Causas (cada una con su Estado de la causa), Medidas adoptadas y Fecha prevista (G.8.GAL.2). Se editan con
 * `puede_editar_causas` / `puede_editar_medidas`; al guardar solo viaja lo que cambió (NULL no toca, vacío vacía).
 * Las causas reservadas llegan enmascaradas para quien no ve lo sensible: se muestran como «Información reservada».
 */
export function CausasMedidas({ d }: { d: GestionAlertaDetalle }) {
  const { notify } = useNotify()
  const op = useOpcionesGestion()
  // Enmascarada = sin pk de la causa: quien no ve lo sensible no puede reescribir la lista sin borrarla.
  const reservadas = d.causas.some((c) => c.fk_tlv_causa == null)
  const editaCausas = d.banderas.puede_editar_causas && !reservadas
  const editaMedidas = d.banderas.puede_editar_medidas

  const [causas, setCausas] = useState<CausaElegida[]>(() => inicialCausas(d))
  const [medidas, setMedidas] = useState(d.medidas ?? "")
  const [fecha, setFecha] = useState<Date | undefined>(() => (d.fecha_prevista ? parseDateValue(d.fecha_prevista) : undefined))
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const original = useMemo(() => inicialCausas(d), [d])
  const fechaIso = fecha ? fechaParaBackend(fecha) : ""
  const cambioCausas = !mismoConjunto(causas, original)
  const cambioMedidas = medidas.trim() !== (d.medidas ?? "").trim()
  // El backend no vacía la fecha prevista (COALESCE): limpiarla no se envía.
  const cambioFecha = fechaIso !== "" && fechaIso !== (d.fecha_prevista ?? "").slice(0, 10)
  const sucio = (editaCausas && cambioCausas) || (editaMedidas && (cambioMedidas || cambioFecha))
  const faltaEstado = causas.some((c) => !c.estado)

  const nombreCausa = useMemo(() => new Map(op.causas.map((o) => [Number(o.value), o.label])), [op.causas])
  const etiquetaCausa = useCallback(
    (id: number) => nombreCausa.get(id) ?? d.causas.find((c) => c.fk_tlv_causa === id)?.etiqueta ?? `Causa ${id}`,
    [nombreCausa, d.causas],
  )

  const onCausas = (ids: number[]) =>
    setCausas(ids.map((id) => causas.find((c) => c.causa === id) ?? { causa: id, estado: "" }))

  const mut = useGuardarGestion({
    mutationConfig: {
      onSuccess: () => {
        notify("Gestión guardada.", { variant: "success" })
        setIntento(false)
      },
      onError: (e: Error) => setError(e),
    },
  })

  const guardar = () => {
    setIntento(true)
    setError(null)
    if (editaCausas && faltaEstado) return enfocarPrimerError()
    const c = editaCausas && cambioCausas ? causasParaBackend(causas) : { CAUSAS: null, ESTADOS: null }
    mut.mutate({
      id: d.id,
      ...c,
      MEDIDAS: editaMedidas && cambioMedidas ? medidas.trim() : null,
      FECHA_PREVISTA: editaMedidas && cambioFecha ? fechaIso : null,
    })
  }

  const cancelar = () => {
    setCausas(original)
    setMedidas(d.medidas ?? "")
    setFecha(d.fecha_prevista ? parseDateValue(d.fecha_prevista) : undefined)
    setIntento(false)
    setError(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <ErrorNoticeBanner error={error} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {reservadas ? (
          <Field orientation="vertical" variant="plain" className="gap-2">
            <FieldLabel>Causas</FieldLabel>
            <p className="text-sm">{d.causas.map((c) => c.etiqueta).join(", ")}</p>
            <FieldDescription>Hay causas reservadas: solo las edita quien ve la información sensible.</FieldDescription>
          </Field>
        ) : (
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="gestion-causas">Causas</FieldLabel>
            <ComboboxField<number, true>
              multiple
              disabled={!editaCausas}
              value={causas.map((c) => c.causa)}
              onValueChange={(v) => onCausas(v ?? [])}
            >
              <ComboboxFieldTrigger id="gestion-causas" className="w-full">
                <ComboboxFieldValue placeholder="Sin causas registradas">
                  {(ids: number[]) => (ids.length === 0 ? "Sin causas registradas" : ids.map(etiquetaCausa).join(", "))}
                </ComboboxFieldValue>
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {op.causas.map((o) => (
                  <ComboboxFieldItem key={o.value} value={Number(o.value)}>
                    {o.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
            <FieldDescription>Varias por gestión; cada una lleva su estado.</FieldDescription>
          </Field>
        )}
        <div className="flex flex-col gap-4">
          <span className="text-sm font-medium">Estado de cada causa</span>
          {causas.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : editaCausas ? (
            <div className="grid grid-cols-1 gap-4">
              {causas.map((c) => (
                <ComboOpciones
                  key={c.causa}
                  id={`gestion-estado-causa-${c.causa}`}
                  label={etiquetaCausa(c.causa)}
                  required
                  size="default"
                  todos={false}
                  placeholder="Seleccione"
                  value={c.estado}
                  options={op.estadosCausa}
                  error={intento && !c.estado ? "Elija el estado de la causa." : undefined}
                  onChange={(estado) => setCausas(causas.map((x) => (x.causa === c.causa ? { ...x, estado } : x)))}
                />
              ))}
            </div>
          ) : (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {d.causas.map((c, i) => (
                <span key={c.fk_tlv_causa ?? `reservada-${i}`} className="flex items-center gap-1">
                  {c.etiqueta}:
                  <Badge variant="soft" color={c.estado_causa_valor === "COMPROBADA" ? "success" : "info"}>
                    <span>{c.estado_causa ?? "—"}</span>
                  </Badge>
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TextoLargo
          id="gestion-medidas"
          label="Medidas adoptadas"
          rows={3}
          max={MEDIDAS_MAX}
          disabled={!editaMedidas}
          value={medidas}
          onChange={setMedidas}
        />
        <CampoFecha
          id="gestion-fecha-prevista"
          label="Fecha prevista de actuación"
          hastaHoy={false}
          disabled={!editaMedidas}
          value={fecha}
          onChange={setFecha}
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" type="button" variant="outline" color="neutral" disabled={!sucio || mut.isPending} onClick={cancelar}>
          Cancelar
        </Button>
        <Button size="sm" type="button" disabled={!sucio || mut.isPending} onClick={guardar}>
          <IconoCarga cargando={mut.isPending}>
            <FloppyDiskIcon data-icon="inline-start" />
          </IconoCarga>
          Guardar
        </Button>
      </div>
    </div>
  )
}
