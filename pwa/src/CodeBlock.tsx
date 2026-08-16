import { useMemo } from 'react'
import hljs from 'highlight.js/lib/core'
import csharp from 'highlight.js/lib/languages/csharp'

hljs.registerLanguage('csharp', csharp)

type Props = {
  code: string
}

export default function CodeBlock({ code }: Props) {
  const html = useMemo(
    () => hljs.highlight(code, { language: 'csharp', ignoreIllegals: true }).value,
    [code],
  )

  return (
    <pre className="code-block">
      <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  )
}
