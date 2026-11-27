import { useState } from "react"
import { Link, useParams } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeftIcon, CheckIcon, ListNumbersIcon, SpinnerIcon, WarningIcon, XIcon } from "@/components/ui/icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaConvocatoriaSeleccionarRoute } from "@/router"

import {
  useConvocatoriaQuery,
  useSeleccionar,
  useSeleccionCupoQuery,
} from "@/features/coverage/matricula-complementaria/api/convocatorias"
import type { Convocatoria, SeleccionCupo } from "@/features/coverage/matricula-complementaria/api/types"
import {
  ESTADO_CONVOCATORIA,
  ESTADO_OPCION,
  Marca,
  fecha,
  fechaHora,
  nombreCupo,
} from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import { Cifras, DialogListaSorteo } from "@/features/coverage/matricula-complementaria/components/dialogs-convocatoria"
import { CampoSelect } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"

const num = "text-center tabular-nums"

/**
 * Seleccionar por cupo (Regla 53): Modo Manual de la forma Abierta en selección,
 * o la lista de espera (Publicada). Se confirma en el orden de selección
 * —Continuidad primero y luego el Desempate— sin saltar una opción con lugar.
 */
export function ConvocatoriaSeleccionarPage() {
  return (
    <NoticeProvider>
      <Contenido />
    </NoticeProvider>
  )
}

