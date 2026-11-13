import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowsLeftRightIcon, CheckIcon, SpinnerIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import {
  useCambiarGrupoLote,
  useComplementariasQuery,
  useEmparejamientoQuery,
  useGruposDestinoQuery,
  type EmparejamientoElegido,
} from "@/features/coverage/matricula/api/acciones-lote"
import { useMatriculaCampusesQuery } from "@/features/coverage/matricula/api/query/use-matricula-campuses-query"
import { useMatriculaDependentCatalogsQuery } from "@/features/coverage/matricula/api/query/use-matricula-dependent-catalogs-query"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"
import { useMatriculaGradeLabel } from "@/features/coverage/matricula/hooks/use-matricula-grade-label"
import {
  Aviso,
  BadgeComplementaria,
  CampoSelect,
  EmparejamientoNotas,
  EstadoBadge,
  MatriculasAfectadas,
  Resumen,
  elegidoInicial,
  mensajeLote,
  nombreDe,
  plural,
  textoEmparejamiento,
  tituloAccion,
} from "@/features/coverage/matricula/components/dialogs/acciones/compartido"

/**
 * Cambiar de grupo (C.1.LOT.4): destino sede, jornada y grupo con cupo del
 * mismo grado. Con el mismo plan no hay nada que emparejar; si cambia la sede
 * o la jornada se revisa el emparejamiento de notas propuesto.
 */
