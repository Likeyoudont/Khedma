export const jobs = [
  {
    id: 1,
    service: 'electricity',
    workerName: 'Youssef Amrani',
    workerPhone: '+212 6 12 34 56 78',
    price: 250,
    arrivalTime: '14:30',
    expectedFinishTime: '16:00',
    location: 'Salé, Hay Salam',
    status: 'confirmed',
    completed: false,
    rating: null,
  },
  {
    id: 2,
    service: 'cleaning',
    workerName: 'Khadija Bennani',
    workerPhone: '+212 6 98 76 54 32',
    price: 150,
    arrivalTime: '09:00',
    expectedFinishTime: '11:00',
    location: 'Rabat, Agdal',
    status: 'completed',
    completed: true,
    rating: 5,
  },
]

// Prototype requests are stored on this browser until the Laravel API is connected.
export function getLocalRequests() {
  try {
    const entries = JSON.parse(localStorage.getItem('khedma-requests') || '[]')
    return Array.isArray(entries) ? entries.filter((entry) => entry && Number.isFinite(entry.id) && typeof entry.service === 'string') : []
  } catch { return [] }
}

export function saveLocalRequest(request) {
  const entries = getLocalRequests()
  localStorage.setItem('khedma-requests', JSON.stringify([request, ...entries.filter((entry) => entry.id !== request.id)]))
}

export function createRequestId() { return Date.now() }
