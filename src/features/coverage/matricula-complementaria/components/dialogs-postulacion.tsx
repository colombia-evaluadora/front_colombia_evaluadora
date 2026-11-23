import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { ArrowsLeftRightIcon, FloppyDiskIcon, ListPlusIcon, LockIcon, PersonRemoveIcon, ProhibitIcon, SpinnerIcon, WarningIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import {
  useAnularPostulacion,
  useCambiarCupo,
  useCambiarEspecialidad,
  useLiberarCupo,
  useMatricularAdscripcion,
  useMotivosAnulacionQuery,
  useOpcionesPostulacionQuery,
  usePreviaCambioEspecialidadQuery,
  usePreviaMatriculaAdscripcionQuery,
} from "@/features/coverage/matricula-complementaria/api/postulaciones"
import type { FichaEspecialidad, Postulacion } from "@/features/coverage/matricula-complementaria/api/types"
import { fecha } from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import { Aviso, CampoSelect } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"

type Aviso = { id: number; message: string } | null
const cupoDe = (p: Postulacion) => `${p.receptor} · ${p.jornada} · ${p.grado} · ${p.especialidad}`

function Cargando() {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <SpinnerIcon className="animate-spin" aria-hidden />
      Cargando…
    </div>
  )
}

function Titulo({ children, alerta }: { children: ReactNode; alerta?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {alerta ? <WarningIcon className="size-6 shrink-0 text-yellow" aria-hidden /> : null}
      <DialogTitle>{children}</DialogTitle>
    </div>
  )
}

function Pie({
  onCancel,
  pending,
  onConfirm,
  label,
  icon,
  destructivo,
  disabled,
}: {
  onCancel: () => void
  pending: boolean
  onConfirm: () => void
  label: string
  icon: ReactNode
  destructivo?: boolean
  disabled?: boolean
}) {
  return (
    <DialogFooter>
      <Button variant="outline" color="neutral" type="button" size="sm" onClick={onCancel}>
        <XIcon data-icon="inline-start" />
        Cancelar
      </Button>
      <Button
        type="button"
        variant="fill"
        color={destructivo ? "destructive" : "primary"}
        size="sm"
        disabled={pending || disabled}
        onClick={onConfirm}
      >
        {pending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : icon}
        {label}
      </Button>
    </DialogFooter>
  )
}

function Lectura({ id, label, valor }: { id: string; label: string; valor: string }) {
  return (
    <Field variant="outlined" className="gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} size="sm" value={valor} disabled readOnly />
    </Field>
  )
}

const Requeridos = () => <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>

