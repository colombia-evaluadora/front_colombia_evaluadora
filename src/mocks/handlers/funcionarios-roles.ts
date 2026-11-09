import { addDays, format } from "date-fns"
import { delay, http, HttpResponse } from "msw"

import { campusesDb } from "@/mocks/db/campuses"
import { EMPLOYEE_ROLES } from "@/mocks/db/catalogs/employee-roles"
import { WORK_SCHEDULES } from "@/mocks/db/catalogs/work-schedules"
import { employeesDb } from "@/mocks/db/employees"

import type { Permission } from "@/features/establishment/institution/api/types/permission"

// Roles y permisos del funcionario (sso V579.13). Opera sobre los permisos de `employeesDb` para
// que el listado de funcionarios vea los mismos roles; la Vigente hasta y las restricciones viven
// aquí. El mock no modela establecimientos: todas las sedes son del que se pida.

const hoy = () => format(new Date(), "yyyy-MM-dd")
const vigencia = new Map<number, string | null>()
const restricciones = new Map<number, Map<number, { acceso: boolean; guardar: boolean; eliminar: boolean }>>()
let siguienteId = 1

// Ids estables para los roles del mock (la base real los da al crear) y algunas fechas para ver
// "Vence en N días" y un rol vencido.
for (const e of employeesDb) {
  for (const p of e.permissions) {
    p.id = siguienteId++
    vigencia.set(p.id, null)
  }
}
const primero = employeesDb[0]?.permissions
if (primero?.[0]) vigencia.set(primero[0].id as number, format(addDays(new Date(), 12), "yyyy-MM-dd"))
if (primero?.[1]) {
  vigencia.set(primero[1].id as number, format(addDays(new Date(), -3), "yyyy-MM-dd"))
  primero[1].status = "SUSPENDED"
}

/** Vistas que da cada rol del mock: [id, padre, nombre, ícono, ver, guardar, eliminar]. */
type VistaBase = [number, number | null, string, string | null, boolean, boolean, boolean]
const VISTAS: VistaBase[] = [
  [100, null, "Gestión académica", "Book-Open-Icon", true, true, true],
  [101, 100, "Planeador", null, true, true, true],
  [102, 100, "Asistencia", null, true, true, false],
  [103, 100, "Informes", null, true, false, false],
  [200, null, "Cobertura", "user", true, true, false],
  [201, 200, "Matrícula", null, true, true, false],
  [202, 200, "Reserva de cupo", null, true, false, false],
  [300, null, "Establecimiento educativo", "fas fa-school", true, false, false],
  [301, 300, "Sedes educativas", null, true, false, false],
]

const buscarRol = (id: unknown) => {
  for (const e of employeesDb) {
    const p = e.permissions.find((x) => x.id === Number(id))
    if (p) return { e, p }
  }
  return null
}
const noEncontrado = () => HttpResponse.json({ message: "No se encontró el rol asignado." }, { status: 404 })
const error = (message: string, status = 400) => HttpResponse.json({ message }, { status })

function filaRol(p: Permission) {
  const vigente = vigencia.get(p.id as number) ?? null
  const activo = p.status === "ACTIVE"
  const dias = activo && vigente ? Math.round((new Date(`${vigente}T00:00`).getTime() - new Date(`${hoy()}T00:00`).getTime()) / 86_400_000) : null
  const principal = p.role.code === "RECTOR" ? "RECTOR" : null
  return {
    id: p.id,
    rol_id: p.role.id,
    rol_codigo: p.role.code,
    rol_nombre: p.role.name,
    sede_id: p.campus.id,
    sede_nombre: p.campus.name,
    jornada_id: p.workSchedule.id,
    jornada_nombre: p.workSchedule.name,
    vigente_hasta: vigente,
    estado: activo ? "ACTIVO" : "INACTIVO",
    vencido: !activo && vigente != null && vigente < hoy(),
    dias_para_vencer: dias,
    principal_de: principal,
    puede_gestionar: principal == null,
    puede_permisos: principal == null,
  }
}

function arbol(asignacionId: number) {
  const r = restricciones.get(asignacionId) ?? new Map()
  return VISTAS.map(([id, padre, nombre, icono, ver, guardar, eliminar]) => {
    const propia = r.get(id)
    const delPadre = padre == null ? undefined : r.get(padre)
    const acceso = ver && (propia?.acceso ?? true) && (delPadre?.acceso ?? true)
    return {
      pk_tmenu: id,
      pk_padre: padre,
      nombre,
      icono,
      orden: id,
      base_ver: ver,
      base_guardar: guardar,
      base_eliminar: eliminar,
      acceso,
      guardar: guardar && acceso && (propia?.guardar ?? true) && (delPadre?.guardar ?? true),
      eliminar: eliminar && acceso && (propia?.eliminar ?? true) && (delPadre?.eliminar ?? true),
    }
  })
}

const fechaValida = (v: unknown) => v == null || v === "" || String(v) > hoy()

