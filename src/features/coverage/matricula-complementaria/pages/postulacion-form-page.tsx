import { useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { NoticeProvider, queueNotice } from "@/components/notice/notice-context"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { ArrowDownIcon, ArrowUpIcon, FloppyDiskIcon, InfoIcon, PlusIcon, SpinnerIcon, TrashIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"

import {
  useEditarOpciones,
  useOpcionesPostulacionQuery,
  usePostulacionQuery,
  usePostular,
  usePrincipalesPostulablesQuery,
} from "@/features/coverage/matricula-complementaria/api/postulaciones"
import type { ConvocatoriaPostulable, Postulacion } from "@/features/coverage/matricula-complementaria/api/types"
import { ESTADO_POSTULACION, Marca, fecha } from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import { DialogFichaEspecialidad } from "@/features/coverage/matricula-complementaria/components/dialogs-postulacion"
import { Aviso, CampoSelect } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"

const MAX_OPCIONES = 3

/** Una fila del constructor: convocatoria (establecimiento que recibe) y cupo. */
interface FilaOpcion {
  key: number
  convocatoria: string
  cupo: string
}

/**
 * Nueva postulación y Editar opciones (Sección 2.16.2, Postulación): de 1 a 3
 * opciones de especialidad en orden de preferencia.
 */
export function PostulacionFormPage() {
  const { postulacionId } = useParams({ strict: false }) as { postulacionId?: string }
  const id = postulacionId ? Number(postulacionId) : null
  const postulacion = usePostulacionQuery(id)
  return (
    <NoticeProvider>
      {id != null && !postulacion.data ? (
        <TableScreen>
          <TableScreenHeader>
            <TableScreenTitle>Matrícula complementaria › Editar opciones</TableScreenTitle>
          </TableScreenHeader>
          <TableScreenBody>
            {postulacion.isError ? (
              <p className="p-10 text-center text-red">{getErrorMessage(postulacion.error)}</p>
            ) : (
              <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
                <SpinnerIcon className="animate-spin" aria-hidden />
                Cargando…
              </div>
            )}
          </TableScreenBody>
        </TableScreen>
      ) : (
        <Formulario postulacion={postulacion.data} />
      )}
    </NoticeProvider>
  )
}

let siguienteKey = 1
const filaVacia = (): FilaOpcion => ({ key: siguienteKey++, convocatoria: "", cupo: "" })

function Formulario({ postulacion: p }: { postulacion: Postulacion | undefined }) {
  const navigate = useNavigate()
  const editar = p != null
  const [matriculaId, setMatriculaId] = useState(p ? String(p.matriculaPrincipalId) : "")
  const [buscar, setBuscar] = useState("")
  const principales = usePrincipalesPostulablesQuery(buscar)
  const opciones = useOpcionesPostulacionQuery(matriculaId ? Number(matriculaId) : null)

  const [filas, setFilas] = useState<FilaOpcion[]>(() =>
    p?.opciones.length
      ? p.opciones.map((o) => ({ key: siguienteKey++, convocatoria: String(o.convocatoriaId), cupo: String(o.cupoId) }))
      : [filaVacia()],
  )
  // Autorización de datos obligatoria (Ley 1581 de 2012).
  const [autorizacion, setAutorizacion] = useState(false)
  const [intentado, setIntentado] = useState(false)
  const [aviso, setAviso] = useState<{ id: number; message: string } | null>(null)
  const [ficha, setFicha] = useState<{ titulo: string; conv: ConvocatoriaPostulable; especialidadId: number } | null>(null)

  const postular = usePostular()
  const editarOpciones = useEditarOpciones()
  const pending = postular.isPending || editarOpciones.isPending

  const convocatorias = opciones.data?.convocatorias ?? []
  // Un solo establecimiento que recibe: se elige solo.
  const convDe = (f: FilaOpcion) =>
    convocatorias.find((c) => String(c.id) === (f.convocatoria || (convocatorias.length === 1 ? String(convocatorias[0].id) : "")))
  const cupoDe = (f: FilaOpcion) => convDe(f)?.cupos.find((c) => String(c.id) === f.cupo)
  const cupoIds = filas.map((f) => cupoDe(f)?.id).filter((x): x is number => x != null)
  const repetidos = new Set(cupoIds).size !== cupoIds.length

  const errores = {
    matricula: !matriculaId,
    opciones: filas.some((f) => !cupoDe(f)) || repetidos,
    autorizacion: !editar && !autorizacion,
  }
  const hayError = Object.values(errores).some(Boolean)
  const estudiante = p?.estudiante ?? principales.data?.find((x) => String(x.id) === matriculaId)?.label.split(" · ")[0] ?? ""

  const actualizar = (key: number, patch: Partial<FilaOpcion>) =>
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)))
  const mover = (i: number, d: -1 | 1) =>
    setFilas((prev) => {
      const next = prev.slice()
      ;[next[i], next[i + d]] = [next[i + d], next[i]]
      return next
    })

  function enviar() {
    setIntentado(true)
    if (hayError) return
    const listo = (texto: string) => {
      queueNotice(texto, { variant: "success" })
      navigate({ to: paths.app.coberturaComplementaria.getHref(), search: { tab: "postulaciones" } })
    }
    const fallo = (err: unknown) => setAviso({ id: Date.now(), message: getErrorMessage(err) })
    if (editar)
      editarOpciones.mutate(
        { id: p.id, cupoIds },
        { onSuccess: () => listo(`Se actualizaron las opciones de la postulación ${p.numero}.`), onError: fallo },
      )
    else
      postular.mutate(
        { matriculaId: Number(matriculaId), cupoIds },
        { onSuccess: (r) => listo(`Se registró la postulación ${r.numero} de ${estudiante}.`), onError: fallo },
      )
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-2">
              <Button
                render={<Link to={paths.app.coberturaComplementaria.getHref()} search={{ tab: "postulaciones" }} />}
                nativeButton={false}
                variant="outline"
                color="neutral"
                size="sm"
              >
                Cancelar
              </Button>
              <Button type="button" variant="fill" color="primary" size="sm" disabled={pending} onClick={enviar}>
                {pending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FloppyDiskIcon data-icon="inline-start" />}
                Guardar
              </Button>
            </div>
          }
        >
          <span className="inline-flex flex-wrap items-center gap-2">
            Matrícula complementaria › {editar ? `Editar opciones — Postulación ${p.numero}` : "Nueva postulación"}
            {editar ? <Marca {...ESTADO_POSTULACION[p.estado]} /> : null}
          </span>
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <div className="grid gap-5">
          <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />

          {convocatorias.length ? (
            <Aviso
              tono="info"
              titulo={`Convocatorias En postulación: ${convocatorias.map((c) => `${c.receptor} hasta el ${fecha(c.cierrePostulacion)}`).join(" · ")}.`}
            >
              Resultados el {fecha(convocatorias[0].publicacion)}. Elija hasta {MAX_OPCIONES} opciones en orden de preferencia.
            </Aviso>
          ) : null}

          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            {editar ? (
              <Lectura id="post-principal" label="Matrícula principal" valor={`${p.estudiante} · ${p.documento} · ${p.principal}`} />
            ) : (
              <CampoSelect
                id="post-principal"
                label="Matrícula principal"
                required
                value={matriculaId}
                onChange={(v) => {
                  setMatriculaId(v)
                  setFilas([filaVacia()])
                }}
                opciones={(principales.data ?? []).map((m) => ({ value: String(m.id), label: m.label }))}
                descripcion="Matrículas principales Cursando sin matrícula complementaria ni postulación vigente."
                invalido={intentado && errores.matricula}
              />
            )}
            <Lectura id="post-numero" label="Número de postulación" valor={editar ? p.numero : "Se asigna al guardar"} />
          </div>
          {!editar ? (
            <Input
              size="sm"
              aria-label="Buscar matrícula principal por nombre o documento"
              placeholder="Buscar matrícula principal por nombre o documento"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="-mt-3 md:max-w-[66%]"
            />
          ) : null}

          <fieldset className="grid gap-2">
            <legend className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              Opciones de especialidad <span className="text-red">*</span>
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
              <>
                <ol className="grid gap-3">
                  {filas.map((f, i) => {
                    const conv = convDe(f)
                    const cupo = cupoDe(f)
                    const especialidad = conv?.especialidades.find((e) => e.id === cupo?.especialidadId)
                    const repetido = cupo != null && filas.some((o, j) => j !== i && cupoDe(o)?.id === cupo.id)
                    return (
                      <li
                        key={f.key}
                        className="grid items-start gap-4 rounded-md border border-border bg-muted/40 p-4 md:grid-cols-[auto_1fr_2fr_auto]"
                      >
                        <span className="pt-2 text-sm font-semibold tabular-nums">{i + 1}.</span>
                        <CampoSelect
                          id={`post-receptor-${f.key}`}
                          label="Establecimiento que recibe"
                          required
                          value={conv ? String(conv.id) : ""}
                          onChange={(v) => actualizar(f.key, { convocatoria: v, cupo: "" })}
                          opciones={convocatorias.map((c) => ({ value: String(c.id), label: c.receptor }))}
                          invalido={intentado && !conv}
                        />
                        <div className="grid content-start gap-1">
                          <CampoSelect
                            id={`post-cupo-${f.key}`}
                            label="Cupo"
                            required
                            value={f.cupo}
                            disabled={!conv}
                            onChange={(v) => actualizar(f.key, { cupo: v })}
                            opciones={(conv?.cupos ?? []).map((c) => ({
                              value: String(c.id),
                              label: `${c.label} — Disponibles ${c.disponibles} de ${c.cupo}${c.continuidad ? " · Continuidad" : ""}`,
                            }))}
                            descripcion={
                              repetido
                                ? "Ese cupo ya está en otra opción."
                                : cupo?.continuidad
                                  ? "Continuidad: tiene prioridad en la selección."
                                  : "Cupos del grado de la principal, en otra jornada."
                            }
                            invalido={intentado && (!cupo || repetido)}
                          />
                          {especialidad && conv ? (
                            <button
                              type="button"
                              className="flex w-fit items-center gap-1 rounded-xs text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                              onClick={() =>
                                setFicha({ titulo: `${especialidad.nombre} — ${conv.receptor}`, conv, especialidadId: especialidad.id })
                              }
                            >
                              <InfoIcon className="size-3.5" aria-hidden />
                              Ver la ficha de {especialidad.nombre}
                            </button>
                          ) : null}
                        </div>
                        <div className="flex gap-1 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            color="neutral"
                            size="icon-sm"
                            aria-label={`Subir la opción ${i + 1}`}
                            disabled={i === 0}
                            onClick={() => mover(i, -1)}
                          >
                            <ArrowUpIcon />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            color="neutral"
                            size="icon-sm"
                            aria-label={`Bajar la opción ${i + 1}`}
                            disabled={i === filas.length - 1}
                            onClick={() => mover(i, 1)}
                          >
                            <ArrowDownIcon />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            color="destructive"
                            size="icon-sm"
                            aria-label={`Quitar la opción ${i + 1}`}
                            disabled={filas.length === 1}
                            onClick={() => setFilas((prev) => prev.filter((x) => x.key !== f.key))}
                          >
                            <TrashIcon />
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ol>
                {filas.length < MAX_OPCIONES ? (
                  <Button
                    type="button"
                    variant="outline"
                    color="primary"
                    size="sm"
                    className="w-fit"
                    onClick={() => setFilas((prev) => [...prev, filaVacia()])}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Agregar opción
                  </Button>
                ) : null}
              </>
            )}
          </fieldset>

          {!editar && convocatorias.length ? (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={autorizacion} onCheckedChange={(v) => setAutorizacion(v === true)} className="mt-0.5" />
              <span className="grid gap-0.5">
                <span>
                  Autorización de tratamiento de datos (Ley 1581 de 2012) <span className="text-red">*</span>
                </span>
                <span className={intentado && errores.autorizacion ? "text-xs text-red" : "text-xs text-muted-foreground"}>
                  {intentado && errores.autorizacion
                    ? "Marque la autorización para registrar la postulación."
                    : "Permite que el establecimiento que recibe consulte la información ya registrada."}
                </span>
              </span>
            </label>
          ) : null}

          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>

      {ficha ? (
        <DialogFichaEspecialidad
          titulo={ficha.titulo}
          ficha={ficha.conv.especialidades.find((e) => e.id === ficha.especialidadId)!.ficha}
          onOpenChange={(o) => !o && setFicha(null)}
        />
      ) : null}
    </TableScreen>
  )
}

function Lectura({ id, label, valor }: { id: string; label: ReactNode; valor: string }) {
  return (
    <Field variant="outlined" className="gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} size="sm" value={valor} disabled readOnly />
    </Field>
  )
}
