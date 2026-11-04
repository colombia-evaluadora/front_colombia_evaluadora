import { describe, expect, it } from "vitest"

import {
  IMAGEN_MENSAJES,
  validarArchivoIcono,
  validarPng,
  validarSvg,
} from "@/features/administration/listas-valor/lib/imagen-icono"

const ok = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle r="10"/></svg>'

// Solo firma + IHDR: basta para la revisión, que no decodifica la imagen.
function png(ancho: number, alto: number) {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  const vista = new DataView(bytes.buffer)
  vista.setUint32(16, ancho)
  vista.setUint32(20, alto)
  return bytes
}

describe("validarSvg", () => {
  it("acepta un SVG cuadrado", () => {
    expect(validarSvg(ok)).toBeNull()
    expect(validarSvg(`<?xml version="1.0"?>\n${ok}`)).toBeNull()
    expect(validarSvg('<svg width="32" height="32"><rect/></svg>')).toBeNull()
    expect(validarSvg('<svg viewBox="0 0 1 1"><use href="#a"/></svg>')).toBeNull()
  })

  it("rechaza lo que no es SVG, scripts y enlaces externos", () => {
    expect(validarSvg("hola")).toBe(IMAGEN_MENSAJES.formato)
    expect(validarSvg('<svg viewBox="0 0 1 1"><script>x</script></svg>')).toBe(IMAGEN_MENSAJES.inseguro)
    expect(validarSvg('<svg viewBox="0 0 1 1" onload="x()"></svg>')).toBe(IMAGEN_MENSAJES.inseguro)
    expect(validarSvg('<svg viewBox="0 0 1 1"><use href="https://x/a.svg#i"/></svg>')).toBe(
      IMAGEN_MENSAJES.inseguro,
    )
  })

  it("rechaza imágenes incrustadas y forma", () => {
    expect(validarSvg('<svg viewBox="0 0 1 1"><image/></svg>')).toBe(IMAGEN_MENSAJES.incrustada)
    expect(validarSvg('<svg viewBox="0 0 24 12"></svg>')).toBe(IMAGEN_MENSAJES.noCuadrado)
    expect(validarSvg("<svg></svg>")).toBe(IMAGEN_MENSAJES.noCuadrado)
  })
})

describe("validarPng", () => {
  it("acepta un PNG cuadrado y rechaza uno que no lo es", () => {
    expect(validarPng(png(64, 64))).toBeNull()
    expect(validarPng(png(64, 32))).toBe(IMAGEN_MENSAJES.noCuadrado)
  })

  it("rechaza bytes que no son PNG", () => {
    expect(validarPng(new TextEncoder().encode("hola mundo, no soy un png"))).toBe(IMAGEN_MENSAJES.formato)
  })
})

describe("validarArchivoIcono", () => {
  it("decide por extensión y peso", async () => {
    expect(await validarArchivoIcono(new File([ok], "a.svg"))).toBeNull()
    expect(await validarArchivoIcono(new File([png(8, 8)], "a.PNG"))).toBeNull()
    expect(await validarArchivoIcono(new File(["x"], "a.jpg"))).toBe(IMAGEN_MENSAJES.formato)
    expect(await validarArchivoIcono(new File([new Uint8Array(101 * 1024)], "a.png"))).toBe(
      IMAGEN_MENSAJES.pesado,
    )
  })
})
