import { useEffect, useState } from 'react'

/** Reactive viewport check. Default breakpoint matches Tailwind's `sm` (640px). */
export function useIsMobile(query = '(max-width: 639px)') {
  const get = () =>
    typeof window !== 'undefined' && window.matchMedia(query).matches
  const [isMobile, setIsMobile] = useState(get)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setIsMobile(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return isMobile
}
