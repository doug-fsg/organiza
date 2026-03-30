'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

export default function SwaggerPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css'
    document.head.appendChild(link)
    return () => link.remove()
  }, [])

  useEffect(() => {
    const initSwagger = () => {
      if (typeof window === 'undefined' || !containerRef.current) return
      const SwaggerUIBundle = (window as any).SwaggerUIBundle
      const SwaggerUIStandalonePreset = (window as any).SwaggerUIStandalonePreset
      if (!SwaggerUIBundle || !SwaggerUIStandalonePreset) return

      SwaggerUIBundle({
        url: `${window.location.origin}/api/v1/openapi`,
        domNode: containerRef.current,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset,
        ],
        layout: 'BaseLayout',
      })
    }

    if ((window as any).SwaggerUIBundle) {
      initSwagger()
    } else {
      const check = setInterval(() => {
        if ((window as any).SwaggerUIBundle) {
          clearInterval(check)
          initSwagger()
        }
      }, 100)
      return () => clearInterval(check)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Script
        src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"
        strategy="afterInteractive"
      />
      <div ref={containerRef} id="swagger-ui" />
    </div>
  )
}
