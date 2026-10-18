import { useNavigate as useRouterNavigate } from 'react-router-dom'
import { useDemo } from './DemoContext'
import { scoped } from './paths'
export function useNavigate() {
  const navigate = useRouterNavigate()
  const demo = useDemo()
  return (to, options) => navigate(typeof to === 'number' ? to : scoped(to, demo), options)
}