function Contenido() {
  const { convocatoriaId } = useParams({ strict: false }) as { convocatoriaId?: string }
  const id = Number(convocatoriaId)
  const search = coberturaConvocatoriaSeleccionarRoute.useSearch()
  const navigate = coberturaConvocatoriaSeleccionarRoute.useNavigate()
  const { data: c, isPending, isError, error } = useConvocatoriaQuery(id)
  const cupoId = search.cupo ?? c?.cupos[0]?.id ?? null
  const seleccion = useSeleccionCupoQuery(id, cupoId)
  const [dialogo, setDialogo] = useState<"confirmar" | "sorteo" | null>(null)

  const s = seleccion.data
  const enSeleccion = c?.estado === "EN_SELECCION"
  // Con la lista de espera de la forma por el origen, el orden es siempre la fecha de registro.
  const conSorteo = c?.forma === "ABIERTA" && c.desempate === "SORTEO"
  const disponibles = s ? Math.max(0, s.cupo.cupo - s.cupo.seleccionados) : 0

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-2">
              <Button
                render={<Link to={paths.app.coberturaComplementaria.getHref()} />}
                nativeButton={false}
                variant="outline"
                color="neutral"
                size="sm"
              >
                <ArrowLeftIcon data-icon="inline-start" />
                Volver
              </Button>
              <Button
                type="button"
                variant="fill"
                color="primary"
                size="sm"
                disabled={!s || s.opciones.length === 0 || disponibles === 0}
                onClick={() => setDialogo("confirmar")}
              >
                <CheckIcon data-icon="inline-start" />
                Seleccionar
              </Button>
            </div>
          }
        >
          <span className="inline-flex flex-wrap items-center gap-2">
            Matrícula complementaria › Convocatoria {c?.anio ?? ""} › Seleccionar
            {c ? <Marca {...ESTADO_CONVOCATORIA[c.estado]} /> : null}
          </span>
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        {isPending ? (
          <Cargando />
        ) : isError ? (
          <p className="p-10 text-center text-red">{getErrorMessage(error)}</p>
        ) : (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <CampoSelect
                id="seleccionar-cupo"
                label="Cupo"
                required
                value={cupoId == null ? "" : String(cupoId)}
                onChange={(v) => navigate({ search: { cupo: v ? Number(v) : undefined }, replace: true })}
                opciones={c.cupos.map((x) => ({ value: String(x.id), label: nombreCupo(x) }))}
                className="w-full sm:w-80"
              />
              {s ? (
                <>
                  <Cifras>
                    {enSeleccion ? (
                      <span>
                        Cupo: <b>{s.cupo.cupo}</b> · Seleccionados: <b>{s.cupo.seleccionados}</b> · Postuladas: <b>{s.postuladas}</b>
                      </span>
                    ) : (
                      <span>
                        Cupo: <b>{s.cupo.cupo}</b> · Seleccionados: <b>{s.cupo.seleccionados}</b> · Disponibles: <b>{disponibles}</b> ·
                        En lista de espera: <b>{s.opciones.length}</b>
                      </span>
                    )}
                  </Cifras>
                  {s.convenios.map((cv) => (
                    <Cifras key={cv.origen}>
                      <span>
                        Convenio {cv.origen}:{" "}
                        <b>
                          {cv.adscritos} de {cv.maximo}
                        </b>{" "}
                        adscritos
                      </span>
                    </Cifras>
                  ))}
                </>
              ) : null}
              {conSorteo ? (
                <Button type="button" variant="outline" color="neutral" size="sm" className="ml-auto" onClick={() => setDialogo("sorteo")}>
                  <ListNumbersIcon data-icon="inline-start" />
                  Generar lista del sorteo
                </Button>
              ) : null}
            </div>

            {seleccion.isPending ? (
              <Cargando />
            ) : seleccion.isError ? (
              <p className="p-10 text-center text-red">{getErrorMessage(seleccion.error)}</p>
            ) : (
              // El borde y el radio los pone `Table`: otra caja alrededor dejaba doble línea.
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={num} title={c.forma === "ORIGEN" ? "Orden de selección: fecha y hora de registro." : "Orden de selección: Continuidad primero y luego el desempate."}>
                      Pos.
                    </TableHead>
                    <TableHead>Postulación</TableHead>
                    <TableHead>Estudiante</TableHead>
                    <TableHead>Establecimiento de origen</TableHead>
                    <TableHead className={conSorteo ? num : undefined}>{conSorteo ? "Sorteo" : "Registro"}</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!s || s.opciones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        {enSeleccion ? "No quedan postulaciones Inscrito en este cupo." : "No hay postulaciones en lista de espera en este cupo."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    s.opciones.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className={num}>{o.posicion}</TableCell>
                        <TableCell className="tabular-nums">{o.postulacion}</TableCell>
                        <TableCell>
                          <span className="inline-flex flex-wrap items-center gap-2">
                            {o.estudiante}
                            {o.continuidad ? <Marca label="Continuidad" color="secondary" /> : null}
                          </span>
                        </TableCell>
                        <TableCell>{o.origen}</TableCell>
                        <TableCell className={conSorteo ? num : "tabular-nums"}>
                          {conSorteo ? o.sorteo : fechaHora(o.registro)}
                        </TableCell>
                        <TableCell>
                          <Marca {...ESTADO_OPCION[o.estado]} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </TableScreenBody>

      {dialogo === "confirmar" && c && s ? (
        <DialogConfirmarSeleccion convocatoria={c} seleccion={s} onOpenChange={(o) => !o && setDialogo(null)} />
      ) : null}
      {dialogo === "sorteo" && c ? (
        <DialogListaSorteo convocatoria={c} cupoInicial={cupoId ?? undefined} onOpenChange={(o) => !o && setDialogo(null)} />
      ) : null}
    </TableScreen>
  )
}

function Cargando() {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
      <SpinnerIcon className="animate-spin" aria-hidden />
      Cargando…
    </div>
  )
}

/** Lo que haría Seleccionar: sigue el orden, sin pasar los lugares ni el cupo de cada convenio. */
export function previaSeleccion(s: SeleccionCupo) {
  let libres = Math.max(0, s.cupo.cupo - s.cupo.seleccionados)
  const usados = new Map(s.convenios.map((cv) => [cv.origen, cv.adscritos]))
  const maximo = new Map(s.convenios.map((cv) => [cv.origen, cv.maximo]))
  const porOrigen = new Map<string, number>()
  let registrados = 0
  for (const o of s.opciones) {
    const u = usados.get(o.origen) ?? 0
    if (libres > 0 && u < (maximo.get(o.origen) ?? Infinity)) {
      usados.set(o.origen, u + 1)
      porOrigen.set(o.origen, (porOrigen.get(o.origen) ?? 0) + 1)
      libres--
      registrados++
    }
  }
  return { registrados, enEspera: s.opciones.length - registrados, porOrigen }
}

function DialogConfirmarSeleccion({
  convocatoria: c,
  seleccion: s,
  onOpenChange,
}: {
  convocatoria: Convocatoria
  seleccion: SeleccionCupo
  onOpenChange: (open: boolean) => void
}) {
  const { notify } = useNotify()
  const seleccionar = useSeleccionar()
  const [aviso, setAviso] = useState<{ id: number; message: string } | null>(null)
  const p = previaSeleccion(s)
  const lugares = Math.max(0, s.cupo.cupo - s.cupo.seleccionados)
  const orden =
    c.forma === "ORIGEN"
      ? "la fecha y hora de registro"
      : c.desempate === "SORTEO"
        ? "Continuidad primero y luego el sorteo"
        : "Continuidad primero y luego el orden de inscripción"
  const publicada = c.estado !== "EN_SELECCION"

  return (
    <Dialog open onOpenChange={(o) => !seleccionar.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <WarningIcon className="size-6 shrink-0 text-yellow" aria-hidden />
            <DialogTitle>Seleccionar en {nombreCupo(s.cupo)}</DialogTitle>
          </div>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <p className="text-sm">
          Hay {lugares} {lugares === 1 ? "lugar" : "lugares"} y {s.opciones.length}{" "}
          {publicada ? "opciones en lista de espera" : "opciones postuladas"}. Según el orden de selección ({orden}):
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Conteo n={p.registrados} estado="REGISTRADO" />
          <Conteo n={p.enEspera} estado="EN_LISTA_ESPERA" />
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            {s.convenios
              .map((cv) => `${cv.origen}: ${p.porOrigen.get(cv.origen) ?? 0} seleccionados de un cupo de convenio de ${cv.maximo}`)
              .join(" · ")}
            .
          </li>
          <li>
            {publicada || !c.publicacion
              ? "Cada nueva selección se notifica en el momento."
              : `Los resultados se notificarán el ${fecha(c.publicacion)}, Fecha de publicación de resultados.`}
          </li>
        </ul>
        <DialogFooter>
          <Button variant="outline" color="neutral" type="button" size="sm" onClick={() => onOpenChange(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={seleccionar.isPending || p.registrados === 0}
            onClick={() =>
              seleccionar.mutate(
                { id: c.id, cupoId: s.cupo.id as number },
                {
                  onSuccess: (r) => {
                    notify(
                      `${r.registrados} ${r.registrados === 1 ? "opción quedó Registrado" : "opciones quedaron Registrado"} en ${nombreCupo(s.cupo)}.`,
                      { variant: "success" },
                    )
                    onOpenChange(false)
                  },
                  onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }),
                },
              )
            }
          >
            {seleccionar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Seleccionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Conteo({ n, estado }: { n: number; estado: "REGISTRADO" | "EN_LISTA_ESPERA" }) {
  return (
    <div className="grid gap-1 rounded-md border border-border p-4">
      <span className={estado === "REGISTRADO" ? "text-2xl font-semibold text-green" : "text-2xl font-semibold text-yellow"}>
        {n}
      </span>
      <Marca {...ESTADO_OPCION[estado]} />
    </div>
  )
}
