import { useState } from "react"
import type { ReactNode } from "react"
import { useForm } from "@tanstack/react-form"
import { z } from "zod"

import { NoticeBanner } from "@/components/notice/notice-banner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/api-client"
import {
  FUNCION_LABEL,
  POBLACION_LABEL,
  aIso,
  aLocal,
  useAccionProceso,
  useCursosQuery,
  useJornadasQuery,
  usePersonasQuery,
} from "@/features/comunicaciones/procesos/api/procesos"
import type { EleccionProceso, Funcion, Proceso } from "@/features/comunicaciones/procesos/api/procesos"

/** Marco común: error en banner local mientras está abierto; el éxito lo muestra la página. */
function Marco({ titulo, abierto, onCerrar, error, pie, children }: {
  titulo: string
  abierto: boolean
  onCerrar: () => void
  error: string | null
  pie: ReactNode
  children: ReactNode
}) {
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        {error && <NoticeBanner onClose={() => {}} variant="error" notice={{ id: 0, message: error }} />}
        <div className="flex flex-col gap-4">{children}</div>
        <DialogFooter>{pie}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Acción que pide un texto obligatorio (motivo, respuesta...) o solo confirmar. */
export function DialogoTexto({ titulo, etiqueta, descripcion, accion, metodo, onCerrar, onHecho, campo = "MOTIVO", extra }: {
  titulo: string
  etiqueta?: string
  descripcion?: string
  accion: string
  metodo?: "patch"
  onCerrar: () => void
  onHecho: (mensaje: string) => void
  campo?: string
  extra?: Record<string, unknown>
}) {
  const [texto, setTexto] = useState("")
  const m = useAccionProceso()
  const [error, setError] = useState<string | null>(null)
  return (
    <Marco titulo={titulo} abierto onCerrar={onCerrar} error={error} pie={
      <>
        <Button variant="outline" color="neutral" onClick={onCerrar}>Cancelar</Button>
        <Button
          disabled={m.isPending || (Boolean(etiqueta) && !texto.trim())}
          onClick={() => m.mutate({ ruta: accion, metodo, cuerpo: { ...extra, ...(etiqueta ? { [campo]: texto.trim() } : {}) } }, {
            onSuccess: () => onHecho(`${titulo}: listo.`),
            onError: (e) => setError(getErrorMessage(e)),
          })}
        >
          Confirmar
        </Button>
      </>
    }>
      {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
      {etiqueta && (
        <Field>
          <FieldLabel>{etiqueta}</FieldLabel>
          <Textarea value={texto} maxLength={1000} onChange={(e) => setTexto(e.target.value)} />
        </Field>
      )}
    </Marco>
  )
}

const procesoSchema = z.object({
  NOMBRE: z.string().trim().min(1, "Escribe el nombre.").max(150),
  OBJETO: z.string().trim().min(1, "Escribe el objeto.").max(500),
  REGLAMENTO: z.string(),
  MOTIVO: z.string(),
})

const FUNCIONES = Object.keys(FUNCION_LABEL) as Funcion[]

/** M.4.PRO.1. Publicado, un cambio crea versión de la convocatoria y exige motivo. */
export function DialogoProceso({ proceso, onCerrar, onHecho }: { proceso?: Proceso; onCerrar: () => void; onHecho: (m: string) => void }) {
  const m = useAccionProceso()
  const [error, setError] = useState<string | null>(null)
  const personas = usePersonasQuery("FUNCIONARIOS")
  const [funciones, setFunciones] = useState<{ USUARIO: number; FUNCION: Funcion }[]>(
    proceso?.funciones.map((f) => ({ USUARIO: f.usuario, FUNCION: f.funcion })) ?? [],
  )
  const form = useForm({
    defaultValues: { NOMBRE: proceso?.nombre ?? "", OBJETO: proceso?.objeto ?? "", REGLAMENTO: proceso?.reglamento ?? "", MOTIVO: "" },
    validators: { onSubmit: procesoSchema },
    onSubmit: ({ value }) => {
      setError(null)
      m.mutate(
        { ruta: proceso ? `/${proceso.id}` : "", metodo: proceso ? "put" : "post", cuerpo: { ...value, FUNCIONES: funciones } },
        { onSuccess: () => onHecho(proceso ? "Proceso actualizado." : "Proceso creado."), onError: (e) => setError(getErrorMessage(e)) },
      )
    },
  })
  const texto = (name: "NOMBRE" | "OBJETO" | "REGLAMENTO" | "MOTIVO", etiqueta: string, area = false) => (
    <form.Field name={name}>
      {(f) => (
        <Field data-invalid={f.state.meta.errors.length > 0}>
          <FieldLabel>{etiqueta}</FieldLabel>
          {area
            ? <Textarea value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} />
            : <Input value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} />}
          <FieldError errors={f.state.meta.errors} />
        </Field>
      )}
    </form.Field>
  )
  return (
    <Marco titulo={proceso ? "Modificar proceso" : "Nuevo proceso"} abierto onCerrar={onCerrar} error={error} pie={
      <>
        <Button variant="outline" color="neutral" onClick={onCerrar}>Cancelar</Button>
        <Button disabled={m.isPending} onClick={() => form.handleSubmit()}>Guardar como borrador</Button>
      </>
    }>
      {texto("NOMBRE", "* Nombre")}
      {texto("OBJETO", "* Objeto", true)}
      {texto("REGLAMENTO", "Reglamento (requisitos, plazos, empates y reclamaciones)", true)}
      {proceso?.publicadoEn && texto("MOTIVO", `* Motivo del cambio (crea la versión ${proceso.version + 1})`)}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Funciones del proceso</p>
        <p className="text-xs text-muted-foreground">No son roles ni dan vistas globales. Se asignan a funcionarios; quien sea candidato o reclamante necesita un sustituto.</p>
        {FUNCIONES.map((funcion) => {
          const asignados = funciones.filter((f) => f.FUNCION === funcion).map((f) => f.USUARIO)
          return (
            <Field key={funcion}>
              <FieldLabel>{FUNCION_LABEL[funcion]}</FieldLabel>
              <NativeSelect
                multiple
                className="h-24"
                value={asignados.map(String)}
                onChange={(e) => {
                  const ids = Array.from(e.target.selectedOptions).map((o) => Number(o.value))
                  setFunciones((prev) => [...prev.filter((f) => f.FUNCION !== funcion), ...ids.map((USUARIO) => ({ USUARIO, FUNCION: funcion }))])
                }}
              >
                {(personas.data ?? []).map((p) => <NativeSelectOption key={p.id} value={String(p.id)}>{p.nombre}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
          )
        })}
      </div>
    </Marco>
  )
}

function Poblaciones({ valor, onCambio }: { valor: string[]; onCambio: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-4">
      {Object.entries(POBLACION_LABEL).map(([clave, etiqueta]) => (
        <label key={clave} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={valor.includes(clave)}
            onCheckedChange={(c) => onCambio(c ? [...valor, clave] : valor.filter((x) => x !== clave))}
          />
          {etiqueta}
        </label>
      ))}
    </div>
  )
}

/**
 * M.4.PRO.2. Solo se ofrece lo implementado: candidaturas individuales, voto secreto de una opción y
 * sin puesto de votación. Valoración por comité y voto nominal no aparecen porque aún no existen.
 */
export function DialogoEleccion({ proceso, eleccion, onCerrar, onHecho }: {
  proceso: Proceso
  eleccion?: EleccionProceso
  onCerrar: () => void
  onHecho: (m: string) => void
}) {
  const m = useAccionProceso()
  const cursos = useCursosQuery()
  const jornadas = useJornadasQuery()
  const [error, setError] = useState<string | null>(null)
  const [v, setV] = useState({
    NOMBRE: eleccion?.nombre ?? "",
    TITULARES: String(eleccion?.titulares ?? 1),
    SUPLENTES: String(eleccion?.suplentes ?? 0),
    EJERCICIO_DESDE: eleccion?.ejercicioDesde ?? "",
    EJERCICIO_HASTA: eleccion?.ejercicioHasta ?? "",
    METODO: eleccion?.metodo ?? "VOTACION",
    POBLACION_POSTULA: eleccion?.poblacionPostula ?? ["ESTUDIANTES"],
    POBLACION_VOTA: eleccion?.poblacionVota ?? ["ESTUDIANTES"],
    CURSOS: eleccion?.cursos ?? [],
    REQUISITOS: (eleccion?.requisitos ?? []).join("\n"),
    AUTOPOSTULACION: eleccion?.autopostulacion ?? true,
    POR_TERCEROS: eleccion?.porTerceros ?? false,
    UMBRAL_PCT: eleccion?.umbralPct == null ? "" : String(eleccion.umbralPct),
    PARTICIPACION_MINIMA_PCT: eleccion?.participacionMinimaPct == null ? "" : String(eleccion.participacionMinimaPct),
    MECANISMO_EMPATE: eleccion?.mecanismoEmpate ?? "DECISION",
    FK_JORNADA: eleccion?.jornada == null ? "" : String(eleccion.jornada),
    POSTULACION_DESDE: aLocal(eleccion?.postulacionDesde),
    POSTULACION_HASTA: aLocal(eleccion?.postulacionHasta),
    VOTACION_INICIO: aLocal(eleccion?.votacionInicio),
    VOTACION_CIERRE: aLocal(eleccion?.votacionCierre),
    RECLAMACION_DIAS: eleccion?.reclamacionDias == null ? "" : String(eleccion.reclamacionDias),
    MOTIVO: "",
  })
  const set = <K extends keyof typeof v>(k: K, valor: (typeof v)[K]) => setV((p) => ({ ...p, [k]: valor }))
  const publicada = Boolean(eleccion && eleccion.etapa !== "PREPARACION")
  const votacion = v.METODO === "VOTACION"
  const num = (s: string) => (s === "" ? null : Number(s))

  const guardar = () => {
    setError(null)
    const cuerpo = {
      NOMBRE: v.NOMBRE,
      TITULARES: num(v.TITULARES),
      SUPLENTES: num(v.SUPLENTES) ?? 0,
      EJERCICIO_DESDE: v.EJERCICIO_DESDE || null,
      EJERCICIO_HASTA: v.EJERCICIO_HASTA || null,
      METODO: v.METODO,
      POBLACION_POSTULA: v.POBLACION_POSTULA,
      POBLACION_VOTA: votacion ? v.POBLACION_VOTA : [],
      CURSOS: v.CURSOS,
      REQUISITOS: v.REQUISITOS.split("\n").map((r) => r.trim()).filter(Boolean),
      AUTOPOSTULACION: v.AUTOPOSTULACION ? "S" : "N",
      POR_TERCEROS: v.POR_TERCEROS ? "S" : "N",
      UMBRAL_PCT: votacion ? num(v.UMBRAL_PCT) : null,
      PARTICIPACION_MINIMA_PCT: votacion ? num(v.PARTICIPACION_MINIMA_PCT) : null,
      MECANISMO_EMPATE: v.MECANISMO_EMPATE,
      FK_JORNADA: votacion ? num(v.FK_JORNADA) : null,
      POSTULACION_DESDE: aIso(v.POSTULACION_DESDE),
      POSTULACION_HASTA: aIso(v.POSTULACION_HASTA),
      VOTACION_INICIO: votacion ? aIso(v.VOTACION_INICIO) : null,
      VOTACION_CIERRE: votacion ? aIso(v.VOTACION_CIERRE) : null,
      RECLAMACION_DIAS: num(v.RECLAMACION_DIAS),
    }
    const motivo = publicada ? `?motivo=${encodeURIComponent(v.MOTIVO)}` : ""
    m.mutate(
      { ruta: eleccion ? `/elecciones/${eleccion.id}${motivo}` : `/${proceso.id}/elecciones`, metodo: eleccion ? "put" : "post", cuerpo },
      { onSuccess: () => onHecho("Elección guardada."), onError: (e) => setError(getErrorMessage(e)) },
    )
  }

  const fecha = (k: "POSTULACION_DESDE" | "POSTULACION_HASTA" | "VOTACION_INICIO" | "VOTACION_CIERRE", etiqueta: string) => (
    <Field>
      <FieldLabel>{etiqueta}</FieldLabel>
      <Input type="datetime-local" value={v[k]} onChange={(e) => set(k, e.target.value)} />
    </Field>
  )

  return (
    <Marco titulo={eleccion ? `Elección: ${eleccion.nombre}` : "Agregar elección o selección"} abierto onCerrar={onCerrar} error={error} pie={
      <>
        <Button variant="outline" color="neutral" onClick={onCerrar}>Cancelar</Button>
        <Button disabled={m.isPending} onClick={guardar}>Guardar</Button>
      </>
    }>
      <Field>
        <FieldLabel>* Cargo, representación o cupo</FieldLabel>
        <Input value={v.NOMBRE} maxLength={100} onChange={(e) => set("NOMBRE", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field><FieldLabel>Titulares</FieldLabel><Input inputMode="numeric" value={v.TITULARES} onChange={(e) => set("TITULARES", e.target.value.replace(/\D/g, ""))} /></Field>
        <Field><FieldLabel>Suplentes</FieldLabel><Input inputMode="numeric" value={v.SUPLENTES} onChange={(e) => set("SUPLENTES", e.target.value.replace(/\D/g, ""))} /></Field>
        <Field><FieldLabel>Ejercicio desde</FieldLabel><Input type="date" value={v.EJERCICIO_DESDE} onChange={(e) => set("EJERCICIO_DESDE", e.target.value)} /></Field>
        <Field><FieldLabel>Ejercicio hasta</FieldLabel><Input type="date" value={v.EJERCICIO_HASTA} onChange={(e) => set("EJERCICIO_HASTA", e.target.value)} /></Field>
      </div>
      <Field>
        <FieldLabel>* Método</FieldLabel>
        <NativeSelect disabled={publicada} value={v.METODO} onChange={(e) => set("METODO", e.target.value as typeof v.METODO)}>
          <NativeSelectOption value="VOTACION">Votación (secreta, una opción, con voto en blanco)</NativeSelectOption>
          <NativeSelectOption value="SELECCION_MOTIVADA">Selección motivada por responsable</NativeSelectOption>
        </NativeSelect>
      </Field>
      <Field><FieldLabel>* Pueden postularse</FieldLabel><Poblaciones valor={v.POBLACION_POSTULA} onCambio={(x) => set("POBLACION_POSTULA", x)} /></Field>
      {votacion && <Field><FieldLabel>* Votan</FieldLabel><Poblaciones valor={v.POBLACION_VOTA} onCambio={(x) => set("POBLACION_VOTA", x)} /></Field>}
      <Field>
        <FieldLabel>Cursos (acotan a los estudiantes; sin marcar, todos)</FieldLabel>
        <NativeSelect multiple className="h-24" value={v.CURSOS} onChange={(e) => set("CURSOS", Array.from(e.target.selectedOptions).map((o) => o.value))}>
          {(cursos.data ?? []).map((c) => <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>)}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel>Requisitos (uno por línea)</FieldLabel>
        <Textarea value={v.REQUISITOS} onChange={(e) => set("REQUISITOS", e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={v.AUTOPOSTULACION} onCheckedChange={(c) => set("AUTOPOSTULACION", Boolean(c))} /> Autopostulación</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={v.POR_TERCEROS} onCheckedChange={(c) => set("POR_TERCEROS", Boolean(c))} /> Postulación por terceros</label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {fecha("POSTULACION_DESDE", "* Postulaciones desde")}
        {fecha("POSTULACION_HASTA", "* Postulaciones hasta")}
        {votacion && fecha("VOTACION_INICIO", "* Votación desde")}
        {votacion && fecha("VOTACION_CIERRE", "* Votación hasta")}
      </div>
      {votacion && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel>* Jornada</FieldLabel>
            <NativeSelect value={v.FK_JORNADA} onChange={(e) => set("FK_JORNADA", e.target.value)}>
              <NativeSelectOption value="">Elige</NativeSelectOption>
              {(jornadas.data ?? []).map((j) => <NativeSelectOption key={j.id} value={String(j.id)}>{j.nombre}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field><FieldLabel>Umbral (%)</FieldLabel><Input inputMode="decimal" value={v.UMBRAL_PCT} onChange={(e) => set("UMBRAL_PCT", e.target.value)} /></Field>
          <Field><FieldLabel>Participación mínima (%)</FieldLabel><Input inputMode="decimal" value={v.PARTICIPACION_MINIMA_PCT} onChange={(e) => set("PARTICIPACION_MINIMA_PCT", e.target.value)} /></Field>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Mecanismo ante empate o umbral</FieldLabel>
          <NativeSelect value={v.MECANISMO_EMPATE} onChange={(e) => set("MECANISMO_EMPATE", e.target.value)}>
            <NativeSelectOption value="DECISION">Decisión documentada</NativeSelectOption>
            <NativeSelectOption value="NUEVA_VOTACION">Nueva votación</NativeSelectOption>
            <NativeSelectOption value="SEGUNDA_VUELTA">Segunda vuelta</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel>Días para reclamar (vacío: sin reclamaciones)</FieldLabel>
          <Input inputMode="numeric" value={v.RECLAMACION_DIAS} onChange={(e) => set("RECLAMACION_DIAS", e.target.value.replace(/\D/g, ""))} />
        </Field>
      </div>
      {publicada && (
        <Field>
          <FieldLabel>* Motivo del cambio (crea una nueva versión de la convocatoria)</FieldLabel>
          <Input value={v.MOTIVO} onChange={(e) => set("MOTIVO", e.target.value)} />
        </Field>
      )}
    </Marco>
  )
}
