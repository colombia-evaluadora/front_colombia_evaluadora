import { describe, expect, it } from "vitest"

import { isEasyPin } from "./vault"

describe("isEasyPin", () => {
  it.each(["111111", "123456", "654321", "121212", "123123"])("rechaza %s", (p) => expect(isEasyPin(p)).toBe(true))
  it.each(["246813", "908172", "130579"])("acepta %s", (p) => expect(isEasyPin(p)).toBe(false))
})