function DialogCambiarGrupoIndividual({
  matriculas,
  onOpenChange,
  onDone,
}: {
  matriculas: Matricula[]
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}) {
  const { notify } = useNotify()
  const gradeLabel = useMatriculaGradeLabel()
  const ids = matriculas.map((m) => m.id)
  const origen = matriculas[0]
  const mismoGrado = matriculas.every((m) => m.grade === origen.grade)
  const { data: catalogs } = useMatriculaCampusesQuery()
  const sedeOrigen = catalogs?.sedes.find((s) => s.nombre === origen.campus)?.id ?? ""
  const [sedeElegida, setSede] = useState<string | null>(null)
  const [jornadaElegida, setJornada] = useState<string | null>(null)
  const sede = sedeElegida ?? sedeOrigen
  const jornada = jornadaElegida ?? origen.shift
  const [grupo, setGrupo] = useState("")
  const [elegido, setElegido] = useState<EmparejamientoElegido | null>(null)
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)

  const { data: dependientes } = useMatriculaDependentCatalogsQuery({ campusId: sede || undefined })
  const { data: grupos = [], isFetching: cargandoGrupos } = useGruposDestinoQuery({
    sedeId: sede,
    jornada,
    grado: mismoGrado ? origen.grade : null,
  })
  const grupoId = grupo ? Number(grupo) : null
  const { data: emparejamiento, isFetching: cargandoEmparejamiento } = useEmparejamientoQuery(ids, grupoId)
  const { data: complementarias } = useComplementariasQuery(ids)
  const cambiar = useCambiarGrupoLote()

  // La propuesta llega con el grupo: se toma como punto de partida editable.
  const [propuestaDe, setPropuestaDe] = useState<object | null>(null)
  if (emparejamiento && propuestaDe !== emparejamiento) {
    setPropuestaDe(emparejamiento)
    setElegido(elegidoInicial(emparejamiento))
  }

  const uno = matriculas.length === 1
  const grupoDestino = grupos.find((g) => g.id === grupoId)
  const conComplementaria = matriculas.filter((m) => complementarias?.get(m.id))
  const choqueComplementaria = conComplementaria
    .map((m) => complementarias?.get(m.id))
    .find((c) => c?.jornada === jornada && c?.sede === catalogs?.sedes.find((s) => s.id === sede)?.nombre)
  const sedeNombre = (id: string) => catalogs?.sedes.find((s) => s.id === id)?.label ?? ""

  function confirmar() {
    setIntentado(true)
    if (!grupoId || !mismoGrado || !emparejamiento) return
    cambiar.mutate(
      { matriculaIds: ids, grupoId, emparejamiento: emparejamiento.mismoPlan ? null : elegido },
      {
        onSuccess: (resultados) => {
          const { variant, texto } = mensajeLote(resultados, (n) =>
            uno && n === 1
              ? `${nombreDe(origen)} pasó a ${grupoDestino?.codigo ?? "el grupo nuevo"}.`
              : `${plural(n, "estudiante pasó", "estudiantes pasaron")} a ${grupoDestino?.codigo ?? "el grupo nuevo"}.`,
          )
          notify(texto, { variant })
          onDone?.()
          onOpenChange(false)
        },
        onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !cambiar.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {tituloAccion("Cambiar de grupo", matriculas)}
            {uno ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                ({[origen.group, origen.campus, origen.shift].filter(Boolean).join(" · ")})
              </span>
            ) : null}
          </DialogTitle>
          {uno ? (
            conComplementaria.length ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <BadgeComplementaria />
                {(() => {
                  const c = complementarias?.get(origen.id)
                  return c ? `${c.sede} · ${c.jornada} · ${c.especialidad}` : null
                })()}
              </div>
            ) : null
          ) : (
            <MatriculasAfectadas matriculas={matriculas} />
          )}
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        {!mismoGrado ? (
          <Aviso tono="advertencia" titulo="Los estudiantes elegidos son de grados distintos.">
            El cambio de grupo es dentro del mismo grado: quite de la selección los de otro grado o cámbielos por separado.
          </Aviso>
        ) : (
          <>
            <section className="flex flex-col gap-3" aria-label="Destino">
              <h3 className="text-sm font-semibold">Destino</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <CampoSelect
                  id="cambio-grupo-sede"
                  label="Sede"
                  required
                  value={sede}
                  onChange={(v) => {
                    setSede(v)
                    setJornada("")
                    setGrupo("")
                  }}
                  opciones={(catalogs?.sedes ?? []).filter((s) => s.activa).map((s) => ({ value: s.id, label: s.label }))}
                />
                <CampoSelect
                  id="cambio-grupo-jornada"
                  label="Jornada"
                  required
                  value={jornada}
                  onChange={(v) => {
                    setJornada(v)
                    setGrupo("")
                  }}
                  opciones={(dependientes?.shifts ?? []).map((s) => ({ value: s, label: s }))}
                  invalido={intentado && !jornada}
                />
                <CampoSelect
                  id="cambio-grupo-grupo"
                  label="Grupo"
                  required
                  value={grupo}
                  onChange={setGrupo}
                  opciones={grupos
                    .filter((g) => g.codigo !== origen.group || !uno)
                    .map((g) => ({ value: String(g.id), label: `${g.codigo} (${plural(g.capacidad - g.ocupados, "cupo", "cupos")})` }))}
                  invalido={intentado && !grupo}
                  disabled={!jornada}
                  placeholder={cargandoGrupos ? "Cargando…" : "Seleccione"}
                  descripcion={
                    intentado && !grupo
                      ? "Elija el grupo destino."
                      : `Grupos de ${gradeLabel(origen.grade)} del mismo período con cupo.`
                  }
                />
              </div>
            </section>

            {choqueComplementaria ? (
              <Aviso
                tono="advertencia"
                titulo={`La jornada ${jornada} es la de su matrícula complementaria (${choqueComplementaria.especialidad}).`}
              >
                Después de guardar el cambio, retire la matrícula complementaria o cámbiela de grupo.
              </Aviso>
            ) : null}

            {grupoId && cargandoEmparejamiento && !emparejamiento ? (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <SpinnerIcon className="animate-spin" /> Preparando el emparejamiento de notas…
              </div>
            ) : null}

            {grupoId && emparejamiento && elegido ? (
              emparejamiento.mismoPlan ? (
                <Aviso tono="info">
                  {uno ? `Pasa de ${origen.group} a ${grupoDestino?.codigo ?? ""}.` : `Pasan a ${grupoDestino?.codigo ?? ""}.`} Sus notas
                  se homologan con el mismo plan de estudio; no hay nada que emparejar.
                </Aviso>
              ) : (
                <section className="flex flex-col gap-3" aria-label="Emparejamiento de notas">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">
                      Emparejamiento de notas <span className="font-normal text-muted-foreground">· revise y ajuste la propuesta</span>
                    </h3>
                    <EstadoBadge color="success">{emparejamiento.tipo}</EstadoBadge>
                  </div>
                  <EmparejamientoNotas
                    idBase="cambio-grupo"
                    emparejamiento={emparejamiento}
                    elegido={elegido}
                    onChange={setElegido}
                  />
                  <Resumen>{textoEmparejamiento(emparejamiento)}.</Resumen>
                </section>
              )
            ) : null}
            <p className="text-xs text-muted-foreground">
              Los campos marcados con * son obligatorios
              {sede && sede !== sedeOrigen ? ` · Destino: ${sedeNombre(sede)}` : ""}
            </p>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={!mismoGrado || cambiar.isPending || (Boolean(grupoId) && !emparejamiento)}
            onClick={confirmar}
          >
            {cambiar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface Props {
  matriculas: Matricula[]
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}

/** Uno: destino libre con emparejamiento. Varios: solo otro grupo del mismo período (Regla 56). */
export function DialogCambiarGrupo(props: Props) {
  return props.matriculas.length === 1 ? <DialogCambiarGrupoIndividual {...props} /> : <DialogCambiarGrupoLote {...props} />
}

/**
 * Cambiar de grupo en lote: mismo grado, sede, jornada y Período Académico.
 * Un Grupo destino con cupo para todas; sus notas se homologan con el mismo
 * plan, así que no hay emparejamiento. Los cambios de sede o jornada van uno por uno.
 */
function DialogCambiarGrupoLote({ matriculas, onOpenChange, onDone }: Props) {
  const { notify } = useNotify()
  const gradeLabel = useMatriculaGradeLabel()
  const origen = matriculas[0]
  const n = matriculas.length
  const { data: catalogs } = useMatriculaCampusesQuery()
  const sedeId = catalogs?.sedes.find((s) => s.nombre === origen.campus)?.id ?? ""
  const { data: grupos = [], isFetching } = useGruposDestinoQuery({ sedeId, jornada: origen.shift, grado: origen.grade })
  const cambiar = useCambiarGrupoLote()
  const [grupo, setGrupo] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)

  const origenes = new Set(matriculas.map((m) => m.group))
  // Cupo para todas: las que ya están en ese grupo no ocupan un cupo nuevo.
  const opciones = grupos
    .filter((g) => g.capacidad - g.ocupados >= matriculas.filter((m) => m.group !== g.codigo).length)
    .filter((g) => !(origenes.size === 1 && origenes.has(g.codigo)))
  const destino = grupos.find((g) => String(g.id) === grupo)

  function confirmar() {
    setIntentado(true)
    if (!destino) return
    cambiar.mutate(
      { matriculaIds: matriculas.map((m) => m.id), grupoId: destino.id, emparejamiento: null },
      {
        onSuccess: (resultados) => {
          const { variant, texto } = mensajeLote(resultados, (k) => `${plural(k, "estudiante pasó", "estudiantes pasaron")} a ${destino.codigo}.`)
          notify(texto, { variant })
          onDone?.()
          onOpenChange(false)
        },
        onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !cambiar.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Cambiar de grupo — {n} estudiantes de {gradeLabel(origen.grade)}
          </DialogTitle>
          <MatriculasAfectadas matriculas={matriculas} />
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        <CampoSelect
          id="cambio-grupo-lote-sede"
          label="Sede y jornada"
          value="actual"
          onChange={() => {}}
          opciones={[{ value: "actual", label: `${origen.campus} · ${origen.shift}` }]}
          disabled
          descripcion="Los cambios de sede o jornada cambian de Período Académico: se hacen uno por uno, con el emparejamiento de notas."
        />
        <CampoSelect
          id="cambio-grupo-lote-grupo"
          label="Grupo destino"
          required
          value={grupo}
          onChange={setGrupo}
          opciones={opciones.map((g) => ({ value: String(g.id), label: `${g.codigo} · ${g.ocupados} de ${g.capacidad}` }))}
          invalido={intentado && !grupo}
          placeholder={isFetching ? "Cargando…" : "Seleccione"}
          descripcion={
            intentado && !grupo
              ? "Elija el grupo destino."
              : `Grupos de ${gradeLabel(origen.grade)} del mismo período con cupo para los ${n}.`
          }
        />
        {destino ? (
          <Aviso tono="info">
            {n} estudiantes pasan a {destino.codigo}. Sus notas se homologan con el mismo plan de estudio.
          </Aviso>
        ) : null}
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" disabled={cambiar.isPending} onClick={confirmar}>
            {cambiar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <ArrowsLeftRightIcon data-icon="inline-start" />
            )}
            Cambiar de grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
