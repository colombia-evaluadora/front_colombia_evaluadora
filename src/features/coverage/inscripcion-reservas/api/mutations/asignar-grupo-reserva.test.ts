import { beforeEach, describe, expect, it, vi } from "vitest"

import type { CreateMatriculaInput } from "@/features/coverage/matricula/api/types/matricula"
import {
  asignarGrupoReserva,
  type AsignarGrupoReservaInput,
} from "@/features/coverage/inscripcion-reservas/api/mutations/asignar-grupo-reserva"

const m = vi.hoisted(() => ({
  postRow: vi.fn(),
  updateMatricula: vi.fn(),
  cargarSoporte: vi.fn(),
  revisarSoporte: vi.fn(),
  fetchSoportes: vi.fn(),
  saveMatriculaAsignaturas: vi.fn(),
}))

vi.mock("@/lib/eval-col-client", () => ({ evalCol: { postRow: m.postRow } }))
vi.mock("@/features/coverage/matricula/api/mutations/update-matricula", () => ({
  updateMatricula: m.updateMatricula,
}))
vi.mock("@/features/coverage/matricula/api/soportes", () => ({
  cargarSoporte: m.cargarSoporte,
  revisarSoporte: m.revisarSoporte,
  fetchSoportes: m.fetchSoportes,
  NOMBRE_SOPORTE: { CERTIFICADO_ESTUDIOS: "Certificado de estudios del año anterior", OTRO: "Otros documentos relevantes" },
}))
vi.mock("@/features/coverage/matricula/api/mutations/save-matricula-asignaturas", () => ({
  saveMatriculaAsignaturas: m.saveMatriculaAsignaturas,
  hasAsignaturasParaGuardar: ({ cambios }: { cambios: object }) => Object.keys(cambios).length > 0,
}))
vi.mock("@/lib/api-client", () => ({ getErrorMessage: (e: Error) => e.message }))

const values = { academic: {}, student: {} } as unknown as CreateMatriculaInput

const input = (cambios: Partial<AsignarGrupoReservaInput> = {}): AsignarGrupoReservaInput => ({
  reservaId: "7",
  grupoId: 30,
  especialidadId: null,
  values,
  editado: false,
  contexto: {
    pkTpadre: 5,
    pkUsuarioEstudiante: 11,
    pkUsuarioAcudiente: 12,
    guardianReplaced: false,
    sinAutorizacion: false,
  },
  soportes: [],
  ...cambios,
})

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset()
  m.postRow.mockResolvedValue({ datos: { fkTgrupo: 30, matriculas: [{ reserva: 7, matricula: 900 }] } })
})

describe("asignarGrupoReserva", () => {
  it("sin cambios solo asigna: la matrícula sale con lo de la anterior", async () => {
    const r = await asignarGrupoReserva(input())
    expect(r).toEqual({ matriculaId: "900", pendientes: [] })
    // FK_ENFASIS vacío no viaja (el back toma la especialidad de la matrícula de origen).
    expect(m.postRow).toHaveBeenCalledWith("/cobertura-academica/reservas-cupo/asignar-grupo", {
      RESERVAS: [7],
      FK_TGRUPO: 30,
      FK_ENFASIS: undefined,
    })
    expect(m.updateMatricula).not.toHaveBeenCalled()
    expect(m.cargarSoporte).not.toHaveBeenCalled()
    expect(m.saveMatriculaAsignaturas).not.toHaveBeenCalled()
  })

  it("con cambios hace el PATCH sobre la matrícula nueva; sin autorización no toca la persona del estudiante", async () => {
    await asignarGrupoReserva(
      input({ editado: true, especialidadId: 4, contexto: { ...input().contexto, sinAutorizacion: true } }),
    )
    expect(m.postRow.mock.calls[0][1]).toMatchObject({ FK_ENFASIS: 4 })
    expect(m.updateMatricula).toHaveBeenCalledWith({
      id: "900",
      values,
      pkTpadre: 5,
      pkUsuarioEstudiante: null,
      pkUsuarioAcudiente: 12,
      guardianReplaced: false,
    })
  })

  it("un paso posterior que falla queda pendiente y los demás siguen", async () => {
    const archivo = new File(["x"], "carta.pdf")
    m.cargarSoporte.mockRejectedValueOnce(new Error("archivo inválido"))
    const r = await asignarGrupoReserva(
      input({
        soportes: [{ key: "a", tipo: "OTRO", archivo, archivoBase: null, revision: null }],
        values: { ...values, asignaturas: { 3: { matriculada: false, externa: false } } },
      }),
    )
    expect(r.pendientes).toEqual(["el soporte carta.pdf (archivo inválido)"])
    expect(m.saveMatriculaAsignaturas).toHaveBeenCalledWith(expect.objectContaining({ matriculaId: "900" }))
    // Sin cambios sobre copiados no hace falta releer los soportes de la matrícula nueva.
    expect(m.fetchSoportes).not.toHaveBeenCalled()
  })

  it("revisiones y reemplazos van a los soportes copiados de la matrícula nueva, no a la anterior", async () => {
    m.fetchSoportes.mockResolvedValue([
      { id: 501, archivoId: 77, tipo: "CERTIFICADO_ESTUDIOS" },
      { id: 502, archivoId: 78, tipo: "OTRO" },
    ])
    const archivo = new File(["x"], "certificado-2027.pdf")
    const revision = { resultado: "SOPORTADO" as const, observacion: "" }
    const r = await asignarGrupoReserva(
      input({
        soportes: [
          { key: "r", tipo: "CERTIFICADO_ESTUDIOS", archivo, archivoBase: 77, revision: null },
          { key: "v", tipo: "OTRO", archivo: null, archivoBase: 78, revision },
          { key: "x", tipo: "OTRO", archivo: null, archivoBase: 99, revision },
        ],
      }),
    )
    expect(m.fetchSoportes).toHaveBeenCalledWith("900")
    expect(m.cargarSoporte).toHaveBeenCalledWith("900", { tipo: "CERTIFICADO_ESTUDIOS", id: 501, archivo })
    expect(m.revisarSoporte).toHaveBeenCalledWith("900", { id: 502, ...revision })
    expect(r.pendientes).toEqual(["el cambio en Otros documentos relevantes (el soporte no se copió)"])
  })

  it("si falla la asignación no sigue con nada", async () => {
    m.postRow.mockRejectedValueOnce(new Error("sin cupo"))
    await expect(asignarGrupoReserva(input({ editado: true }))).rejects.toThrow("sin cupo")
    expect(m.updateMatricula).not.toHaveBeenCalled()
  })
})
