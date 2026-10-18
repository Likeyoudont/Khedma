import { useEffect, useState } from 'react'
import { useAppApi } from '../demo/useAppApi'

export function useWorkers(id, { background = false } = {}) {
  const api = useAppApi()
  const url = id === undefined ? '/api/workers' : `/api/workers/${encodeURIComponent(id)}`
  const [refresh, setRefresh] = useState(0)
  const [state, setState] = useState({ url: null, data: null, loading: true, error: false })
  useEffect(() => {
    const controller = new AbortController()
    api.workers(id, controller.signal, { background })
      .then((data) => setState({ url, data, loading: false, error: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ url, data: null, loading: false, error: true })
      })
    return () => controller.abort()
  }, [url, id, api, refresh, background])
  const retry = () => { setState({ url: null, data: null, loading: true, error: false }); setRefresh(value => value + 1) }
  return { ...(state.url === url ? state : { data: null, loading: true, error: false }), retry }
}
