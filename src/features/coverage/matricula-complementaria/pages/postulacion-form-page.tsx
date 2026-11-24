import { useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { NoticeProvider, queueNotice } from "@/components/notice/notice-context"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, InfoIcon, SpinnerIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { paths } from "@/config/paths"
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

/**
 * Nueva postulación y Cambiar cupo (Sección 2.16.2, Postulación): una opción por
 * postulación. Con la forma Abierta queda Inscrito; con la forma por el origen
 * nace Registrado y ocupa el cupo, o entra a la lista de espera si la hay.
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
            <TableScreenTitle ruta="Matrícula complementaria">Cambiar cupo</TableScreenTitle>
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

function Formulario({ postulacion: p }: { postulacion: Postulacion | undefined }) {
  const navigate = useNavigate()
  const editar = p != null
  const [matriculaId, setMatriculaId] = useState(p ? String(p.matriculaPrincipalId) : "")
  const [buscar, setBuscar] = useState("")
  const principales = usePrincipalesPostulablesQuery(buscar)
  const opciones = useOpcionesPostulacionQuery(matriculaId ? Number(matriculaId) : null)

  const [receptor, setReceptor] = useState(p ? String(p.convocatoriaId) : "")
  const [especialidadElegida, setEspecialidad] = useState(p ? String(p.especialidadId) : "")
  const [cupoId, setCupoId] = useState(p ? String(p.cupoId) : "")
  // Autorización de datos opcional (Regla 81): no viene marcada y no frena la postulación.
  const [autorizacion, setAutorizacion] = useState(false)
  const [intentado, setIntentado] = useState(false)
  const [aviso, setAviso] = useState<{ id: number; message: string } | null>(null)
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
      queueNotice(texto, { variant: "success" })
      navigate({ to: paths.app.coberturaComplementaria.getHref(), search: { tab: "postulaciones" } })
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
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          ruta="Matrícula complementaria"
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
              <Button type="button" variant="fill" color="primary" size="sm" disabled={pending} onClick={() => enviar()}>
                {pending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FloppyDiskIcon data-icon="inline-start" />}
                Guardar
              </Button>
            </div>
          }
        >
          <span className="inline-flex flex-wrap items-center gap-2">
            {editar ? `Cambiar cupo — Postulación ${p.numero}` : "Nueva postulación"}
            {editar ? <Marca {...ESTADO_OPCION[p.estado]} /> : null}
          </span>
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
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
                  setReceptor("")
                  setEspecialidad("")
                  setCupoId("")
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
              <span className="text-red">*</span> Opción de especialidad
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
              <div className="grid gap-4 rounded-md border border-border bg-muted/40 p-4 md:grid-cols-[1fr_1fr_2fr]">
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
                  opciones={cupos
                    .map((c) => ({
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

          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>

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
