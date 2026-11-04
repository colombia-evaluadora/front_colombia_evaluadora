import { useState } from "react"

import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/api-client"
import { fetchArchivoViewUrl } from "@/lib/files"
import { DialogoEleccion, DialogoProceso, DialogoTexto } from "@/features/comunicaciones/procesos/components/dialogos"
import { paths } from "@/config/paths"
import { procesoDetalleRoute } from "@/router"
import {
  ESTADO_POSTULACION_LABEL,
  ETAPA_LABEL,
  FUNCION_LABEL,
  aIso,
  fechaCorta,
  useAccionProceso,
  useActasQuery,
  useCandidaturasQuery,
  useDescargarActa,
  useDesignacionesQuery,
  usePadronQuery,
  usePersonasQuery,
  usePostulacionesQuery,
  useProcesoQuery,
  useReclamacionesQuery,
} from "@/features/comunicaciones/procesos/api/procesos"
import type { EleccionProceso, Funcion, Postulacion, Proceso } from "@/features/comunicaciones/procesos/api/procesos"

export function ProcesoDetallePage() {
  return (
    <NoticeProvider>
      <Contenido />
    </NoticeProvider>
  )
}

function Contenido() {
  const { id } = procesoDetalleRoute.useParams()
  const q = useProcesoQuery(Number(id))
  const { notify } = useNotify()
  const accion = useAccionProceso()
  const [editar, setEditar] = useState(false)
  const [agregar, setAgregar] = useState(false)
  const [eliminar, setEliminar] = useState(false)
  const navigate = procesoDetalleRoute.useNavigate()
  const hecho = (m: string) => notify(m)
  if (q.isPending) return <Spinner className="m-6" />
  if (q.isError || !q.data) return <p className="p-6 text-sm text-red">{q.isError ? getErrorMessage(q.error) : "El proceso no existe."}</p>
  const p = q.data
  const admin = p.misFunciones.includes("ADMINISTRADOR")
  const ejecutar = (ruta: string, mensaje: string, metodo?: "patch") =>
    accion.mutate({ ruta, metodo }, { onSuccess: () => notify(mensaje), onError: (e) => notify(getErrorMessage(e), { variant: "error" }) })
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{p.nombre}</h1>
          <p className="text-sm text-muted-foreground">{p.objeto}</p>
          <p className="text-xs text-muted-foreground">Convocatoria versión {p.version}{p.publicadoEn ? ` · publicada ${fechaCorta(p.publicadoEn)}` : " · sin publicar"}</p>
        </div>
        {admin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" color="neutral" onClick={() => setEditar(true)}>Modificar</Button>
            {!p.publicadoEn && <Button variant="outline" color="destructive" onClick={() => setEliminar(true)}>Eliminar</Button>}
            {!p.publicadoEn && <Button variant="outline" color="neutral" onClick={() => setAgregar(true)}>Agregar elección</Button>}
            {!p.publicadoEn && <Button onClick={() => ejecutar(`/${p.id}/publicar`, "Convocatoria publicada.")}>Publicar convocatoria</Button>}
          </div>
        )}
      </div>
      <NoticeOutlet />
      {p.reglamento && (
        <section>
          <h2 className="text-sm font-medium">Reglamento</h2>
          <p className="whitespace-pre-wrap text-sm">{p.reglamento}</p>
        </section>
      )}
      {p.funciones.length > 0 && (
        <section className="text-sm">
          <h2 className="font-medium">Funciones</h2>
          <ul className="list-disc pl-5">
            {p.funciones.map((f) => <li key={`${f.usuario}-${f.funcion}`}>{FUNCION_LABEL[f.funcion]}: {f.nombre}</li>)}
          </ul>
        </section>
      )}
      {p.elecciones.length === 0 ? <p className="text-sm text-muted-foreground">Agrega al menos una elección o selección.</p> : (
        <Tabs defaultValue={String(p.elecciones[0].id)}>
          <TabsList>
            {p.elecciones.map((e) => <TabsTrigger key={e.id} value={String(e.id)}>{e.nombre}</TabsTrigger>)}
          </TabsList>
          {p.elecciones.map((e) => (
            <TabsContent key={e.id} value={String(e.id)}>
              <PanelEleccion proceso={p} e={e} onHecho={hecho} />
            </TabsContent>
          ))}
        </Tabs>
      )}
      {editar && <DialogoProceso proceso={p} onCerrar={() => setEditar(false)} onHecho={(m) => { setEditar(false); notify(m) }} />}
      {eliminar && (
        <DialogoTexto titulo="Eliminar proceso" descripcion="Se elimina con sus elecciones en preparación y queda en la Bitácora."
          accion={`/${p.id}/eliminar`} metodo="patch" onCerrar={() => setEliminar(false)}
          onHecho={() => navigate({ to: paths.app.comunicacionesProcesos.getHref() })} />
      )}
      {agregar && <DialogoEleccion proceso={p} onCerrar={() => setAgregar(false)} onHecho={(m) => { setAgregar(false); notify(m) }} />}
    </div>
  )
}

