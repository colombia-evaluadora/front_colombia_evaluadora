import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { CampoCasillas } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-casillas"
import { CampoLista } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-lista"
import { CampoTexto } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/campo-texto"
import type { FormularioCaracterizacion } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizacion-form"
import {
  codigoDeOpcion,
  CODIGO,
  esOtraVivienda,
  MAX,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-caracterizacion"

/** Vivienda y servicios: tipo, tenencia, cambio de domicilio y servicios básicos (Internet sale de la disponibilidad del hogar). */
export function SeccionVivienda({ f }: { f: FormularioCaracterizacion }) {
  const { v, set, listas } = f
  const otra = esOtraVivienda(listas.TIPO_VIVIENDA, v.tipoVivienda) || esOtraVivienda(listas.TENENCIA_VIVIENDA, v.tenencia)
  const hayServicios = codigoDeOpcion(listas.INFO_SERVICIOS_VIVIENDA, v.infoServicios) === CODIGO.serviciosIdentificados
  // Con Internet en el hogar = Sí, el servicio Internet aparece marcado y no se captura dos veces.
  const internetEnHogar = codigoDeOpcion(listas.RESPUESTA_DISPONIBILIDAD, v.internetHogar) === CODIGO.si
  const vinculadas = internetEnHogar
    ? (listas.SERVICIO_BASICO_VIVIENDA ?? []).filter((o) => o.codigo === CODIGO.internet).map((o) => o.value)
    : []

  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo="Vivienda y servicios"
      forzarAbierta={f.seccionConError("vivienda")}
      contentClassName="flex flex-col gap-4 px-4 py-4"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <CampoLista
          id="vivienda-tipo"
          label="Tipo de vivienda"
          required
          opciones={listas.TIPO_VIVIENDA}
          value={v.tipoVivienda}
          disabled={f.lectura}
          error={f.error("vivienda-tipo")}
          onChange={(tipoVivienda) => set({ tipoVivienda })}
        />
        <CampoLista
          id="vivienda-tenencia"
          label="Tenencia de la vivienda"
          required
          opciones={listas.TENENCIA_VIVIENDA}
          value={v.tenencia}
          disabled={f.lectura}
          error={f.error("vivienda-tenencia")}
          onChange={(tenencia) => set({ tenencia })}
        />
        <CampoLista
          id="vivienda-frecuencia-domicilio"
          label="Frecuencia de cambio de domicilio"
          opciones={listas.FRECUENCIA_DOMICILIO}
          value={v.frecuenciaDomicilio}
          disabled={f.lectura}
          onChange={(frecuenciaDomicilio) => set({ frecuenciaDomicilio })}
        />
        {otra && (
          <div className="lg:col-span-2 xl:col-span-3">
            <CampoTexto
              id="vivienda-descripcion-otra"
              label="Descripción de otra vivienda o tenencia"
              required
              max={MAX.descripcionOtra}
              value={v.descripcionOtra}
              disabled={f.lectura}
              error={f.error("vivienda-descripcion-otra")}
              onChange={(descripcionOtra) => set({ descripcionOtra })}
            />
          </div>
        )}
        <CampoLista
          key={`info-servicios-${f.reinicios}`}
          id="vivienda-info-servicios"
          className="gap-2 lg:col-span-2 xl:col-span-1"
          label="Información de servicios básicos"
          required
          opciones={listas.INFO_SERVICIOS_VIVIENDA}
          value={v.infoServicios}
          disabled={f.lectura}
          error={f.error("vivienda-info-servicios")}
          onChange={f.cambiarInfoServicios}
        />
      </div>
      {hayServicios && (
        <CampoCasillas
          id="vivienda-servicios"
          label="Servicios básicos"
          required
          opciones={listas.SERVICIO_BASICO_VIVIENDA}
          value={v.servicios}
          vinculadas={vinculadas}
          disabled={f.lectura}
          ayuda="Al menos uno. Internet se marca según la disponibilidad de internet en el hogar."
          error={f.error("vivienda-servicios")}
          onChange={(servicios) => set({ servicios })}
        />
      )}
    </SeccionPlegable>
  )
}
