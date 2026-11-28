import { describe, expect, it } from "vitest"

import { enviadaTexto, fechaCorta } from "@/features/establishment/institution/utils/orientaciones"

describe("orientaciones recibidas", () => {
  it("muestra las fechas del backend como dd/MM/yyyy y el vacío como guion", () => {
    expect(fechaCorta("2027-05-02")).toBe("02/05/2027")
    expect(fechaCorta("2027-05-02T10:00:00")).toBe("02/05/2027")
    expect(fechaCorta(null)).toBe("—")
    expect(fechaCorta("")).toBe("—")
  })

  it("arma la bajada de los modales con la fecha y el rol de quien la envió", () => {
    expect(enviadaTexto({ fechaEnvio: "2027-05-02", enviadaPor: "Supervisor territorial" })).toBe(
      "Enviada el 02/05/2027 por Supervisor territorial",
    )
  })
})