type Texto = { titulo: string; etiqueta?: string; descripcion?: string; accion: string; metodo?: "patch"; campo?: string; extra?: Record<string, unknown> }

function PanelEleccion({ proceso, e, onHecho }: { proceso: Proceso; e: EleccionProceso; onHecho: (m: string) => void }) {
  const mias = (f: Funcion) => proceso.misFunciones.includes(f)
  const [editar, setEditar] = useState(false)
  const [texto, setTexto] = useState<Texto | null>(null)
  const [decidir, setDecidir] = useState<"seleccion" | "decision" | null>(null)
  const admin = mias("ADMINISTRADOR")
  const m = useAccionProceso()
  const { notify } = useNotify()
  const ejecutar = (ruta: string, mensaje: string) =>
    m.mutate({ ruta }, { onSuccess: () => notify(mensaje), onError: (x) => notify(getErrorMessage(x), { variant: "error" }) })
  const base = `/elecciones/${e.id}`
  const cerrada = ["RESULTADOS", "RECLAMACIONES", "FORMALIZACION", "CERRADA"].includes(e.etapa)
  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="soft" color="info">{ETAPA_LABEL[e.etapa]}</Badge>
        {e.condicion !== "NORMAL" && <Badge variant="soft" color="warning">{e.condicion === "SUSPENDIDA" ? "Suspendida" : "Anulada"}</Badge>}
        <span>{e.metodo === "VOTACION" ? "Votación secreta" : "Selección motivada"} · {e.titulares} titular(es), {e.suplentes} suplente(s)</span>
        <span className="text-muted-foreground">Postulaciones {fechaCorta(e.postulacionDesde)} – {fechaCorta(e.postulacionHasta)}</span>
        {e.reclamacionHasta && <span className="text-muted-foreground">Reclamaciones hasta {fechaCorta(e.reclamacionHasta)}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {admin && ["PREPARACION", "POSTULACIONES"].includes(e.etapa) && <Button size="sm" variant="outline" color="neutral" onClick={() => setEditar(true)}>Modificar</Button>}
        {admin && e.etapa === "PREPARACION" && <Button size="sm" variant="outline" color="destructive" onClick={() => setTexto({ titulo: "Eliminar elección", descripcion: "Se elimina por completo y queda en la Bitácora.", accion: `${base}/eliminar`, metodo: "patch" })}>Eliminar</Button>}
        {(admin || mias("REVISOR")) && e.etapa === "POSTULACIONES" && <Button size="sm" onClick={() => ejecutar(`${base}/lista-definitiva`, "Lista definitiva publicada.")}>Publicar lista definitiva</Button>}
        {admin && e.etapa === "DECISION" && e.metodo === "VOTACION" && !e.canal && <Button size="sm" onClick={() => ejecutar(`${base}/abrir-votacion`, "Votación abierta.")}>Abrir votación</Button>}
        {mias("ESCRUTINIO") && e.etapa === "DECISION" && e.canal && <Button size="sm" onClick={() => ejecutar(`${base}/cerrar-votacion`, "Votación cerrada y escrutinio generado.")}>Cerrar y escrutar</Button>}
        {mias("SELECTOR") && e.etapa === "DECISION" && e.metodo === "SELECCION_MOTIVADA" && <Button size="sm" onClick={() => setDecidir("seleccion")}>Registrar selección</Button>}
        {(mias("ESCRUTINIO") || mias("SELECTOR")) && e.etapa === "RESULTADOS" && <Button size="sm" onClick={() => ejecutar(`${base}/publicar-resultados`, "Resultados provisionales publicados.")}>Publicar resultados</Button>}
        {(mias("ESCRUTINIO") || mias("SELECTOR") || mias("RECLAMACIONES")) && ["RESULTADOS", "RECLAMACIONES", "FORMALIZACION"].includes(e.etapa) && <Button size="sm" variant="outline" color="neutral" onClick={() => setDecidir("decision")}>Decisión documentada</Button>}
        {mias("FORMALIZACION") && ["RECLAMACIONES", "FORMALIZACION"].includes(e.etapa) && <Button size="sm" onClick={() => ejecutar(`${base}/formalizar`, "Acta definitiva generada.")}>Formalizar</Button>}
        {admin && e.condicion === "NORMAL" && e.etapa !== "CERRADA" && e.etapa !== "PREPARACION" && <Button size="sm" variant="outline" color="neutral" onClick={() => setTexto({ titulo: "Suspender elección", etiqueta: "* Motivo", accion: `${base}/suspender` })}>Suspender</Button>}
        {admin && e.condicion === "SUSPENDIDA" && <Button size="sm" variant="outline" color="neutral" onClick={() => setTexto({ titulo: "Reanudar elección", etiqueta: "* Motivo", accion: `${base}/reanudar` })}>Reanudar</Button>}
        {proceso.puedeAnular && e.condicion !== "ANULADA" && e.etapa !== "PREPARACION" && <Button size="sm" variant="outline" color="destructive" onClick={() => setTexto({ titulo: "Anular elección", etiqueta: "* Motivo", accion: `${base}/anular` })}>Anular</Button>}
        {admin && (cerrada || e.condicion === "ANULADA") && <Button size="sm" variant="outline" color="neutral" onClick={() => ejecutar(`${base}/vinculada`, "Elección vinculada creada, sin trasladar votos.")}>Crear elección vinculada</Button>}
      </div>
      <Tabs defaultValue="candidaturas">
        <TabsList>
          <TabsTrigger value="candidaturas">Candidaturas</TabsTrigger>
          {(admin || mias("REVISOR")) && <TabsTrigger value="postulaciones">Postulaciones</TabsTrigger>}
          {e.metodo === "VOTACION" && (admin || mias("ESCRUTINIO")) && <TabsTrigger value="padron">Padrón</TabsTrigger>}
          <TabsTrigger value="resultados">Resultados y actas</TabsTrigger>
          <TabsTrigger value="reclamaciones">Reclamaciones</TabsTrigger>
          <TabsTrigger value="formalizacion">Formalización</TabsTrigger>
        </TabsList>
        <TabsContent value="candidaturas"><Candidaturas e={e} /></TabsContent>
        <TabsContent value="postulaciones"><Postulaciones e={e} revisor={mias("REVISOR")} /></TabsContent>
        <TabsContent value="padron"><PadronPanel e={e} admin={admin} /></TabsContent>
        <TabsContent value="resultados"><Resultados e={e} /></TabsContent>
        <TabsContent value="reclamaciones"><Reclamaciones e={e} responsable={mias("RECLAMACIONES")} /></TabsContent>
        <TabsContent value="formalizacion"><Formalizacion e={e} responsable={mias("FORMALIZACION")} /></TabsContent>
      </Tabs>
      {editar && <DialogoEleccion proceso={proceso} eleccion={e} onCerrar={() => setEditar(false)} onHecho={(x) => { setEditar(false); onHecho(x) }} />}
      {texto && <DialogoTexto {...texto} onCerrar={() => setTexto(null)} onHecho={(x) => { setTexto(null); onHecho(x) }} />}
      {decidir && <DialogoDecision e={e} tipo={decidir} onCerrar={() => setDecidir(null)} onHecho={(x) => { setDecidir(null); onHecho(x) }} />}
    </div>
  )
}

