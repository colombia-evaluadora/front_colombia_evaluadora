import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DotsThreeVerticalIcon, FileUploadOutlinedIcon, ListChecksIcon } from "@/components/ui/icons"

import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"
import { formatFecha } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import { TituloSensible } from "@/features/gestion-estudiantil/inclusion/piar/components/campos-datos-piar"
import { TarjetaAjuste } from "@/features/gestion-estudiantil/inclusion/piar/components/ficha/tarjeta-ajuste"
import { BotonQuitar, BotonSeccion, EnlaceArchivo, ListaDatos, Par, Vacio } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"
import type { FichaPiar } from "@/features/gestion-estudiantil/inclusion/piar/hooks/use-ficha-piar"
import { COLOR_COBERTURA } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"

const ICONO_SUBIR = <FileUploadOutlinedIcon data-icon="inline-start" />
const Titulo = ({ children }: { children: React.ReactNode }) => <span className="font-normal">{children}</span>

const siNo = (v: string | boolean | null | undefined) => v === true || v === "S" || v === "SI"

export function SeccionDatosExistentes({ ficha: { piar } }: { ficha: FichaPiar }) {
  const d = piar.datos_existentes
  return (
    <SeccionPlegable defaultAbierta={false} titulo={<TituloSensible>Datos existentes del estudiante</TituloSensible>} contentClassName="p-4 text-sm">
      <ListaDatos>
        <Par label="Identificación">{d?.identificacion ?? "—"}</Par>
        <Par label="Matrícula">{[piar.estudiante.grado_grupo, d?.jornada, d?.sede, piar.periodo_academico].filter(Boolean).join(" · ")}</Par>
        <Par label="Acudiente">{piar.acudiente?.nombre ?? "—"}</Par>
        <Par label="Hogar">{d?.convive_acudiente == null ? "Sin registrar" : siNo(d.convive_acudiente) ? "Convive con el acudiente" : "No convive con el acudiente"}</Par>
        <Par label="Trayectoria">
          {d?.fecha_ingreso ? `En el establecimiento desde ${formatFecha(d.fecha_ingreso)}` : "Sin fecha de ingreso"}
          {siNo(d?.repitente) ? "; repite el grado" : ""}
        </Par>
      </ListaDatos>
    </SeccionPlegable>
  )
}

export function SeccionRedes({ ficha: { piar, gestiona, setDialogo, quitar } }: { ficha: FichaPiar }) {
  const redes = piar.redes_apoyo ?? []
  return (
    <SeccionPlegable
      defaultAbierta={false}
      titulo={<TituloSensible>Redes de apoyo ({redes.length})</TituloSensible>}
      accion={gestiona && <BotonSeccion onClick={() => setDialogo({ tipo: "red" })}>Agregar</BotonSeccion>}
      contentClassName="grid gap-2 p-4 text-sm"
    >
      {redes.map((r) => (
        <div key={r.id} className="flex items-start justify-between gap-3">
          <span><strong>{r.persona_institucion}</strong> · {r.tipo_integrante.nombre}{r.relacion && ` · ${r.relacion}`} — {r.apoyo}</span>
          {gestiona && <BotonQuitar onClick={() => quitar(`/red-apoyo/${r.id}/eliminar`)} />}
        </div>
      ))}
      {!redes.length && <Vacio>Sin integrantes.</Vacio>}
    </SeccionPlegable>
  )
}

export function SeccionInformes({ ficha: { piar, gestiona, setDialogo, quitar } }: { ficha: FichaPiar }) {
  const informes = piar.informes_profesionales ?? []
  return (
    <SeccionPlegable
      defaultAbierta={false}
      titulo={<TituloSensible>Informes de profesionales ({informes.length} de 5)</TituloSensible>}
      accion={gestiona && informes.length < 5 && <BotonSeccion icono={ICONO_SUBIR} onClick={() => setDialogo({ tipo: "informes" })}>Adjuntar</BotonSeccion>}
      contentClassName="grid gap-2 p-4 text-sm"
    >
      {informes.map((i) => (
        <div key={i.id} className="flex items-center justify-between gap-3">
          <EnlaceArchivo archivo={{ id: i.fk_tarchivo, nombre: i.nombre }} />
          {gestiona && <BotonQuitar onClick={() => quitar(`/informes/${i.id}/eliminar`)} />}
        </div>
      ))}
      {!informes.length && <Vacio>Sin informes.</Vacio>}
    </SeccionPlegable>
  )
}

export function SeccionAntecedentes({ ficha: { piar, gestiona, setDialogo } }: { ficha: FichaPiar }) {
  const antecedentes = piar.antecedentes ?? []
  const externos = piar.documentos_externos ?? []
  return (
    <SeccionPlegable
      defaultAbierta={false}
      titulo={<TituloSensible>Antecedentes y documentos externos ({antecedentes.length + externos.length})</TituloSensible>}
      accion={
        gestiona && (
          <span className="flex flex-wrap gap-2">
            <BotonSeccion onClick={() => setDialogo({ tipo: "antecedente" })}>Registrar antecedente</BotonSeccion>
            <BotonSeccion icono={ICONO_SUBIR} onClick={() => setDialogo({ tipo: "externo" })}>Incorporar informe externo</BotonSeccion>
          </span>
        )
      }
      contentClassName="grid gap-2 p-4 text-sm"
    >
      {antecedentes.map((a) => (
        <p key={a.id}>
          <strong>{a.necesidad}</strong> · {formatFecha(a.fecha)} · {a.fuente} — {a.descripcion}
          {a.apoyo_jornada && ` Apoyo: ${a.apoyo_jornada}.`} <span className="text-muted-foreground">Responsable: {a.responsable.nombre}</span>
        </p>
      ))}
      {externos.map((d) => (
        <p key={d.id}><EnlaceArchivo archivo={d.archivo} /> · {d.tipo.nombre} · {d.institucion} · recibido {formatFecha(d.fecha_recepcion)}</p>
      ))}
      {!antecedentes.length && !externos.length && <Vacio>Sin registros.</Vacio>}
    </SeccionPlegable>
  )
}

