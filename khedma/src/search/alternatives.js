import { cityMatches } from './matching.js'

export function workerAlternatives(workers, { service = '', location = '' } = {}) {
  const available = workers.filter(worker => worker.available)
  const local = location ? available.filter(worker => cityMatches(worker.location, location)) : available
  const localServices = [...new Set(local.flatMap(worker => worker.specialties))].filter(key => key !== service)
  const otherWorkers = available.filter(worker => (!service || worker.specialties.includes(service)) && (!location || !cityMatches(worker.location, location)))
    .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
  const elsewhereServices = otherWorkers.length ? [] : [...new Set(available.flatMap(worker => worker.specialties))].filter(key => key !== service && !localServices.includes(key))
  return { localServices, otherWorkers, elsewhereServices }
}
