import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios"
import { onlineManager } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { isNetworkError, NetworkSessionError } from "@/lib/network-error"
import { queryConfig } from "@/lib/react-query"

function conStatus(status: number) {
  const config = { headers: new AxiosHeaders() }
  const response = { status, data: {}, headers: {}, statusText: "", config } as AxiosResponse
  return new AxiosError("fallo", "ERR_BAD_RESPONSE", config, null, response)
}

describe("isNetworkError", () => {
  it("es verdadero sin response, en timeout y ERR_NETWORK", () => {
    expect(isNetworkError(new AxiosError("Network Error", "ERR_NETWORK"))).toBe(true)
    expect(isNetworkError(new AxiosError("timeout", "ECONNABORTED"))).toBe(true)
    expect(isNetworkError(new AxiosError("sin respuesta"))).toBe(true)
    expect(isNetworkError(new NetworkSessionError())).toBe(true)
  })

  it.each([502, 503, 504, 520, 521, 522, 523, 524])("es verdadero con %i de gateway", (s) => {
    expect(isNetworkError(conStatus(s))).toBe(true)
  })

  it.each([400, 401, 403, 404, 409, 500])("es falso con %i de negocio", (s) => {
    expect(isNetworkError(conStatus(s))).toBe(false)
  })

  it("es falso para errores que no son de axios", () => {
    expect(isNetworkError(new Error("x"))).toBe(false)
  })
})

describe("queryConfig", () => {
  const retry = queryConfig.queries.retry
  it("reintenta solo errores de red, máximo 2 veces", () => {
    const red = new AxiosError("Network Error", "ERR_NETWORK")
    expect(retry(0, red)).toBe(true)
    expect(retry(1, red)).toBe(true)
    expect(retry(2, red)).toBe(false)
    expect(retry(0, conStatus(400))).toBe(false)
  })
  it("sin red no reintenta: el reintento fallaría igual y alargaba el 'cargando'", () => {
    const red = new AxiosError("Network Error", "ERR_NETWORK")
    onlineManager.setOnline(false)
    try {
      expect(retry(0, red)).toBe(false)
    } finally {
      onlineManager.setOnline(true)
    }
  })
  it("no reintenta mutaciones, que tampoco quedan pausadas sin red", () => {
    expect(queryConfig.mutations.retry).toBe(false)
    expect(queryConfig.mutations.networkMode).toBe("always")
    // El de las queries lo decide `OfflineAwareQueryClient` por query.
    expect("networkMode" in queryConfig.queries).toBe(false)
  })
})
