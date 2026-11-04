import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { getErrorMessage } from "@/lib/api-client"
import { paths } from "@/config/paths"
import { DialogoProceso, DialogoTexto } from "@/features/comunicaciones/procesos/components/dialogos"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import {
  ESTADO_POSTULACION_LABEL,
  ETAPA_LABEL,
  fechaCorta,
  useAccionProceso,
  useAdjuntarDocumento,
  useMisProcesosQuery,
  usePersonasQuery,
  useProcesosQuery,
} from "@/features/comunicaciones/procesos/api/procesos"
import type { MiProceso } from "@/features/comunicaciones/procesos/api/procesos"
import { evalCol } from "@/lib/eval-col-client"
import { useQuery } from "@tanstack/react-query"
import type { Postulacion } from "@/features/comunicaciones/procesos/api/procesos"

export function ProcesosPage() {
  return (
    <NoticeProvider>
      <ProcesosContent />
    </NoticeProvider>
  )
}

function ProcesosContent() {
  const lista = useProcesosQuery()
  const permiso = useMenuPermission("PROCESOS_CREAR")
  const { notify } = useNotify()
  const [nuevo, setNuevo] = useState(false)
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Procesos de postulación y elección</h1>
        {permiso.puedeCrear && (
          <Button onClick={() => setNuevo(true)}>
            <ControlPointIcon data-icon="inline-start" /> Nuevo proceso
          </Button>
        )}
      </div>
      <NoticeOutlet />
      <Tabs defaultValue="mios">
        <TabsList>
          <TabsTrigger value="mios">Mis procesos</TabsTrigger>
          <TabsTrigger value="todos">Procesos</TabsTrigger>
        </TabsList>
        <TabsContent value="mios"><MisProcesos /></TabsContent>
        <TabsContent value="todos">
          {lista.isPending ? <Spinner /> : lista.isError ? (
            <p className="text-sm text-red">{getErrorMessage(lista.error)}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead><TableHead>Elecciones</TableHead><TableHead>Etapa</TableHead><TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.data.length === 0 && <TableRow><TableCell colSpan={4}>Aún no hay procesos.</TableCell></TableRow>}
                {lista.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link className="text-primary underline-offset-2 hover:underline" to={paths.app.comunicacionesProcesoDetalle.getHref(p.id)}>{p.nombre}</Link>
                    </TableCell>
                    <TableCell>{p.elecciones}</TableCell>
                    <TableCell>{ETAPA_LABEL[p.etapa]}</TableCell>
                    <TableCell><Badge variant="soft" color={p.estado === "ABIERTO" ? "success" : "neutral"}>{p.estado === "ABIERTO" ? "Abierto" : p.estado === "CERRADO" ? "Cerrado" : "Borrador"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
      {nuevo && <DialogoProceso onCerrar={() => setNuevo(false)} onHecho={(m) => { setNuevo(false); notify(m) }} />}
    </div>
  )
}

/** M.4.POS.2: bandeja personal. Solo elecciones en las que la persona puede participar. */
function MisProcesos() {
  const mios = useMisProcesosQuery()
  const { notify } = useNotify()
  const [postular, setPostular] = useState<MiProceso | null>(null)
  const [tramite, setTramite] = useState<number | null>(null)
  const [reclamar, setReclamar] = useState<MiProceso | null>(null)
  const [responder, setResponder] = useState<{ id: number; acepta: boolean } | null>(null)
  const [retirar, setRetirar] = useState<number | null>(null)
  if (mios.isPending) return <Spinner />
  if (mios.isError) return <p className="text-sm text-red">{getErrorMessage(mios.error)}</p>
  if (mios.data.length === 0) return <p className="py-6 text-sm text-muted-foreground">No tienes convocatorias ni elecciones habilitadas.</p>
  return (
    <div className="flex flex-col gap-3 pt-2">
      {mios.data.map((m) => (
        <div key={m.eleccion} className="flex flex-col gap-2 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Link className="font-medium hover:underline" to={paths.app.comunicacionesProcesoDetalle.getHref(m.proceso)}>{m.procesoNombre}</Link>
              <p className="text-sm text-muted-foreground">{m.nombre} · {ETAPA_LABEL[m.etapa]}</p>
            </div>
            {m.condicion !== "NORMAL" && <Badge variant="soft" color="warning">{m.condicion === "SUSPENDIDA" ? "Suspendida" : "Anulada"}</Badge>}
          </div>
          {m.postulacionEstado && (
            <p className="text-sm">Mi postulación: {ESTADO_POSTULACION_LABEL[m.postulacionEstado]}{m.subsanarHasta ? ` · subsanar hasta ${fechaCorta(m.subsanarHasta)}` : ""}{m.propuestoPor ? ` · propuesto por ${m.propuestoPor}` : ""}</p>
          )}
          {m.canal && m.etapa === "DECISION" && <p className="text-sm">Votación abierta · cierra {fechaCorta(m.votacionCierre)}</p>}
          <div className="flex flex-wrap gap-2">
            {m.puedePostular && <Button size="sm" onClick={() => setPostular(m)}>Postularme</Button>}
            {m.postulacionEstado === "PENDIENTE" && m.postulacion && (
              <>
                <Button size="sm" onClick={() => setResponder({ id: m.postulacion as number, acepta: true })}>Aceptar</Button>
                <Button size="sm" variant="outline" color="neutral" onClick={() => setResponder({ id: m.postulacion as number, acepta: false })}>Rechazar</Button>
              </>
            )}
            {m.postulacion && (m.postulacionEstado === "BORRADOR" || m.postulacionEstado === "SUBSANACION") && (
              <Button size="sm" onClick={() => setTramite(m.postulacion)}>Completar y presentar</Button>
            )}
            {m.canal && m.etapa === "DECISION" && m.condicion === "NORMAL" && (
              <Button size="sm" nativeButton={false} render={<Link to={paths.app.comunicacionesChat.getHref()} search={{ canal: m.canal } as never} />}>Votar</Button>
            )}
            {m.postulacion && m.postulacionEstado && !["RETIRADA", "NO_HABILITADA", "PENDIENTE"].includes(m.postulacionEstado) && ["POSTULACIONES", "DECISION"].includes(m.etapa) && (
              <Button size="sm" variant="outline" color="neutral" onClick={() => setRetirar(m.postulacion)}>Retirar candidatura</Button>
            )}
            {m.puedeReclamar && <Button size="sm" variant="outline" color="neutral" onClick={() => setReclamar(m)}>Presentar reclamación</Button>}
          </div>
        </div>
      ))}
      {postular && <DialogoPostular eleccion={postular} onCerrar={() => setPostular(null)} onCreada={(id) => { setPostular(null); setTramite(id) }} />}
      {tramite && <DialogoTramite id={tramite} onCerrar={() => setTramite(null)} onHecho={(t) => { setTramite(null); notify(t) }} />}
      {reclamar && (
        <DialogoTexto titulo="Presentar reclamación" etiqueta="* Motivo" accion={`/elecciones/${reclamar.eleccion}/reclamaciones`}
          onCerrar={() => setReclamar(null)} onHecho={(t) => { setReclamar(null); notify(t) }} />
      )}
      {retirar && (
        <DialogoTexto titulo="Retirar candidatura" etiqueta="* Motivo" accion={`/postulaciones/${retirar}/retirar`}
          descripcion="Si la votación ya se abrió, la elección se suspende para tramitar lo que diga el reglamento."
          onCerrar={() => setRetirar(null)} onHecho={(t) => { setRetirar(null); notify(t) }} />
      )}
      {responder && (
        <DialogoTexto titulo={responder.acepta ? "Aceptar candidatura" : "Rechazar candidatura"}
          descripcion={responder.acepta ? "Aceptas ser candidato. Luego completa y presenta tu postulación." : "Rechazas la candidatura propuesta."}
          accion={`/postulaciones/${responder.id}/${responder.acepta ? "aceptar" : "rechazar"}`}
          onCerrar={() => setResponder(null)} onHecho={(t) => { setResponder(null); notify(t) }} />
      )}
    </div>
  )
}

const TIPOS_POBLACION = ["ESTUDIANTES", "ACUDIENTES", "FUNCIONARIOS"] as const

function DialogoPostular({ eleccion, onCerrar, onCreada }: { eleccion: MiProceso; onCerrar: () => void; onCreada: (id: number) => void }) {
  const m = useAccionProceso()
  const [propuesta, setPropuesta] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [tipo, setTipo] = useState<(typeof TIPOS_POBLACION)[number]>("ESTUDIANTES")
  const [tercero, setTercero] = useState("")
  const personas = usePersonasQuery(tipo, eleccion.puedeProponer)
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{eleccion.nombre} › Postular</DialogTitle></DialogHeader>
        {error && <NoticeBanner onClose={() => setError(null)} variant="error" notice={{ id: 0, message: error }} />}
        {eleccion.puedeProponer && (
          <>
            <Field>
              <FieldLabel>Proponer a otra persona (opcional)</FieldLabel>
              <NativeSelect value={tipo} onChange={(e) => { setTipo(e.target.value as typeof tipo); setTercero("") }}>
                {TIPOS_POBLACION.map((t) => <NativeSelectOption key={t} value={t}>{t}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <NativeSelect value={tercero} onChange={(e) => setTercero(e.target.value)}>
              <NativeSelectOption value="">Yo mismo</NativeSelectOption>
              {(personas.data ?? []).map((p) => <NativeSelectOption key={p.id} value={String(p.id)}>{p.nombre}</NativeSelectOption>)}
            </NativeSelect>
          </>
        )}
        <Field>
          <FieldLabel>* Propuesta o presentación</FieldLabel>
          <Textarea maxLength={2000} value={propuesta} onChange={(e) => setPropuesta(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" color="neutral" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={m.isPending} onClick={() => m.mutate(
            { ruta: `/elecciones/${eleccion.eleccion}/postulaciones`, cuerpo: { PROPUESTA: propuesta, USUARIO: tercero ? Number(tercero) : null } },
            { onSuccess: (r) => tercero ? onCerrar() : onCreada((r.rows[0] as { id: number }).id), onError: (e) => setError(getErrorMessage(e)) },
          )}>Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const EXTENSIONES = ".pdf,.doc,.docx,.jpg,.jpeg,.png"
const MAX_BYTES = 10 * 1024 * 1024

/** M.4.POS.3: documentos reservados, aceptación y presentación (también al subsanar). */
function DialogoTramite({ id, onCerrar, onHecho }: { id: number; onCerrar: () => void; onHecho: (m: string) => void }) {
  const postulacion = useQuery({
    queryKey: ["procesos", "postulacion", id],
    queryFn: async () => (await evalCol.getRows<Postulacion>(`/comunicaciones/procesos/postulaciones/${id}`))[0],
  })
  const accion = useAccionProceso()
  const adjuntar = useAdjuntarDocumento()
  const [error, setError] = useState<string | null>(null)
  const [acepta, setAcepta] = useState(false)
  const [propuesta, setPropuesta] = useState<string | null>(null)
  const p = postulacion.data
  const subir = (archivo: File | undefined, tipo: "SOPORTE" | "AUTORIZACION") => {
    if (!archivo) return
    if (archivo.size > MAX_BYTES) return setError("Cada archivo admite hasta 10 MB.")
    setError(null)
    adjuntar.mutate({ postulacion: id, archivo, tipo }, {
      onSuccess: () => postulacion.refetch(),
      onError: (e) => setError(getErrorMessage(e)),
    })
  }
  const presentar = async () => {
    setError(null)
    try {
      if (propuesta !== null) await accion.mutateAsync({ ruta: `/postulaciones/${id}`, metodo: "put", cuerpo: { PROPUESTA: propuesta, FOTO: p?.foto } })
      await accion.mutateAsync({ ruta: `/postulaciones/${id}/presentar`, cuerpo: { ACEPTA: "S" } })
      onHecho("Postulación presentada.")
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Completar postulación</DialogTitle></DialogHeader>
        {error && <NoticeBanner onClose={() => setError(null)} variant="error" notice={{ id: 0, message: error }} />}
        {!p ? <Spinner /> : (
          <div className="flex flex-col gap-4">
            {p.motivo && <p className="text-sm">{p.motivo}</p>}
            {p.requisitos.filter((r) => r.resultado === "SUBSANAR").map((r) => (
              <p key={r.requisito} className="text-sm text-yellow">Subsanar: {r.requisito}{r.observacion ? ` — ${r.observacion}` : ""}</p>
            ))}
            <Field>
              <FieldLabel>* Propuesta o presentación</FieldLabel>
              <Textarea maxLength={2000} value={propuesta ?? p.propuesta} onChange={(e) => setPropuesta(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Documentos exigidos (reservados; hasta 5 archivos de 10 MB)</FieldLabel>
              <Input type="file" accept={EXTENSIONES} onChange={(e) => { subir(e.target.files?.[0], "SOPORTE"); e.target.value = "" }} />
            </Field>
            <Field>
              <FieldLabel>Autorización del acudiente (obligatoria para estudiantes; reservada)</FieldLabel>
              <Input type="file" accept={EXTENSIONES} onChange={(e) => { subir(e.target.files?.[0], "AUTORIZACION"); e.target.value = "" }} />
            </Field>
            {p.documentos.length > 0 && (
              <ul className="list-disc pl-5 text-sm">
                {p.documentos.map((d) => <li key={d.id}>{d.nombre} ({d.tipo === "AUTORIZACION" ? "autorización" : "soporte"})</li>)}
              </ul>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={acepta} onCheckedChange={(c) => setAcepta(Boolean(c))} /> Acepto las condiciones del proceso y la publicación
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" color="neutral" onClick={onCerrar}>Guardar y salir</Button>
          <Button disabled={!acepta || accion.isPending || adjuntar.isPending} onClick={presentar}>Presentar postulación</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
