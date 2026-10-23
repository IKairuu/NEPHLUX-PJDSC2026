import { useCallback, useEffect, useRef, useState } from 'react'

// Runs an API call when the screen opens and again whenever `deps` change. A newer call always wins,
// so a slow old answer never overwrites a fresh one. reload() runs it again and keeps the old data on screen meanwhile.
export function useApi(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const seq = useRef(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  const reload = useCallback(() => {
    const id = ++seq.current
    setState((s) => ({ ...s, loading: true, error: null }))
    run().then(
      (data) => { if (id === seq.current) setState({ data, error: null, loading: false }) },
      (error) => { if (id === seq.current) setState({ data: null, error, loading: false }) },
    )
  }, [run])

  useEffect(() => { reload() }, [reload])
  return { ...state, reload }
}
