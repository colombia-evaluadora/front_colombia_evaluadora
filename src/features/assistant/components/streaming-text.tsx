interface StreamingTextProps {
  text: string
}

export function StreamingText({ text }: StreamingTextProps) {
  const tokens = text.split(/(\s+)/)
  let wordIndex = 0

  return (
    <>
      {tokens.map((token, index) => {
        if (token === "" || /^\s+$/.test(token)) {
          return token
        }

        const delay = wordIndex * 40
        wordIndex += 1

        return (
          <span
            key={index}
            className="animate-in fade-in fill-mode-backwards inline-block duration-300 motion-reduce:animate-none"
            style={{ animationDelay: `${delay}ms` }}
          >
            {token}
          </span>
        )
      })}
    </>
  )
}