function Candidaturas({ e }: { e: EleccionProceso }) {
  const q = useCandidaturasQuery(e.id)
  if (q.isPending) return <Spinner />
  if (!e.listaPublicadaEn) return <p className="py-4 text-sm text-muted-foreground">La lista definitiva aún no se ha publicado.</p>
  if (!q.data?.length) return <p className="py-4 text-sm text-muted-foreground">No hay candidaturas habilitadas.</p>
  return (
    <ul className="flex flex-col gap-2 py-2">
      {q.data.map((c) => <li key={c.id} className="rounded border p-3 text-sm"><p className="font-medium">{c.nombre}</p><p className="whitespace-pre-wrap">{c.propuesta}</p></li>)}
    </ul>
  )
}

function Postulaciones({ e, revisor }: { e: EleccionProceso; revisor: boolean }) {
  const q = usePostulacionesQuery(e.id, true)
  const [revisar, setRevisar] = useState<Postulacion | null>(null)
  const { notify } = useNotify()
  if (q.isPending) return <Spinner />
  if (q.isError) return <p className="text-sm text-red">{getErrorMessage(q.error)}</p>
  return (
    <>
      <Table>
        <TableHeader><TableRow><TableHead>Candidato</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead><TableHead>Presentada</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {q.data.length === 0 && <TableRow><TableCell colSpan={5}>Aún no hay postulaciones.</TableCell></TableRow>}
          {q.data.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.nombre}</TableCell>
              <TableCell>{p.propuestoPor ? `Por tercero (${p.propuestoPor})` : "Autopostulación"}</TableCell>
              <TableCell>{ESTADO_POSTULACION_LABEL[p.estado]}{p.subsanarHasta ? ` · límite ${fechaCorta(p.subsanarHasta)}` : ""}</TableCell>
              <TableCell>{fechaCorta(p.presentadaEn)}</TableCell>
              <TableCell>{revisor && p.estado === "PRESENTADA" && e.etapa === "POSTULACIONES" && <Button size="sm" variant="outline" color="neutral" onClick={() => setRevisar(p)}>Revisar</Button>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {revisar && <DialogoRevisar e={e} p={revisar} onCerrar={() => setRevisar(null)} onHecho={(m) => { setRevisar(null); notify(m) }} />}
    </>
  )
}

/** M.4.POS.1a. Cada requisito se marca; la decisión la valida también el backend. */
function DialogoRevisar({ e, p, onCerrar, onHecho }: { e: EleccionProceso; p: Postulacion; onCerrar: () => void; onHecho: (m: string) => void }) {
  const m = useAccionProceso()
  const [error, setError] = useState<string | null>(null)
  const [res, setRes] = useState<Record<string, { resultado: string; observacion: string }>>(
    Object.fromEntries(e.requisitos.map((r) => [r, { resultado: "CUMPLE", observacion: "" }])),
  )
  const [motivo, setMotivo] = useState("")
  const [limite, setLimite] = useState("")
  const enviar = (decision: string) => m.mutate({
    ruta: `/postulaciones/${p.id}/revisar`,
    cuerpo: {
      DECISION: decision,
      MOTIVO: motivo || null,
      LIMITE: aIso(limite),
      REQUISITOS: Object.entries(res).map(([REQUISITO, r]) => ({ REQUISITO, RESULTADO: r.resultado, OBSERVACION: r.observacion })),
    },
  }, { onSuccess: () => onHecho("Revisión registrada."), onError: (x) => setError(getErrorMessage(x)) })
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Revisar: {p.nombre}</DialogTitle></DialogHeader>
        {error && <NoticeBanner onClose={() => setError(null)} variant="error" notice={{ id: 0, message: error }} />}
        <p className="whitespace-pre-wrap text-sm">{p.propuesta}</p>
        {p.documentos.length > 0 && <ul className="list-disc pl-5 text-sm">{p.documentos.map((d) => (
          <li key={d.id}>
            {d.nombre} ({d.tipo === "AUTORIZACION" ? "autorización" : "soporte"}, reservado)
            {/* Token de vista corto; file-service solo lo da al candidato y al revisor (ReglaDocumentoProceso). */}
            <Button size="sm" variant="link" onClick={() => fetchArchivoViewUrl(d.archivo).then((t) => window.open(t.url, "_blank", "noopener")).catch((x) => setError(getErrorMessage(x)))}>Abrir</Button>
          </li>
        ))}</ul>}
        {e.requisitos.map((r) => (
          <Field key={r}>
            <FieldLabel>{r}</FieldLabel>
            <NativeSelect value={res[r].resultado} onChange={(x) => setRes((v) => ({ ...v, [r]: { ...v[r], resultado: x.target.value } }))}>
              <NativeSelectOption value="CUMPLE">Cumple</NativeSelectOption>
              <NativeSelectOption value="NO_CUMPLE">No cumple</NativeSelectOption>
              <NativeSelectOption value="SUBSANAR">Pendiente de subsanar</NativeSelectOption>
            </NativeSelect>
            <Input placeholder="Observación" value={res[r].observacion} onChange={(x) => setRes((v) => ({ ...v, [r]: { ...v[r], observacion: x.target.value } }))} />
          </Field>
        ))}
        <Field><FieldLabel>Motivo y vía de reclamación (si no se habilita)</FieldLabel><Textarea value={motivo} onChange={(x) => setMotivo(x.target.value)} /></Field>
        <Field><FieldLabel>Fecha límite de subsanación</FieldLabel><Input type="datetime-local" value={limite} onChange={(x) => setLimite(x.target.value)} /></Field>
        <DialogFooter>
          <Button variant="outline" color="neutral" onClick={onCerrar}>Cancelar</Button>
          <Button variant="outline" color="destructive" disabled={m.isPending} onClick={() => enviar("NO_HABILITAR")}>No habilitar</Button>
          <Button variant="outline" color="neutral" disabled={m.isPending} onClick={() => enviar("SUBSANAR")}>Pedir subsanación</Button>
          <Button disabled={m.isPending} onClick={() => enviar("HABILITAR")}>Habilitar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const VINCULOS = ["ESTUDIANTES", "ACUDIENTES", "FUNCIONARIOS"] as const

function PadronPanel({ e, admin }: { e: EleccionProceso; admin: boolean }) {
  const q = usePadronQuery(e.id, true)
  const m = useAccionProceso()
  const { notify } = useNotify()
  const [excepcion, setExcepcion] = useState(false)
  const padron = q.data?.[0]
  const editable = admin && !padron?.aprobadoEn && ["POSTULACIONES", "DECISION"].includes(e.etapa)
  const ejecutar = (ruta: string, mensaje: string) =>
    m.mutate({ ruta }, { onSuccess: () => notify(mensaje), onError: (x) => notify(getErrorMessage(x), { variant: "error" }) })
  if (q.isPending) return <Spinner />
  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">{padron ? `${padron.aprobadoEn ? `Aprobado ${fechaCorta(padron.aprobadoEn)}` : "Versión preliminar"} · corte ${fechaCorta(padron.corte)} · ${padron.regla}` : "Aún no se ha generado el padrón."}</p>
        {editable && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" color="neutral" onClick={() => ejecutar(`/elecciones/${e.id}/padron/generar`, "Padrón generado.")}>Generar</Button>
            {padron && <Button size="sm" variant="outline" color="neutral" onClick={() => setExcepcion(true)}>Incluir o excluir</Button>}
            {padron && <Button size="sm" onClick={() => ejecutar(`/elecciones/${e.id}/padron/aprobar`, "Padrón aprobado: ya no se recalcula.")}>Aprobar padrón</Button>}
          </div>
        )}
      </div>
      {padron && (
        <Table>
          <TableHeader><TableRow><TableHead>Persona</TableHead><TableHead>Vínculo</TableHead><TableHead>Condición</TableHead><TableHead>Motivo</TableHead></TableRow></TableHeader>
          <TableBody>
            {padron.personas.map((x) => <TableRow key={x.usuario}><TableCell>{x.nombre}</TableCell><TableCell>{x.vinculo}</TableCell><TableCell>{x.condicion === "HABILITADA" ? "Habilitada" : "Excluida"}</TableCell><TableCell>{x.motivo ?? "—"}</TableCell></TableRow>)}
          </TableBody>
        </Table>
      )}
      {excepcion && <DialogoExcepcion e={e} onCerrar={() => setExcepcion(false)} onHecho={(t) => { setExcepcion(false); notify(t) }} />}
    </div>
  )
}