export const funcionariosRolesHandlers = [
  http.get("*/api/eval-col/establecimientos/funcionarios/roles/sedes-asignables", async () => {
    await delay(150)
    const jornadas = WORK_SCHEDULES.slice(0, 2)
    return HttpResponse.json({
      rows: campusesDb.flatMap((s) =>
        jornadas.map((j) => ({ sede_id: s.id, sede_nombre: s.name, jornada_id: j.id, jornada_nombre: j.name })),
      ),
    })
  }),

  http.get("*/api/eval-col/establecimientos/funcionarios/:id/roles", async ({ params }) => {
    await delay(200)
    const e = employeesDb.find((x) => x.id === Number(params.id))
    if (!e) return HttpResponse.json({ message: "No se encontró el funcionario." }, { status: 404 })
    return HttpResponse.json({ rows: e.permissions.map(filaRol) })
  }),

  http.post("*/api/eval-col/establecimientos/funcionarios/:id/roles", async ({ params, request }) => {
    await delay(300)
    const e = employeesDb.find((x) => x.id === Number(params.id))
    if (!e) return HttpResponse.json({ message: "No se encontró el funcionario." }, { status: 404 })
    const body = (await request.json()) as { ROL: number; SEDE: number; JORNADA: number; VIGENTE_HASTA: string }
    const role = EMPLOYEE_ROLES.find((r) => r.id === Number(body.ROL))
    const campus = campusesDb.find((c) => c.id === Number(body.SEDE))
    const workSchedule = WORK_SCHEDULES.find((j) => j.id === Number(body.JORNADA))
    if (!role || !campus || !workSchedule) return error("Elija el rol, la sede educativa y la jornada.")
    if (!fechaValida(body.VIGENTE_HASTA)) return error("La fecha Vigente hasta debe ser posterior a hoy.")
    if (e.permissions.some((p) => p.role.id === role.id && p.campus.id === campus.id && p.workSchedule.id === workSchedule.id)) {
      return error(`El funcionario ya tiene el rol ${role.name} en ${campus.name} · ${workSchedule.name}.`, 409)
    }
    const id = siguienteId++
    e.permissions.push({ id, order: e.permissions.length + 1, role, campus, workSchedule, status: "ACTIVE" })
    vigencia.set(id, body.VIGENTE_HASTA || null)
    return HttpResponse.json({ rows: [{ rol: { id } }] })
  }),

  http.put("*/api/eval-col/establecimientos/funcionarios/roles/:id/:accion", async ({ params, request }) => {
    await delay(250)
    const encontrado = buscarRol(params.id)
    if (!encontrado) return noEncontrado()
    const { e, p } = encontrado
    const id = p.id as number
    const texto = await request.text()
    const body = (texto ? JSON.parse(texto) : {}) as Record<string, unknown>
    switch (params.accion) {
      case "inactivar":
        p.status = "SUSPENDED"
        break
      case "activar": {
        const vencido = (vigencia.get(id) ?? "9999") < hoy()
        if (vencido && body.CAMBIAR_VIGENCIA !== true) {
          return error("El rol venció: elija una nueva fecha Vigente hasta o déjela vacía para que no venza.")
        }
        if (body.CAMBIAR_VIGENCIA === true) {
          if (!fechaValida(body.VIGENTE_HASTA)) return error("La fecha Vigente hasta debe ser posterior a hoy.")
          vigencia.set(id, (body.VIGENTE_HASTA as string) || null)
        }
        p.status = "ACTIVE"
        break
      }
      case "prorrogar":
        if (!body.VIGENTE_HASTA || !fechaValida(body.VIGENTE_HASTA)) return error("La fecha Vigente hasta debe ser posterior a hoy.")
        vigencia.set(id, String(body.VIGENTE_HASTA))
        p.status = "ACTIVE"
        break
      case "eliminar":
        e.permissions = e.permissions.filter((x) => x !== p)
        restricciones.delete(id)
        break
      case "permisos": {
        const lista = JSON.parse(String(body.PERMISOS ?? "[]")) as { menu: number; acceso: boolean; guardar: boolean; eliminar: boolean }[]
        const base = new Map(VISTAS.map((v) => [v[0], v]))
        const propias = new Map<number, { acceso: boolean; guardar: boolean; eliminar: boolean }>()
        for (const x of lista) {
          const v = base.get(x.menu)
          if (!v) continue
          if ((x.acceso && !v[4]) || (x.guardar && !v[5]) || (x.eliminar && !v[6])) {
            return error(`No puede dar en la vista ${v[2]} un permiso que el rol ${p.role.name} no tiene: solo se restringe.`)
          }
          if (x.acceso !== v[4] || x.guardar !== v[5] || x.eliminar !== v[6]) propias.set(x.menu, x)
        }
        restricciones.set(id, propias)
        return HttpResponse.json({ rows: [{ permisos: { id, restricciones: propias.size } }] })
      }
      default:
        return noEncontrado()
    }
    return HttpResponse.json({ rows: [{ rol: { id } }] })
  }),

  http.get("*/api/eval-col/establecimientos/funcionarios/roles/:id/permisos", async ({ params }) => {
    await delay(200)
    const encontrado = buscarRol(params.id)
    if (!encontrado) return noEncontrado()
    return HttpResponse.json({ rows: arbol(encontrado.p.id as number) })
  }),
]