export function SeccionCobertura({ ficha: { piar, gestiona, setDialogo } }: { ficha: FichaPiar }) {
  return (
    <SeccionPlegable titulo={<Titulo>Cobertura por asignatura</Titulo>} contentClassName="overflow-x-auto p-4">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left">
          <tr>
            <th className="px-2 py-2 font-medium">Asignatura</th>
            <th className="px-2 py-2 font-medium">Cobertura</th>
            <th className="px-2 py-2 text-right font-medium">Ajustes</th>
            <th className="px-2 py-2 font-medium">Justificación</th>
            <th className="px-2 py-2 font-medium">Revisado por y fecha</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {piar.cobertura?.map((c) => (
            <tr key={c.fk_tasignatura} className="border-b border-border">
              <td className="px-2 py-3 font-medium">{c.asignatura_nombre}</td>
              <td className="px-2 py-3"><Badge variant="soft" color={COLOR_COBERTURA[c.cobertura]}><span>{c.cobertura_nombre}</span></Badge></td>
              <td className="px-2 py-3 text-right tabular-nums">{piar.ajustes.filter((a) => a.fk_tasignatura === c.fk_tasignatura).length}</td>
              <td className="px-2 py-3">{c.justificacion ?? "—"}</td>
              <td className="px-2 py-3 whitespace-nowrap">{c.revisado_en ? `${c.revisado_por ? `${c.revisado_por} · ` : ""}${formatFecha(c.revisado_en)}` : "—"}</td>
              <td className="px-2 py-3 text-right">
                {gestiona && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button size="icon-xs" variant="ghost" color="muted" aria-label={`Acciones de ${c.asignatura_nombre}`} />}>
                      <DotsThreeVerticalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDialogo({ tipo: "cobertura", fila: c })}><ListChecksIcon />Revisar cobertura</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SeccionPlegable>
  )
}

export function SeccionAjustes({ ficha: { piar, gestiona, estado, setDialogo } }: { ficha: FichaPiar }) {
  const borrador = gestiona && estado === "BORRADOR"
  return (
    <SeccionPlegable
      titulo={<Titulo>Ajustes razonables ({piar.ajustes.length})</Titulo>}
      accion={borrador && piar.fk_tpiar_origen == null && <BotonSeccion onClick={() => setDialogo({ tipo: "ajuste" })}>Agregar ajuste</BotonSeccion>}
      contentClassName="grid gap-3 p-4"
    >
      {piar.ajustes.map((a, i) => <TarjetaAjuste key={a.id} ajuste={a} indice={i + 1} piarId={piar.id} editaAjuste={borrador} sensible puedeEditar={gestiona} onDialogo={setDialogo} />)}
      {!piar.ajustes.length && <Vacio>Sin ajustes.</Vacio>}
    </SeccionPlegable>
  )
}

export function SeccionActividades({ ficha: { piar, estado, gestiona, setDialogo } }: { ficha: FichaPiar }) {
  const actividades = piar.actividades_familiares ?? []
  return (
    <SeccionPlegable
      defaultAbierta={estado === "BORRADOR"}
      titulo={<Titulo>Actividades familiares ({actividades.length})</Titulo>}
      accion={gestiona && <BotonSeccion onClick={() => setDialogo({ tipo: "actividad" })}>Agregar actividad</BotonSeccion>}
      contentClassName="grid gap-3 p-4 text-sm"
    >
      {actividades.map((a) => (
        <article key={a.id} className="grid gap-2 rounded-lg border border-border p-4">
          <header className="flex flex-wrap items-center gap-2">
            <strong>{a.actividad}</strong>
            {gestiona && (
              <span className="ml-auto flex items-center gap-1">
                <Button size="xs" variant="ghost" color="muted" type="button" onClick={() => setDialogo({ tipo: "actividad", actividad: a })}>Modificar</Button>
                <BotonSeccion onClick={() => setDialogo({ tipo: "resultado", actividad: a })}>Registrar resultado</BotonSeccion>
              </span>
            )}
          </header>
          <ListaDatos>
            <Par label="Descripción">{a.descripcion}</Par>
            <Par label="Frecuencia acordada">{a.frecuencia}</Par>
            <Par label="Responsable acordado">{a.responsable}</Par>
            <Par label="Fecha de revisión">{formatFecha(a.fecha_revision)}</Par>
            <Par label="Resultado">{a.resultado ? `${a.resultado} (${formatFecha(a.fecha_resultado)})` : "—"}</Par>
          </ListaDatos>
        </article>
      ))}
      {!actividades.length && <Vacio>Sin actividades.</Vacio>}
    </SeccionPlegable>
  )
}
