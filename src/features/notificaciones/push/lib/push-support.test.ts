import { describe, expect, it } from "vitest"

import {
  detectPlataforma,
  getPushAvailability,
  isIosDevice,
  urlBase64ToUint8Array,
  type PushEnvironment,
} from "@/features/notificaciones/push/lib/push-support"

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1"
const IPADOS = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15"
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0 Safari/537.36"

const base: PushEnvironment = {
  vapidPublicKey: "BExampleKey",
  userAgent: CHROME,
  maxTouchPoints: 0,
  standalone: false,
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  permission: "default",
}

describe("getPushAvailability", () => {
  it("oculta todo sin clave VAPID", () => {
    expect(getPushAvailability({ ...base, vapidPublicKey: "" })).toBe("sin-clave")
  })
  it("disponible en escritorio con permiso por defecto", () => {
    expect(getPushAvailability(base)).toBe("disponible")
  })
  it("pide instalar en iOS fuera de la PWA aunque falte PushManager", () => {
    expect(
      getPushAvailability({ ...base, userAgent: IPHONE, hasPushManager: false }),
    ).toBe("ios-requiere-instalar")
  })
  it("iPadOS que se presenta como Mac también requiere instalar", () => {
    expect(getPushAvailability({ ...base, userAgent: IPADOS, maxTouchPoints: 5 })).toBe(
      "ios-requiere-instalar",
    )
  })
  it("iOS instalado (standalone) queda disponible", () => {
    expect(getPushAvailability({ ...base, userAgent: IPHONE, standalone: true })).toBe(
      "disponible",
    )
  })
  it("permiso denegado muestra instrucciones", () => {
    expect(getPushAvailability({ ...base, permission: "denied" })).toBe("denegado")
  })
  it("sin Service Worker no hay soporte", () => {
    expect(getPushAvailability({ ...base, hasServiceWorker: false })).toBe("no-soportado")
  })
})

describe("helpers", () => {
  it("detecta iOS y plataforma", () => {
    expect(isIosDevice(IPADOS, 0)).toBe(false)
    expect(detectPlataforma(IPHONE)).toBe("iOS")
    expect(detectPlataforma(CHROME)).toBe("Windows")
    expect(detectPlataforma("Mozilla/5.0 (Linux; Android 14)")).toBe("Android")
  })
  it("convierte base64url a bytes", () => {
    expect(Array.from(urlBase64ToUint8Array("AQID_-8"))).toEqual([1, 2, 3, 255, 239])
  })
})
