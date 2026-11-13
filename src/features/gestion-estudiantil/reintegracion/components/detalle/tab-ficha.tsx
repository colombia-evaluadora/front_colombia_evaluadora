import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, InfoIcon } from "@/components/ui/icons"

import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { useModificarCaso } from "@/features/gestion-estudiantil/reintegracion/api/mutations/casos"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { BloqueCaracterizacion } from "@/features/gestion-estudiantil/reintegracion/components/detalle/bloque-caracterizacion"
import { useNavegacionReintegracion } from "@/features/gestion-estudiantil/reintegracion/hooks/use-navegacion-reintegracion"
import { OBSERVACIONES_MAX } from "@/features/gestion-estudiantil/reintegracion/utils/razones"

/**
 * Pestaña Ficha (G.9.CAS.2): datos de la matrícula (solo lectura), aviso de caracterización y observaciones
 * del Profesional de trabajo social, que solo edita quien tiene `puede_modificar`.
 */
export function TabFicha({ caso: c }: { caso: CasoDetalle }) {
  const { notify } = useNotify()
  const { irActualizarCaracterizacion } = useNavegacionReintegracion()
  const d = c.ficha.datos_matricula
  const [observaciones, setObservaciones] = useState(c.ficha.observaciones_profesional ?? "")
  const puedeEditar = c.banderas.puede_modificar
  const sinCambios = observaciones === (c.ficha.observaciones_profesional ?? "")

  const mut = useModificarCaso({
    mutationConfig: { onSuccess: () => notify("Observaciones guardadas.", { variant: "success" }) },
  })

  // Modificar recibe el estado actual completo: solo cambian las observaciones.
  const guardar = () => {
    const razones = c.razones.flatMap((g) => g.razones.map((r) => r.id))
    mut.mutate({
      id: c.id,
      ALTA_COMPLEJIDAD: c.alta_complejidad,
      OBSERVACIONES: observaciones.trim() || null,
      ...(razones.length > 0
        ? { RAZONES: razones, OTRA_RAZON: c.otra_razon, FK_CAUSA_PRINCIPAL: c.causa_principal?.id ?? null }
        : {}),
    })
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Datos de la matrícula</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
          <Dato label="Domicilio">{[d.direccion, d.barrio].filter(Boolean).join(" · ")}</Dato>
          <Dato label="Población víctima del conflicto">{d.victima_conflicto ?? ""}</Dato>
          <Dato label="Estrato">{d.estrato ?? ""}</Dato>
          <Dato label="Sisbén">{d.sisben ?? ""}</Dato>
          <Dato label="Subsidio">{d.subsidio ?? ""}</Dato>
          <Dato label="Acudiente">
            {d.acudiente?.nombre
              ? `${d.acudiente.nombre}${d.acudiente.parentesco ? ` (${d.acudiente.parentesco})` : ""}`
              : ""}
          </Dato>
        </dl>
      </section>

      {c.ficha.caracterizacion ? (
        <BloqueCaracterizacion
          caracterizacion={c.ficha.caracterizacion}
          sinDiligenciar={!c.ficha.caracterizacion_disponible}
          puedeActualizar={c.banderas.puede_actualizar_caracterizacion === true}
          onActualizar={() => irActualizarCaracterizacion(c.fk_tmatricula)}
        />
      ) : (
        !c.ficha.caracterizacion_disponible && (
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">Caracterización familiar y de vivienda</h2>
            <Alert>
              <InfoIcon aria-hidden="true" />
              <AlertDescription>
                El estudiante aún no tiene la caracterización familiar y de vivienda del año.
              </AlertDescription>
            </Alert>
          </section>
        )
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Observaciones del Profesional de trabajo social</h2>
        <ErrorNoticeBanner error={mut.error} />
        <TextoLargo
          id="reintegracion-observaciones"
          label="Observaciones"
          rows={5}
          max={OBSERVACIONES_MAX}
          disabled={!puedeEditar}
          value={observaciones}
          onChange={setObservaciones}
        />
        {puedeEditar && (
          <div className="flex justify-end">
            <Button size="sm" type="button" disabled={mut.isPending || sinCambios} onClick={guardar}>
              <IconoCarga cargando={mut.isPending}>
                <FloppyDiskIcon data-icon="inline-start" />
              </IconoCarga>
              Guardar
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
