import { Link as RouterLink } from 'react-router-dom'
import { useDemo } from './DemoContext'
import { scoped } from './paths'

export function Link({ to, ...props }) {
  const demo = useDemo()
  return <RouterLink to={scoped(to, demo)} {...props} />
}
