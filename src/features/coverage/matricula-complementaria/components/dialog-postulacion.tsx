import { useState, type ReactNode } from "react"

import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, InfoIcon, LockIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { getErrorMessage } from "@/lib/api-client"

import {
  useCambiarCupo,
  useOpcionesPostulacionQuery,
  usePostulacionQuery,
  usePostular,
  usePrincipalesPostulablesQuery,
} from "@/features/coverage/matricula-complementaria/api/postulaciones"
import type { Postulacion } from "@/features/coverage/matricula-complementaria/api/types"
import { ESTADO_OPCION, Marca, fecha } from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import {
  DialogCupoAgotado,
  DialogFichaEspecialidad,
} from "@/features/coverage/matricula-complementaria/components/dialogs-postulacion"
import { Aviso, CampoSelect } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"

/** Cambiar cupo desde un enlace directo: carga la postulación y abre el mismo modal. */
export function DialogCambiarCupoPorId({ id, onOpenChange }: { id: number; onOpenChange: (open: boolean) => void }) {
  const { data, isError, error } = usePostulacionQuery(id)
  if (data) return <DialogPostulacion postulacion={data} onOpenChange={onOpenChange} />
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar cupo</DialogTitle>
          <DialogDescription>
            {isError ? (
              <span className="text-red">{getErrorMessage(error)}</span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <SpinnerIcon className="animate-spin" aria-hidden />
                Cargando…
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Nueva postulación y Cambiar cupo (Sección 2.16.2, Postulación), en un modal: una opción por
 * postulación. Con la forma Abierta queda Inscrito; con la forma por el origen nace Registrado y
 * ocupa el cupo, o entra a la lista de espera si la hay.
 */
export function DialogPostulacion({
  postulacion: p,
  onOpenChange,
}: {
  /** Con postulación: Cambiar cupo; sin ella: Nueva postulación. */
  postulacion?: Postulacion
  onOpenChange: (open: boolean) => void
}) {
  const { notify } = useNotify()
  const editar = p != null
  const [matriculaId, setMatriculaId] = useState(p ? String(p.matriculaPrincipalId) : "")
  const [buscar, setBuscar] = useState("")
  const principales = usePrincipalesPostulablesQuery(buscar)
  const opciones = useOpcionesPostulacionQuery(matriculaId ? Number(matriculaId) : null)
  // La elegida sigue en la lista aunque la búsqueda del back ya no la traiga (si no, el selector queda en blanco).
  const [matriculaLabel, setMatriculaLabel] = useState("")
  const encontradas = (principales.data ?? []).map((m) => ({ value: String(m.id), label: m.label }))
  const opcionesPrincipal =
    matriculaId && matriculaLabel && !encontradas.some((o) => o.value === matriculaId)
      ? [{ value: matriculaId, label: matriculaLabel }, ...encontradas]
      : encontradas

  const [receptor, setReceptor] = useState(p ? String(p.convocatoriaId) : "")
  const [especialidadElegida, setEspecialidad] = useState(p ? String(p.especialidadId) : "")
  const [cupoId, setCupoId] = useState(p ? String(p.cupoId) : "")
  // Autorización de datos opcional (Regla 81): no viene marcada y no frena la postulación.
  const [autorizacion, setAutorizacion] = useState(false)
  const [intentado, setIntentado] = useState(false)
  const [aviso, setAviso] = useState<{ id: number; message: string } | null>(null)
  // Lo elegido contra lo que traía al abrir (vacío al crear, la postulación al cambiar cupo).
  const inicio = {
    matriculaId: p ? String(p.matriculaPrincipalId) : "",
    receptor: p ? String(p.convocatoriaId) : "",
    especialidad: p ? String(p.especialidadId) : "",
    cupoId: p ? String(p.cupoId) : "",
  }
  const hayCambios =
    matriculaId !== inicio.matriculaId ||
    receptor !== inicio.receptor ||
    especialidadElegida !== inicio.especialidad ||
    cupoId !== inicio.cupoId ||
    autorizacion
  function deshacer() {
    setMatriculaId(inicio.matriculaId)
    setMatriculaLabel("")
    setReceptor(inicio.receptor)
    setEspecialidad(inicio.especialidad)
    setCupoId(inicio.cupoId)
    setAutorizacion(false)
    setBuscar("")
    setIntentado(false)
  }
  const [ficha, setFicha] = useState(false)
  const [agotado, setAgotado] = useState(false)

  const postular = usePostular()
  const cambiar = useCambiarCupo()
  const pending = postular.isPending || cambiar.isPending

  const convocatorias = opciones.data?.convocatorias ?? []
  // Un solo establecimiento que recibe: se elige solo.
  const convId = receptor || (convocatorias.length === 1 ? String(convocatorias[0].id) : "")
  const conv = convocatorias.find((c) => String(c.id) === convId)
  // Por defecto, la especialidad de la principal si es una de las ofrecidas.
  const porDefecto = conv?.especialidades.some((e) => e.id === opciones.data?.especialidadPrincipalId)
    ? String(opciones.data?.especialidadPrincipalId)
    : ""
  const especialidadId = especialidadElegida || porDefecto
  const especialidad = conv?.especialidades.find((e) => String(e.id) === especialidadId)
  const cupos = (conv?.cupos ?? []).filter((c) => String(c.especialidadId) === especialidadId)
  const cupo = cupos.find((c) => String(c.id) === cupoId)
  const porOrigen = conv?.forma === "ORIGEN"
  // Sin disponibles (o con alguien ya en la lista), la postulación nueva entra a la lista.
  const vaALista = porOrigen && cupo != null && (cupo.disponibles === 0 || cupo.enEspera > 0)

  const errores = {
    matricula: !matriculaId,
    receptor: !conv,
    especialidad: !especialidad,
    cupo: !cupo,
  }
  const hayError = Object.values(errores).some(Boolean)
  const estudiante = p?.estudiante ?? principales.data?.find((x) => String(x.id) === matriculaId)?.label.split(" · ")[0] ?? ""

  function enviar(listaEspera = false) {
    setIntentado(true)
    if (hayError || !cupo) return
    if (vaALista && !listaEspera) return setAgotado(true)
    const listo = (texto: string) => {
      notify(texto, { variant: "success" })
      onOpenChange(false)
    }
    const fallo = (err: unknown) => {
      setAgotado(false)
      setAviso({ id: Date.now(), message: getErrorMessage(err) })
    }
    if (editar)
      cambiar.mutate(
        { id: p.id, cupoId: cupo.id, listaEspera },
        { onSuccess: () => listo(`Se cambió el cupo de la postulación ${p.numero} a ${cupo.label}.`), onError: fallo },
      )
    else
      postular.mutate(
        { matriculaId: Number(matriculaId), cupoId: cupo.id, autorizacion, listaEspera },
        {
          onSuccess: (r) =>
            listo(
              r.estado === "EN_LISTA_ESPERA"
                ? `Se registró la postulación ${r.numero}: ${estudiante} quedó en la lista de espera de ${cupo.label}.`
                : `Se registró la postulación ${r.numero} de ${estudiante}.`,
            ),
          onError: fallo,
        },
      )
  }

  const abiertas = convocatorias.filter((c) => c.forma === "ABIERTA")

  return (
    // No se cierra mientras guarda.
    <Dialog open onOpenChange={(open) => !pending && onOpenChange(open)}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {editar ? `Cambiar cupo — Postulación ${p.numero}` : "Nueva postulación"}
            {editar ? <Marca {...ESTADO_OPCION[p.estado]} /> : null}
          </DialogTitle>
          <DialogDescription>
            {editar
              ? "Cambie la especialidad o el cupo; el establecimiento que recibe queda fijo."
              : "Postule una matrícula principal a un cupo de la matrícula complementaria."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />

          {abiertas.length ? (
            <Aviso
              tono="info"
              titulo={`Convocatorias En postulación: ${abiertas.map((c) => `${c.receptor} hasta el ${fecha(c.cierrePostulacion)}`).join(" · ")}.`}
            >
              Al continuar con la postulación, se confirma y acepta la Política de tratamiento de datos (Ley 1581 de 2012).
            </Aviso>
          ) : null}

          {/* Campos uno debajo de otro (modal angosto). */}
          <div className="grid gap-4">
            {editar ? (
              <Lectura id="post-principal" label="Matrícula principal" valor={`${p.estudiante} · ${p.documento} · ${p.principal}`} />
            ) : (
              <CampoSelect
                id="post-principal"
                label="Matrícula principal"
                required
                value={matriculaId}
                // Se escribe en el mismo selector para buscar por nombre o documento (también en el back).
                placeholder="Buscar por nombre o documento"
                onBuscar={setBuscar}
                onChange={(v) => {
                  setMatriculaId(v)
                  setMatriculaLabel(opcionesPrincipal.find((o) => o.value === v)?.label ?? "")
                  setReceptor("")
                  setEspecialidad("")
                  setCupoId("")
                }}
                opciones={opcionesPrincipal}
                descripcion="Matrículas principales Cursando sin matrícula complementaria ni postulación vigente."
                invalido={intentado && errores.matricula}
              />
            )}
            <Lectura id="post-numero" label="Número de postulación" valor={editar ? p.numero : "Se asigna al guardar"} />
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              Opción de especialidad<span data-required-mark="">*</span>
            </legend>
            {!matriculaId ? (
              <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Elija la matrícula principal para ver los cupos que puede tomar.
              </p>
            ) : opciones.isPending ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <SpinnerIcon className="animate-spin" aria-hidden />
                Cargando cupos…
              </div>
            ) : convocatorias.length === 0 ? (
              <Aviso tono="advertencia" titulo="No hay convocatorias En postulación para esta matrícula.">
                Solo se postula a convocatorias que tengan a su establecimiento entre los de origen, con cupos del grado de la principal en
                otra jornada.
              </Aviso>
            ) : (
              <div className="grid gap-4 rounded-md border border-border p-4">
                <CampoSelect
                  id="post-receptor"
                  label="Establecimiento que recibe"
                  required
                  // Cambiar cupo mueve Especialidad y Cupo; el establecimiento queda fijo.
                  disabled={editar}
                  value={convId}
                  onChange={(v) => {
                    setReceptor(v)
                    setEspecialidad("")
                    setCupoId("")
                  }}
                  opciones={convocatorias.map((c) => ({ value: String(c.id), label: c.receptor }))}
                  descripcion="Convenio de adscripción Aceptado con su establecimiento."
                  invalido={intentado && errores.receptor}
                />
                <div className="grid content-start gap-1">
                  <CampoSelect
                    id="post-especialidad"
                    label="Especialidad"
                    required
                    value={especialidadId}
                    disabled={!conv}
                    onChange={(v) => {
                      setEspecialidad(v)
                      setCupoId("")
                    }}
                    opciones={(conv?.especialidades ?? []).map((e) => ({ value: String(e.id), label: e.nombre }))}
                    descripcion="Si elige otra distinta de la de la matrícula, al quedar Registrado la principal la toma."
                    invalido={intentado && errores.especialidad}
                  />
                  {especialidad ? (
                    <button
                      type="button"
                      className="flex w-fit items-center gap-1 rounded-xs text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      onClick={() => setFicha(true)}
                    >
                      <InfoIcon className="size-3.5" aria-hidden />
                      Ver la ficha de {especialidad.nombre}
                    </button>
                  ) : null}
                </div>
                <CampoSelect
                  id="post-cupo"
                  label="Cupo"
                  required
                  value={cupoId}
                  disabled={!especialidad}
                  onChange={setCupoId}
                  opciones={cupos.map((c) => ({
                    value: String(c.id),
                    // Sin lista de espera, el cupo en 0 se muestra deshabilitado (Sección 2.16.2).
                    disabled: porOrigen && !conv?.listaEspera && c.disponibles === 0,
                    label: porOrigen ? `${c.label} — Disponibles ${c.disponibles} de ${c.cupo}` : c.label,
                  }))}
                  descripcion={
                    porOrigen && conv?.listaEspera
                      ? "Solo cupos de la especialidad elegida, del grado de la principal, en otra jornada. Con la lista de espera, un cupo sin disponibles se puede elegir para agregar a la lista."
                      : "Solo cupos de la especialidad elegida, del grado de la principal, en otra jornada."
                  }
                  invalido={intentado && errores.cupo}
                />
              </div>
            )}
          </fieldset>

          {conv && !editar ? (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={autorizacion} onCheckedChange={(v) => setAutorizacion(v === true)} className="mt-0.5" />
              <span className="grid gap-0.5">
                <span>Autorización de tratamiento de datos (Ley 1581 de 2012)</span>
                <span className="text-xs text-muted-foreground">
                  Opcional: permite que el establecimiento consulte la información ya registrada; sin ella el proceso continúa.
                </span>
              </span>
            </label>
          ) : null}

          {porOrigen && cupo && conv ? (
            vaALista ? (
              <Aviso tono="advertencia" titulo={`El cupo de ${cupo.label} está agotado.`}>
                Al guardar, se le preguntará si agrega al estudiante a la lista de espera, en la posición {cupo.enEspera + 1}.
              </Aviso>
            ) : (
              <Aviso tono="info" titulo="Al guardar, la opción queda Registrado y ocupa el cupo.">
                El acudiente recibe el aviso para que el estudiante se presente en {conv.receptor} antes del {fecha(conv.limiteMatricula)}.
              </Aviso>
            )
          ) : null}
        </div>

        {/* Nota de obligatorios en la línea de los botones; sin cambios: Cerrar y Guardar deshabilitado;
            con cambios: Cancelar (vuelve a como se abrió) (CLAUDE.md §13). */}
        <DialogFooter>
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          {hayCambios ? (
            <Button type="button" variant="outline" color="neutral" size="sm" disabled={pending} onClick={deshacer}>
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
          ) : (
            <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
              <XIcon data-icon="inline-start" />
              Cerrar
            </Button>
          )}
          <Button type="button" variant="fill" color="primary" size="sm" disabled={pending || !hayCambios} onClick={() => enviar()}>
            {pending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FloppyDiskIcon data-icon="inline-start" />}
            Guardar
          </Button>
        </DialogFooter>

        {ficha && especialidad && conv ? (
          <DialogFichaEspecialidad titulo={`${especialidad.nombre} — ${conv.receptor}`} ficha={especialidad.ficha} onOpenChange={setFicha} />
        ) : null}
        {agotado && cupo && conv ? (
          <DialogCupoAgotado
            estudiante={estudiante}
            especialidad={especialidad?.nombre ?? ""}
            cupo={cupo.label}
            posicion={cupo.enEspera + 1}
            cierre={conv.cierrePostulacion}
            pending={pending}
            onConfirm={() => enviar(true)}
            onOpenChange={setAgotado}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function Lectura({ id, label, valor }: { id: string; label: ReactNode; valor: string }) {
  return (
    <Field variant="outlined" className="gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {/* Solo lectura con candado (CLAUDE.md §13). */}
      <div className="relative">
        <Input id={id} size="sm" value={valor} disabled readOnly className="pr-9" />
        <LockIcon aria-hidden className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </Field>
  )
}