function DialogoExcepcion({ e, onCerrar, onHecho }: { e: EleccionProceso; onCerrar: () => void; onHecho: (m: string) => void }) {
  const m = useAccionProceso()
  const [tipo, setTipo] = useState<(typeof VINCULOS)[number]>("ESTUDIANTES")
  const personas = usePersonasQuery(tipo)
  const [usuario, setUsuario] = useState("")
  const [accion, setAccion] = useState("EXCLUIR")
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState<string | null>(null)
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Inclusión o exclusión excepcional</DialogTitle></DialogHeader>
        {error && <NoticeBanner onClose={() => setError(null)} variant="error" notice={{ id: 0, message: error }} />}
        <NativeSelect value={accion} onChange={(x) => setAccion(x.target.value)}>
          <NativeSelectOption value="EXCLUIR">Excluir</NativeSelectOption>
          <NativeSelectOption value="INCLUIR">Incluir</NativeSelectOption>
        </NativeSelect>
        <NativeSelect value={tipo} onChange={(x) => { setTipo(x.target.value as typeof tipo); setUsuario("") }}>
          {VINCULOS.map((v) => <NativeSelectOption key={v} value={v}>{v}</NativeSelectOption>)}
        </NativeSelect>
        <NativeSelect value={usuario} onChange={(x) => setUsuario(x.target.value)}>
          <NativeSelectOption value="">Elige la persona</NativeSelectOption>
          {(personas.data ?? []).map((p) => <NativeSelectOption key={p.id} value={String(p.id)}>{p.nombre}</NativeSelectOption>)}
        </NativeSelect>
        <Field><FieldLabel>* Motivo</FieldLabel><Textarea value={motivo} onChange={(x) => setMotivo(x.target.value)} /></Field>
        <DialogFooter>
          <Button variant="outline" color="neutral" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={!usuario || !motivo.trim() || m.isPending} onClick={() => m.mutate(
            { ruta: `/elecciones/${e.id}/padron/excepcion`, cuerpo: { USUARIO: Number(usuario), ACCION: accion, MOTIVO: motivo } },
            { onSuccess: () => onHecho("Excepción registrada."), onError: (x) => setError(getErrorMessage(x)) },
          )}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** M.4.ESC.1: solo conteos. Las incidencias no se resuelven solas: el mecanismo publicado decide. */
function Resultados({ e }: { e: EleccionProceso }) {
  const q = useActasQuery(e.id)
  const descargar = useDescargarActa()
  const { notify } = useNotify()
  if (q.isPending) return <Spinner />
  if (!q.data?.length) return <p className="py-4 text-sm text-muted-foreground">Aún no hay resultados publicados.</p>
  const [ultima] = q.data
  const c = ultima.contenido
  return (
    <div className="flex flex-col gap-3 py-2 text-sm">
      {c.votos != null && <p>Habilitados {c.habilitados} · Votos aceptados {c.votos} · Participación {c.participacionPct} % · Abstención {c.abstencion} · En blanco {c.blancos}</p>}
      {c.candidaturas?.map((k) => <p key={k.nombre}>{k.nombre}: {k.votos}</p>)}
      {c.motivacion && <p className="whitespace-pre-wrap">Motivación: {c.motivacion}</p>}
      <p>Elegidos: {c.elegidos?.length ? c.elegidos.map((x) => `${x.nombre} (${x.condicion === "SUPLENTE" ? "suplente" : "titular"})`).join(", ") : "—"}</p>
      {c.incidencias?.map((i) => <NoticeBanner key={i} onClose={() => {}} variant="warning" notice={{ id: 0, message: `Incidencia: ${i} Mecanismo publicado: ${e.mecanismoEmpate === "DECISION" ? "decisión documentada" : e.mecanismoEmpate === "SEGUNDA_VUELTA" ? "segunda vuelta" : "nueva votación"}.` }} />)}
      <div>
        <h3 className="font-medium">Actas</h3>
        <ul className="flex flex-col gap-1">
          {q.data.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              Versión {a.version} · {a.tipo === "DEFINITIVA" ? "Definitiva" : "Provisional"} · {fechaCorta(a.creadoEn)}
              <Button size="sm" variant="link" onClick={() => descargar.mutate({ eleccion: e.id, acta: a.id }, { onError: (x) => notify(getErrorMessage(x), { variant: "error" }) })}>PDF</Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Reclamaciones({ e, responsable }: { e: EleccionProceso; responsable: boolean }) {
  const q = useReclamacionesQuery(e.id)
  const { notify } = useNotify()
  const [resolver, setResolver] = useState<number | null>(null)
  if (q.isPending) return <Spinner />
  if (!e.reclamacionDias) return <p className="py-4 text-sm text-muted-foreground">Esta convocatoria no contempla reclamaciones.</p>
  return (
    <>
      <Table>
        <TableHeader><TableRow><TableHead>Reclamante</TableHead><TableHead>Motivo</TableHead><TableHead>Estado</TableHead><TableHead>Respuesta</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {!q.data?.length && <TableRow><TableCell colSpan={5}>Sin reclamaciones.</TableCell></TableRow>}
          {q.data?.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.reclamante}</TableCell><TableCell>{r.motivo}</TableCell>
              <TableCell>{r.estado === "EN_TRAMITE" ? "En trámite" : r.estado === "ACEPTADA" ? "Aceptada" : "Rechazada"}</TableCell>
              <TableCell>{r.respuesta ?? "—"}</TableCell>
              <TableCell>{responsable && r.estado === "EN_TRAMITE" && <Button size="sm" variant="outline" color="neutral" onClick={() => setResolver(r.id)}>Resolver</Button>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {resolver && <DialogoResolver id={resolver} onCerrar={() => setResolver(null)} onHecho={(m) => { setResolver(null); notify(m) }} />}
    </>
  )
}

function DialogoResolver({ id, onCerrar, onHecho }: { id: number; onCerrar: () => void; onHecho: (m: string) => void }) {
  const m = useAccionProceso()
  const [decision, setDecision] = useState("RECHAZADA")
  const [afecta, setAfecta] = useState("N")
  const [respuesta, setRespuesta] = useState("")
  const [error, setError] = useState<string | null>(null)
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Resolver reclamación</DialogTitle></DialogHeader>
        {error && <NoticeBanner onClose={() => setError(null)} variant="error" notice={{ id: 0, message: error }} />}
        <NativeSelect value={decision} onChange={(x) => setDecision(x.target.value)}>
          <NativeSelectOption value="RECHAZADA">Rechazada</NativeSelectOption>
          <NativeSelectOption value="ACEPTADA">Aceptada</NativeSelectOption>
        </NativeSelect>
        <NativeSelect value={afecta} onChange={(x) => setAfecta(x.target.value)}>
          <NativeSelectOption value="N">No afecta el resultado</NativeSelectOption>
          <NativeSelectOption value="S">Afecta el resultado (crea versión nueva del acta)</NativeSelectOption>
        </NativeSelect>
        <Field><FieldLabel>* Respuesta</FieldLabel><Textarea value={respuesta} onChange={(x) => setRespuesta(x.target.value)} /></Field>
        <DialogFooter>
          <Button variant="outline" color="neutral" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={!respuesta.trim() || m.isPending} onClick={() => m.mutate(
            { ruta: `/reclamaciones/${id}/resolver`, cuerpo: { DECISION: decision, AFECTA_RESULTADO: afecta, RESPUESTA: respuesta } },
            { onSuccess: () => onHecho("Reclamación resuelta."), onError: (x) => setError(getErrorMessage(x)) },
          )}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Formalizacion({ e, responsable }: { e: EleccionProceso; responsable: boolean }) {
  const q = useDesignacionesQuery(e.id)
  const { notify } = useNotify()
  const [novedad, setNovedad] = useState<number | null>(null)
  if (q.isPending) return <Spinner />
  if (!q.data?.length) return <p className="py-4 text-sm text-muted-foreground">Aún no hay designaciones formalizadas.</p>
  return (
    <div className="flex flex-col gap-3 py-2 text-sm">
      <p className="text-muted-foreground">La designación no concede roles ni permisos en la plataforma.</p>
      {q.data.map((d) => (
        <div key={d.id} className="rounded border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">{d.nombre} · {d.condicion === "SUPLENTE" ? "Suplente" : "Titular"}{d.desde ? ` · ${d.desde}${d.hasta ? ` a ${d.hasta}` : ""}` : ""}</p>
            {responsable && <Button size="sm" variant="outline" color="neutral" onClick={() => setNovedad(d.id)}>Registrar novedad</Button>}
          </div>
          {d.novedades.map((n) => <p key={n.creadoEn}>{n.tipo}: {n.detalle} ({fechaCorta(n.creadoEn)})</p>)}
        </div>
      ))}
      {novedad && <DialogoNovedad id={novedad} onCerrar={() => setNovedad(null)} onHecho={(m) => { setNovedad(null); notify(m) }} />}
    </div>
  )
}

function DialogoNovedad({ id, onCerrar, onHecho }: { id: number; onCerrar: () => void; onHecho: (m: string) => void }) {
  const m = useAccionProceso()
  const [tipo, setTipo] = useState("ACEPTACION")
  const [detalle, setDetalle] = useState("")
  const [error, setError] = useState<string | null>(null)
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar novedad</DialogTitle></DialogHeader>
        {error && <NoticeBanner onClose={() => setError(null)} variant="error" notice={{ id: 0, message: error }} />}
        <NativeSelect value={tipo} onChange={(x) => setTipo(x.target.value)}>
          <NativeSelectOption value="ACEPTACION">Aceptación del cargo</NativeSelectOption>
          <NativeSelectOption value="RENUNCIA">Renuncia</NativeSelectOption>
          <NativeSelectOption value="REEMPLAZO">Reemplazo</NativeSelectOption>
          <NativeSelectOption value="VACANCIA">Vacancia</NativeSelectOption>
        </NativeSelect>
        <Field><FieldLabel>* Detalle</FieldLabel><Textarea value={detalle} onChange={(x) => setDetalle(x.target.value)} /></Field>
        <DialogFooter>
          <Button variant="outline" color="neutral" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={!detalle.trim() || m.isPending} onClick={() => m.mutate(
            { ruta: `/designaciones/${id}/novedad`, cuerpo: { TIPO: tipo, DETALLE: detalle } },
            { onSuccess: () => onHecho("Novedad registrada."), onError: (x) => setError(getErrorMessage(x)) },
          )}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Selección motivada o decisión documentada: entre candidaturas habilitadas y dentro de los cupos. */
function DialogoDecision({ e, tipo, onCerrar, onHecho }: { e: EleccionProceso; tipo: "seleccion" | "decision"; onCerrar: () => void; onHecho: (m: string) => void }) {
  const candidaturas = useCandidaturasQuery(e.id)
  const m = useAccionProceso()
  const [condicion, setCondicion] = useState<Record<number, string>>({})
  const [motivacion, setMotivacion] = useState("")
  const [error, setError] = useState<string | null>(null)
  const personas = Object.entries(condicion).filter(([, c]) => c).map(([id, c]) => ({ POSTULACION: Number(id), CONDICION: c }))
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{tipo === "seleccion" ? "Registrar selección" : "Decisión documentada"}</DialogTitle></DialogHeader>
        {error && <NoticeBanner onClose={() => setError(null)} variant="error" notice={{ id: 0, message: error }} />}
        <p className="text-sm text-muted-foreground">Cupos: {e.titulares} titular(es) y {e.suplentes} suplente(s).</p>
        {(candidaturas.data ?? []).map((c) => (
          <Field key={c.id}>
            <FieldLabel>{c.nombre}</FieldLabel>
            <NativeSelect value={condicion[c.id] ?? ""} onChange={(x) => setCondicion((v) => ({ ...v, [c.id]: x.target.value }))}>
              <NativeSelectOption value="">No seleccionado</NativeSelectOption>
              <NativeSelectOption value="TITULAR">Titular</NativeSelectOption>
              <NativeSelectOption value="SUPLENTE">Suplente</NativeSelectOption>
            </NativeSelect>
          </Field>
        ))}
        <Field><FieldLabel>* Motivación</FieldLabel><Textarea value={motivacion} onChange={(x) => setMotivacion(x.target.value)} /></Field>
        <DialogFooter>
          <Button variant="outline" color="neutral" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={!personas.length || !motivacion.trim() || m.isPending} onClick={() => m.mutate(
            { ruta: `/elecciones/${e.id}/${tipo}`, cuerpo: { PERSONAS: personas, MOTIVACION: motivacion } },
            { onSuccess: () => onHecho("Decisión registrada; nueva versión del acta."), onError: (x) => setError(getErrorMessage(x)) },
          )}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
