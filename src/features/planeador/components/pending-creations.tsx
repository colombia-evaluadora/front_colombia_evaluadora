import { Link } from "@tanstack/react-router"

import { useOutboxOps } from "@/lib/offline/outbox/hooks"
import { groupSagas } from "@/lib/offline/outbox/saga"
import { paths } from "@/config/paths"

import { SagaStatusBadge } from "@/features/offline/components/saga-badge"

/**
 * Altas hechas sin conexión que todavía no existen en el servidor (id
 * `tmp:`, Fase 3): no están en los listados del backend, así que se muestran
 * aparte, con su estado, hasta que la saga termina y el listado se refresca.
 */
export function PendingCreations({ tipo }: { tipo: "actividad" | "unidad" }) {
  const ops = useOutboxOps()
  const altas = groupSagas(ops).filter((s) => s.target.startsWith(`${tipo}:tmp:`) && s.status !== "done")
  if (altas.length === 0) return null
  return (
    <section
      className="border-blue-stroke bg-blue-22 mx-(--screen-spacing) my-3 rounded-md border px-3 py-2 text-sm"
      aria-label={tipo === "actividad" ? "Actividades por sincronizar" : "Unidades por sincronizar"}
      data-slot="pending-creations"
    >
      <p className="font-semibold">
        {tipo === "actividad" ? "Actividades creadas sin conexión" : "Unidades creadas sin conexión"}
      </p>
      <ul className="mt-1 flex flex-col gap-1">
        {altas.map((saga) => (
          <li key={saga.id} className="flex flex-wrap items-center gap-2" data-slot="pending-creation" data-status={saga.status}>
            <span>{saga.titulo.replace(/^Crear /, "")}</span>
            <SagaStatusBadge status={saga.status} />
          </li>
        ))}
      </ul>
      <Link to={paths.app.pendientes.getHref()} className="text-primary text-xs hover:underline">
        Ver los pasos en Cambios pendientes
      </Link>
    </section>
  )
}
