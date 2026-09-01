import { useLayoutEffect, useRef, useState } from "react"

export function useTruncated<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return

    const check = () =>
      setIsTruncated(node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1)

    check()

    const observer = new ResizeObserver(check)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return { ref, isTruncated }
}