/* Anular postulación: sus opciones no matriculadas quedan Descartadas y liberan su cupo. */
export function DialogAnularPostulacion({ postulacion: p, onOpenChange }: { postulacion: Postulacion; onOpenChange: (o: boolean) => void }) {
  const { notify } = useNotify()
  const anular = useAnularPostulacion()
  const { data: motivos = [] } = useMotivosAnulacionQuery()
  const [motivo, setMotivo] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [aviso, setAviso] = useState<Aviso>(null)
  return (
    <Dialog open onOpenChange={(o) => !anular.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <Titulo alerta>Anular postulación {p.numero}</Titulo>
          <DialogDescription>
            La postulación de <b className="text-foreground">{p.estudiante}</b> quedará Anulada. Su opción quedará Descartada y
            liberará su cupo en {p.receptor} · {p.jornada} · {p.especialidad}.
          </DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <CampoSelect
          id="anular-motivo"
          label="Motivo de anulación"
          required
          value={motivo}
          onChange={setMotivo}
          opciones={motivos.map((m) => ({ value: String(m.id), label: m.nombre }))}
          invalido={intentado && !motivo}
          descripcion={intentado && !motivo ? "Elija el motivo de anulación." : undefined}
        />
        <Requeridos />
        <Pie
          onCancel={() => onOpenChange(false)}
          pending={anular.isPending}
          destructivo
          label="Anular postulación"
          icon={<ProhibitIcon data-icon="inline-start" />}
          onConfirm={() => {
            setIntentado(true)
            if (!motivo) return
            anular.mutate(
              { id: p.id, motivoId: Number(motivo) },
              {
                onSuccess: () => {
                  notify(`Se anuló la postulación ${p.numero}.`, { variant: "success" })
                  onOpenChange(false)
                },
                onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }),
              },
            )
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/* Liberar cupo (forma por el origen): la opción queda Descartada con motivo No se presentó. */
export function DialogLiberarCupo({ postulacion: p, onOpenChange }: { postulacion: Postulacion; onOpenChange: (o: boolean) => void }) {
  const { notify } = useNotify()
  const liberar = useLiberarCupo()
  const [motivo, setMotivo] = useState("")
  const [aviso, setAviso] = useState<Aviso>(null)
  return (
    <Dialog open onOpenChange={(o) => !liberar.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <Titulo alerta>Liberar cupo — {p.estudiante}</Titulo>
          <DialogDescription>
            La opción en <b className="text-foreground">{cupoDe(p)}</b> quedará Descartada con motivo <i>No se presentó</i> y el cupo
            {p.listaEspera
              ? "quedará libre para llamar al siguiente de la lista de espera."
              : `quedará libre para que ${p.origen} postule a otro estudiante.`}
          </DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <Field variant="outlined" className="gap-1.5">
          <FieldLabel htmlFor="liberar-motivo">Motivo</FieldLabel>
          <div className="relative">
            <Textarea
              id="liberar-motivo"
              rows={2}
              maxLength={500}
              value={motivo}
              placeholder="Opcional"
              className={cn(TEXTAREA_OUTLINED, "pr-16")}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <CharacterCounter value={motivo} max={500} className="absolute top-3 right-3" />
          </div>
        </Field>
        <Pie
          onCancel={() => onOpenChange(false)}
          pending={liberar.isPending}
          destructivo
          label="Liberar cupo"
          icon={<PersonRemoveIcon data-icon="inline-start" />}
          onConfirm={() =>
            liberar.mutate(
              { id: p.id, motivo: motivo.trim() },
              {
                onSuccess: () => {
                  notify(`Se liberó el cupo de ${p.estudiante} en ${p.especialidad}.`, { variant: "success" })
                  onOpenChange(false)
                },
                onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }),
              },
            )
          }
        />
      </DialogContent>
    </Dialog>
  )
}

/**
 * Cambiar cupo con la forma por el origen (mismo establecimiento que recibe).
 * Una opción Registrado cambia en un solo paso y solo a un cupo con disponibles;
 * una En lista de espera queda Registrado si hay cupo, o entra al final de la otra lista.
 */
export function DialogCambiarCupo({ postulacion: p, onOpenChange }: { postulacion: Postulacion; onOpenChange: (o: boolean) => void }) {
  const { notify } = useNotify()
  const cambiar = useCambiarCupo()
  const { data, isPending } = useOpcionesPostulacionQuery(p.matriculaPrincipalId)
  const conv = data?.convocatorias.find((c) => c.id === p.convocatoriaId)
  const [especialidad, setEspecialidad] = useState("")
  const [cupoId, setCupoId] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [aviso, setAviso] = useState<Aviso>(null)
  const registrado = p.estado === "REGISTRADO"
  const cupos = (conv?.cupos ?? []).filter((c) => String(c.especialidadId) === especialidad && c.id !== p.cupoId)
  const cupo = cupos.find((c) => String(c.id) === cupoId)

  return (
    <Dialog open onOpenChange={(o) => !cambiar.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <Titulo>Cambiar cupo — {p.estudiante}</Titulo>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <Lectura
          id="cupo-actual"
          label="Cupo actual"
          valor={`${cupoDe(p)} · ${p.posicion ? `En lista de espera (posición ${p.posicion})` : "Registrado"}`}
        />
        {isPending ? (
          <Cargando />
        ) : (
          <div className="grid gap-4 sm:grid-cols-[0.8fr_1.6fr]">
            <CampoSelect
              id="cupo-especialidad"
              label="Nueva especialidad"
              required
              value={especialidad}
              onChange={(v) => {
                setEspecialidad(v)
                setCupoId("")
              }}
              opciones={(conv?.especialidades ?? []).map((e) => ({ value: String(e.id), label: e.nombre }))}
              invalido={intentado && !especialidad}
            />
            <CampoSelect
              id="cupo-nuevo"
              label="Nuevo cupo"
              required
              value={cupoId}
              disabled={!especialidad}
              onChange={setCupoId}
              opciones={cupos.map((c) => ({
                value: String(c.id),
                label: `${c.label} — Disponibles ${c.disponibles} de ${c.cupo}`,
              }))}
              invalido={intentado && !cupo}
              descripcion={
                registrado
                  ? "Solo a un cupo con disponibles: libera el actual y ocupa el nuevo en un solo paso."
                  : "Con cupo disponible, queda Registrado y la principal toma esa especialidad; sin él, entra a la lista de esa especialidad en la última posición."
              }
            />
          </div>
        )}
        <Requeridos />
        <Pie
          onCancel={() => onOpenChange(false)}
          pending={cambiar.isPending}
          label="Cambiar cupo"
          icon={<ArrowsLeftRightIcon data-icon="inline-start" />}
          disabled={registrado && cupo != null && cupo.disponibles === 0}
          onConfirm={() => {
            setIntentado(true)
            if (!cupo) return
            cambiar.mutate(
              { id: p.id, cupoId: cupo.id, listaEspera: true },
              {
                onSuccess: (r) => {
                  notify(
                    r.estado === "EN_LISTA_ESPERA"
                      ? `${p.estudiante} entró a la lista de espera de ${cupo.label} en la posición ${r.posicion}.`
                      : `${p.estudiante} quedó Registrado en ${cupo.label}.`,
                    { variant: "success" },
                  )
                  onOpenChange(false)
                },
                onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }),
              },
            )
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/** Agregar matrícula complementaria por adscripción (C.2.POS.5): datos fijos de la opción y el grupo. */
export function DialogAgregarMatriculaAdscripcion({
  postulacion: p,
  onOpenChange,
}: {
  postulacion: Postulacion
  onOpenChange: (o: boolean) => void
}) {
  const { notify } = useNotify()
  const { data, isPending, isError, error } = usePreviaMatriculaAdscripcionQuery(p.id)
  const matricular = useMatricularAdscripcion()
  const [grupoId, setGrupoId] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [aviso, setAviso] = useState<Aviso>(null)
  const grupo = data?.grupos.find((g) => String(g.id) === grupoId)

  return (
    <Dialog open onOpenChange={(o) => !matricular.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Agregar matrícula complementaria — {p.estudiante}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        {isPending ? (
          <Cargando />
        ) : isError ? (
          <Aviso tono="advertencia" titulo="No se puede agregar la matrícula complementaria.">
            {getErrorMessage(error)}
          </Aviso>
        ) : (
          <>
            <dl className="grid overflow-hidden rounded-md border border-border text-sm sm:grid-cols-[auto_1fr_auto_1fr] [&>:last-child]:border-b-0 sm:[&>:nth-last-child(-n+2)]:border-b-0">
              <Dato termino="Opción seleccionada">Postulación {p.numero}</Dato>
              <Dato termino="Matrícula principal">
                <span className="inline-flex items-center gap-1.5">
                  {p.principal}
                  {/* Datos del estudiante protegidos y en solo lectura para quien recibe (Regla 8). */}
                  <LockIcon className="size-3.5 text-muted-foreground" aria-label="Datos protegidos" />
                </span>
              </Dato>
              <Dato termino="Establecimiento que recibe">{p.receptor}</Dato>
              <Dato termino="Sede">{data.sede}</Dato>
              <Dato termino="Período">{data.periodo}</Dato>
              <Dato termino="Grado">{data.grado}</Dato>
              <Dato termino="Especialidad">{data.especialidad}</Dato>
              <Dato termino="Autorización de tratamiento de datos">{p.autorizacion ? "Sí" : "No"}</Dato>
            </dl>
            <CampoSelect
              id="adscripcion-grupo"
              label="Grupo"
              required
              value={grupoId}
              onChange={setGrupoId}
              opciones={data.grupos.map((g) => ({ value: String(g.id), label: `${g.codigo} · ${g.libres} de ${g.cupo} libres` }))}
              descripcion={`Solo grupos que dictan ${data.especialidad} (áreas de la especialidad en su horario) con cupo disponible.`}
              invalido={intentado && !grupo}
              className="sm:max-w-sm"
            />
            <Aviso tono="info" titulo={`Plazo para matricular: hasta el ${fecha(p.limiteMatricula)}.`}>
              Las asignaturas de la especialidad se gestionan después de guardar, en el bloque Asignaturas matriculadas. La opción
              pasa a Adscrito y la principal toma la especialidad {data.especialidad}.
            </Aviso>
            <Requeridos />
          </>
        )}
        <Pie
          onCancel={() => onOpenChange(false)}
          pending={matricular.isPending}
          label="Guardar"
          icon={<FloppyDiskIcon data-icon="inline-start" />}
          disabled={!data}
          onConfirm={() => {
            setIntentado(true)
            if (!grupo) return
            matricular.mutate(
              { id: p.id, grupoId: grupo.id },
              {
                onSuccess: () => {
                  notify(`Se agregó la matrícula complementaria de ${p.estudiante} en ${grupo.codigo}.`, { variant: "success" })
                  onOpenChange(false)
                },
                onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }),
              },
            )
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function Dato({ termino, children }: { termino: string; children: ReactNode }) {
  return (
    <>
      <dt className="border-b border-border px-4 py-3 text-muted-foreground sm:max-w-44">{termino}</dt>
      <dd className="border-b border-border px-4 py-3 font-medium">{children}</dd>
    </>
  )
}

/**
 * Cambiar de especialidad una matrícula complementaria (Sección 2.16, Regla 80):
 * la misma matrícula pasa al grupo elegido, el cupo anterior queda libre y la
 * principal toma la especialidad nueva. Solo hasta la Fecha límite de matrícula
 * y sin resultados en las áreas de la anterior (lo valida el back).
 */
export function DialogCambiarEspecialidad({
  matriculaId,
  estudiante,
  onOpenChange,
}: {
  matriculaId: number
  estudiante: string
  onOpenChange: (o: boolean) => void
}) {
  const { notify } = useNotify()
  const { data, isPending, isError, error } = usePreviaCambioEspecialidadQuery(matriculaId)
  const cambiar = useCambiarEspecialidad()
  const [especialidadId, setEspecialidadId] = useState("")
  const [grupoId, setGrupoId] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [aviso, setAviso] = useState<Aviso>(null)
  const especialidad = data?.especialidades.find((e) => String(e.id) === especialidadId)
  const grupo = especialidad?.grupos.find((g) => String(g.id) === grupoId)

  return (
    <Dialog open onOpenChange={(o) => !cambiar.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <Titulo alerta>Cambiar de especialidad — {estudiante}</Titulo>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        {isPending ? (
          <Cargando />
        ) : isError ? (
          <Aviso tono="advertencia" titulo="No se puede cambiar la especialidad.">
            {getErrorMessage(error)}
          </Aviso>
        ) : (
          <>
            <Lectura id="especialidad-actual" label="Especialidad actual" valor={data.actual} />
            <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
              <CampoSelect
                id="especialidad-nueva"
                label="Nueva especialidad"
                required
                value={especialidadId}
                onChange={(v) => {
                  setEspecialidadId(v)
                  setGrupoId("")
                }}
                opciones={data.especialidades.map((e) => ({ value: String(e.id), label: e.nombre }))}
                invalido={intentado && !especialidad}
              />
              <CampoSelect
                id="especialidad-grupo"
                label="Grupo"
                required
                value={grupoId}
                disabled={!especialidad}
                onChange={setGrupoId}
                opciones={(especialidad?.grupos ?? []).map((g) => ({ value: String(g.id), label: `${g.codigo} · ${g.libres} de ${g.cupo} libres` }))}
                descripcion={
                  especialidad
                    ? data.origen
                      ? `Solo grupos que dictan ${especialidad.nombre}.`
                      : `Solo grupos que dictan ${especialidad.nombre}. Puestos libres sin contar los comprometidos con la convocatoria.`
                    : undefined
                }
                invalido={intentado && !grupo}
              />
            </div>
            {especialidad ? (
              <Aviso
                tono="info"
                titulo={`Al guardar, la matrícula principal${data.origen ? ` de ${data.origen}` : ""} toma la especialidad ${especialidad.nombre} y el cupo de ${data.especialidadActual} queda libre.`}
              >
                {data.origen ? "Se avisa al acudiente, al estudiante y al origen." : "Se avisa al acudiente y al estudiante."}
              </Aviso>
            ) : null}
            <Requeridos />
          </>
        )}
        <Pie
          onCancel={() => onOpenChange(false)}
          pending={cambiar.isPending}
          label="Guardar"
          icon={<FloppyDiskIcon data-icon="inline-start" />}
          disabled={!data}
          onConfirm={() => {
            setIntentado(true)
            if (!especialidad || !grupo) return
            cambiar.mutate(
              { matriculaId, especialidadId: especialidad.id, grupoId: grupo.id },
              {
                onSuccess: () => {
                  notify(`La especialidad de ${estudiante} cambió a ${especialidad.nombre}; pasó al grupo ${grupo.codigo}.`, {
                    variant: "success",
                  })
                  onOpenChange(false)
                },
                onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }),
              },
            )
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/** Ficha de la especialidad (Establecimiento, Sección 3.2). */
export function DialogFichaEspecialidad({
  titulo,
  ficha,
  onOpenChange,
}: {
  titulo: string
  ficha: FichaEspecialidad
  onOpenChange: (o: boolean) => void
}) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 text-sm">
          <section className="grid gap-1">
            <h3 className="font-semibold">Descripción</h3>
            <p>{ficha.descripcion}</p>
          </section>
          <section className="grid gap-1">
            <h3 className="font-semibold">Actividades para conocerla</h3>
            <p>{ficha.actividades}</p>
          </section>
        </div>
        <DialogFooter>
          <Button type="button" variant="fill" color="primary" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** El cupo se agotó (forma por el origen con lista de espera): ¿agregar a la lista? */
export function DialogCupoAgotado({
  estudiante,
  especialidad,
  cupo,
  posicion,
  cierre,
  pending,
  onConfirm,
  onOpenChange,
}: {
  estudiante: string
  especialidad: string
  cupo: string
  posicion: number
  cierre: string
  pending: boolean
  onConfirm: () => void
  onOpenChange: (o: boolean) => void
}) {
  return (
    <Dialog open onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <Titulo alerta>El cupo se agotó.</Titulo>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          <p>
            ¿Desea agregar a <b>{estudiante}</b> a la lista de espera de <b>{especialidad}</b>?
          </p>
          <p>
            Quedaría en la posición <b>{posicion}</b> de {cupo}. Podrá cambiar de especialidad mientras no llegue el cierre de postulación (
            {fecha(cierre)}).
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            No agregar
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" disabled={pending} onClick={onConfirm}>
            {pending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <ListPlusIcon data-icon="inline-start" />}
            Agregar a la lista de espera
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
