import { afterEach, describe, expect, it } from "vitest"

import { createPendingNoticeStore, pendingNoticeStore } from "@/components/notice/pending-notice"

describe("pendingNoticeStore", () => {
  afterEach(() => pendingNoticeStore.reset())

  it("arranca vacío", () => {
    expect(createPendingNoticeStore().take()).toBeNull()
  })

  it("entrega el aviso encolado una sola vez", () => {
    const store = createPendingNoticeStore()
    store.set({ message: "Actividad creada correctamente." })
    expect(store.take()).toEqual({ message: "Actividad creada correctamente." })
    // Un segundo provider (StrictMode, pantallas solapadas) no lo repite.
    expect(store.take()).toBeNull()
  })

  it("conserva las opciones del aviso", () => {
    const store = createPendingNoticeStore()
    store.set({ message: "Error", options: { variant: "error", autoCloseMs: 3000 } })
    expect(store.take()).toEqual({ message: "Error", options: { variant: "error", autoCloseMs: 3000 } })
  })

  it("el último aviso encolado reemplaza al anterior", () => {
    const store = createPendingNoticeStore()
    store.set({ message: "primero" })
    store.set({ message: "segundo" })
    expect(store.take()?.message).toBe("segundo")
  })

  it("reset descarta el aviso sin mostrarlo", () => {
    pendingNoticeStore.set({ message: "pendiente" })
    pendingNoticeStore.reset()
    expect(pendingNoticeStore.take()).toBeNull()
  })

  it("cada store es independiente", () => {
    const a = createPendingNoticeStore()
    const b = createPendingNoticeStore()
    a.set({ message: "a" })
    expect(b.take()).toBeNull()
    expect(a.take()?.message).toBe("a")
  })
})
