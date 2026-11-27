import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, LockIcon, ProhibitIcon, SpinnerIcon, WarningIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import {
  opcionSeleccionada,
  useAnularPostulacion,
  useCambiarEspecialidad,
  useMatricularAdscripcion,
  useMotivosAnulacionQuery,
  usePreviaCambioEspecialidadQuery,
  usePreviaMatriculaAdscripcionQuery,
} from "@/features/coverage/matricula-complementaria/api/postulaciones"
import type { FichaEspecialidad, Postulacion } from "@/features/coverage/matricula-complementaria/api/types"
import { fecha } from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import { Aviso, CampoSelect } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"

type Aviso = { id: number; message: string } | null

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
      <Button type="button" variant="outline" color="neutral" size="sm" onClick={onCancel}>
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
            La postulación de <b className="text-foreground">{p.estudiante}</b> quedará Anulada. Sus opciones no matriculadas
            quedarán Descartadas y liberarán su cupo.
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
  const sel = opcionSeleccionada(p)

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
              <Dato termino="Establecimiento que recibe">{sel?.receptor ?? "—"}</Dato>
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
            <Aviso tono="info" titulo={`Plazo para matricular: hasta el ${fecha(sel?.limiteMatricula)}.`}>
              Las asignaturas de la especialidad se gestionan después de guardar, en el bloque Asignaturas matriculadas. La opción
              pasa a Matriculada y la principal toma la especialidad {data.especialidad}.
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
