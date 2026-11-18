import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { CampoFecha } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-fecha"
import { CampoTexto } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/campo-texto"
import { BloqueContexto } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/bloque-contexto"
import { CampoRespuesta } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/form/campo-respuesta"
import type { useAcompanamientoForm } from "@/features/gestion-estudiantil/prevencion/hooks/use-acompanamiento-form"
import {
  FUENTE_MAX,
  LUGAR_OTRO,
  OTRA_SUSTANCIA_MAX,
  OTRO_LUGAR_MAX,
  SENALES_MAX,
  SUSTANCIA_OTRA,
  TEXTO_ACOMP_MAX,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-acompanamiento"

type Form = ReturnType<typeof useAcompanamientoForm>

const GRID = "grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3"
const soloDigitos = (t: string) => t.replace(/\D/g, "").slice(0, 3)

/** Campos de Nuevo / Modificar acompañamiento por embarazo (G.8.EMB.3) o por consumo (G.8.CON.3). */
export function CamposAcompanamiento({ f }: { f: Form }) {
  const { v, set, error, selector } = f
  const conError = (...campos: Parameters<Form["error"]>[0][]) => campos.some((c) => Boolean(error(c)))

  return (
    <div className="flex flex-col gap-4 pb-6">
      <ErrorNoticeBanner error={f.errorBackend} />

      <SeccionPlegable
        encuadrada
        comoSeccion
        defaultAbierta
        titulo="Estudiante y contexto"
        forzarAbierta={conError("estudiante")}
        contentClassName="flex flex-col gap-4 px-4 py-4"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ComboOpciones
            id="acomp-estudiante"
            label="Estudiante de referencia"
            required
            size="default"
            todos={false}
            placeholder="Buscar estudiante"
            disabled={f.editar}
            value={f.editar ? String(f.matricula ?? "") : selector.estudiante}
            options={
              f.editar && f.detalle
                ? [
                    {
                      value: String(f.matricula),
                      label: `${f.detalle.contexto.estudiante_nombre ?? ""} · ${f.detalle.contexto.grado_grupo ?? ""}`,
                    },
                  ]
                : selector.opciones
            }
            description="Matrículas dentro de su alcance; una matrícula retirada no impide dar seguimiento."
            error={error("estudiante")}
            onInputChange={selector.onBuscar}
            onChange={selector.elegir}
          />
          {f.tipo === "EMBARAZO" && (
            <ComboOpciones
              id="acomp-atencion"
              label="Atención de origen"
              size="default"
              todos="Sin atención de origen"
              placeholder={f.matricula ? "Seleccione" : "Elija un estudiante primero"}
              disabled={!f.matricula}
              value={v.atencion}
              options={f.atencionOpciones}
              description="Opcional. Atenciones de orientación del estudiante; se elige si el acompañamiento nace de una atención."
              onChange={(atencion) => set({ atencion })}
            />
          )}
        </div>
        <BloqueContexto contexto={f.contexto} />
      </SeccionPlegable>

      <SeccionPlegable
        encuadrada
        comoSeccion
        defaultAbierta
        titulo={f.tipo === "EMBARAZO" ? "Situación y fuente" : "Información y fuente"}
        forzarAbierta={conError(
          "situacion",
          "fechaConocimiento",
          "responsable",
          "semanasGestacion",
          "fuenteGestacion",
          "fechaInfoGestacion",
          "progenitorConocido",
          "acompProgenitor",
          "apoyoAcudiente",
          "origen",
          "fuenteInfo",
          "fechaInfo",
          "sustancia",
          "otraSustancia",
          "lugar",
          "otroLugar",
          "semanasConsumo",
          "senalesRiesgo",
          "semanasSenales",
        )}
        contentClassName="flex flex-col gap-4 px-4 py-4"
      >
        <div className={GRID}>
          {f.tipo === "EMBARAZO" && (
            <ComboOpciones
              id="acomp-situacion"
              label="Situación de acompañamiento"
              required
              size="default"
              todos={false}
              placeholder="Seleccione"
              value={v.situacion}
              options={f.listas.situaciones}
              error={error("situacion")}
              onChange={(situacion) => set({ situacion })}
            />
          )}
          <CampoFecha
            id="acomp-fecha-conocimiento"
            label="Fecha de conocimiento"
            required
            value={v.fechaConocimiento}
            error={error("fechaConocimiento")}
            onChange={(fechaConocimiento) => set({ fechaConocimiento })}
          />
          <ComboOpciones
            id="acomp-responsable"
            label="Responsable"
            required
            size="default"
            todos={false}
            placeholder={f.matricula ? "Seleccione" : "Elija un estudiante primero"}
            disabled={!f.matricula}
            value={v.responsable}
            options={f.responsableOpciones}
            description="Profesional de orientación con rol activo en la Sede y Jornada."
            error={error("responsable")}
            onInputChange={f.onBuscarResponsable}
            onChange={(responsable) => set({ responsable })}
          />
        </div>

        {f.tipo === "EMBARAZO" ? <CamposEmbarazo f={f} /> : <CamposConsumo f={f} />}
      </SeccionPlegable>

      <SeccionPlegable
        encuadrada
        comoSeccion
        defaultAbierta
        titulo={f.tipo === "EMBARAZO" ? "Necesidades y acuerdos de continuidad educativa" : "Descripción y acuerdos"}
        forzarAbierta={conError("descripcion", "acuerdos")}
        contentClassName="flex flex-col gap-4 px-4 py-4"
      >
        <TextoLargo
          id="acomp-descripcion"
          label={f.tipo === "EMBARAZO" ? "Descripción y necesidades de continuidad" : "Descripción de lo observado o informado"}
          required
          max={TEXTO_ACOMP_MAX}
          rows={4}
          value={v.descripcion}
          error={error("descripcion")}
          onChange={(descripcion) => set({ descripcion })}
        />
        <TextoLargo
          id="acomp-acuerdos"
          label={f.tipo === "EMBARAZO" ? "Acuerdos de continuidad educativa" : "Necesidades y acuerdos de continuidad educativa"}
          max={TEXTO_ACOMP_MAX}
          rows={4}
          value={v.acuerdos}
          error={error("acuerdos")}
          onChange={(acuerdos) => set({ acuerdos })}
        />
      </SeccionPlegable>

      <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
    </div>
  )
}

function CamposEmbarazo({ f }: { f: Form }) {
  const { v, set, error } = f
  const conGestacion = v.semanasGestacion.trim() !== "" || v.fechaParto != null
  return (
    <>
      <div className={GRID}>
        <CampoTexto
          id="acomp-semanas-gestacion"
          label="Semanas de gestación informadas"
          inputMode="numeric"
          value={v.semanasGestacion}
          ayuda="Información reportada; no se calcula con la fecha."
          error={error("semanasGestacion")}
          onChange={(t) => set({ semanasGestacion: soloDigitos(t) })}
        />
        <CampoFecha
          id="acomp-fecha-parto"
          label="Fecha estimada de parto informada"
          hastaHoy={false}
          value={v.fechaParto}
          onChange={(fechaParto) => set({ fechaParto })}
        />
      </div>
      <div className={GRID}>
        <CampoTexto
          id="acomp-fuente-gestacion"
          label="Fuente de la información de gestación"
          required={conGestacion}
          max={FUENTE_MAX}
          className="lg:col-span-2"
          value={v.fuenteGestacion}
          ayuda="Obligatoria si se registran semanas o fecha estimada."
          error={error("fuenteGestacion")}
          onChange={(fuenteGestacion) => set({ fuenteGestacion })}
        />
        <CampoFecha
          id="acomp-fecha-info-gestacion"
          label="Fecha de la información"
          required={conGestacion}
          value={v.fechaInfoGestacion}
          error={error("fechaInfoGestacion")}
          onChange={(fechaInfoGestacion) => set({ fechaInfoGestacion })}
        />
      </div>
      <div className={GRID}>
        <CampoRespuesta
          id="acomp-progenitor-conocido"
          label="Progenitor conocido"
          opciones={f.listas.respuestas}
          value={v.progenitorConocido}
          error={error("progenitorConocido")}
          onChange={(progenitorConocido) => set({ progenitorConocido })}
        />
        <CampoRespuesta
          id="acomp-acomp-progenitor"
          label="Acompañamiento del progenitor"
          opciones={f.listas.respuestas}
          value={v.acompProgenitor}
          error={error("acompProgenitor")}
          onChange={(acompProgenitor) => set({ acompProgenitor })}
        />
        <CampoRespuesta
          id="acomp-apoyo-acudiente"
          label="Apoyo del acudiente"
          opciones={f.listas.respuestas}
          value={v.apoyoAcudiente}
          error={error("apoyoAcudiente")}
          onChange={(apoyoAcudiente) => set({ apoyoAcudiente })}
        />
      </div>
    </>
  )
}

/** Lo que necesitan los campos de consumo: también los usa Vincular reporte al abrir uno nuevo. */
export type FormConsumo = Pick<Form, "v" | "set" | "error" | "codigos"> & {
  listas: Pick<Form["listas"], "origenes" | "sustancias" | "lugares">
}

/** Campos propios del acompañamiento por consumo (G.8.CON.3). */
export function CamposConsumo({ f }: { f: FormConsumo }) {
  const { v, set, error, codigos } = f
  return (
    <>
      <div className={GRID}>
        <ComboOpciones
          id="acomp-origen"
          label="Origen de la información"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          value={v.origen}
          options={f.listas.origenes}
          error={error("origen")}
          onChange={(origen) => set({ origen })}
        />
        <CampoTexto
          id="acomp-fuente-info"
          label="Fuente de la información"
          required
          max={FUENTE_MAX}
          value={v.fuenteInfo}
          error={error("fuenteInfo")}
          onChange={(fuenteInfo) => set({ fuenteInfo })}
        />
        <CampoFecha
          id="acomp-fecha-info"
          label="Fecha de la información"
          required
          value={v.fechaInfo}
          error={error("fechaInfo")}
          onChange={(fechaInfo) => set({ fechaInfo })}
        />
      </div>
      <div className={GRID}>
        <ComboOpciones
          id="acomp-sustancia"
          label="Sustancia presunta"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          value={v.sustancia}
          options={f.listas.sustancias}
          error={error("sustancia")}
          onChange={(sustancia) => set({ sustancia })}
        />
        {codigos.sustancia === SUSTANCIA_OTRA && (
          <CampoTexto
            id="acomp-otra-sustancia"
            label="Otra sustancia informada"
            required
            max={OTRA_SUSTANCIA_MAX}
            value={v.otraSustancia}
            error={error("otraSustancia")}
            onChange={(otraSustancia) => set({ otraSustancia })}
          />
        )}
      </div>
      <div className={GRID}>
        <ComboOpciones
          id="acomp-lugar"
          label="Lugar informado"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          value={v.lugar}
          options={f.listas.lugares}
          error={error("lugar")}
          onChange={(lugar) => set({ lugar })}
        />
        {codigos.lugar === LUGAR_OTRO && (
          <CampoTexto
            id="acomp-otro-lugar"
            label="Otro lugar"
            required
            max={OTRO_LUGAR_MAX}
            value={v.otroLugar}
            error={error("otroLugar")}
            onChange={(otroLugar) => set({ otroLugar })}
          />
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CampoTexto
          id="acomp-semanas-consumo"
          label="Tiempo de consumo informado (semanas)"
          inputMode="numeric"
          value={v.semanasConsumo}
          ayuda="Vacío si se desconoce; cero no equivale a desconocido."
          error={error("semanasConsumo")}
          onChange={(t) => set({ semanasConsumo: soloDigitos(t) })}
        />
        <CampoTexto
          id="acomp-semanas-senales"
          label="Tiempo de señales de riesgo informado (semanas)"
          inputMode="numeric"
          value={v.semanasSenales}
          ayuda="Vacío si se desconoce."
          error={error("semanasSenales")}
          onChange={(t) => set({ semanasSenales: soloDigitos(t) })}
        />
      </div>
      <TextoLargo
        id="acomp-senales-riesgo"
        label="Señales de riesgo informadas"
        max={SENALES_MAX}
        rows={3}
        value={v.senalesRiesgo}
        error={error("senalesRiesgo")}
        onChange={(senalesRiesgo) => set({ senalesRiesgo })}
      />
    </>
  )
}
