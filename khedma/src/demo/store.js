import { AppError } from '../api/errors-core.js'
import { loadPractice, savePractice } from './practice-storage.js'
import { feeQuote, feeSummary } from '../booking/fees.js'
import { redactContacts } from '../booking/contact-privacy.js'

// This store is only created inside /developer. It never calls a server.
const copy = value => structuredClone(value)
const vehicleOptions = ['triporteur', 'bus', 'bike', 'motorcycle', 'car', 'van', 'truck']
export function createDemoStore(clock = () => Date.now(), storage = null) {
  let state, passwords, tokens
  let startingPractice = null
  const listeners = new Set()
  const stamp = offset => new Date(clock() + offset).toISOString()
  function reset() {
    const epoch = (state?.epoch || 0) + 1
    passwords = { worker: 'demo1234', client: 'demo1234' }
    tokens = new Map()
    const profile = { id: 1, description: 'Demo Plombier, electrician and moving specialist in Rabat.', experience_years: 8, service_categories: ['plumbing', 'electricity', 'moving', 'other'].map(key => ({ key })), other_work: 'Installation solaire', transport_vehicles: ['van', 'truck'], service_radius_km: 10, latitude: 34.0209, longitude: -6.8416, available: true }
    const users = {
      worker: { id: 101, name: 'Youssef Amrani · Demo', role: 'mihaniy', email: 'worker@example.test', phone: '0000000000', city: 'Rabat', worker_profile: profile },
      client: { id: 201, name: 'Sara Alaoui · Demo', role: 'ba7it', email: 'client@example.test', phone: '0000000000', city: 'Rabat' },
    }
    const statuses = ['pending', 'pending', 'confirmed', 'in_progress', 'completed', 'completed', 'cancelled']
    const bookings = statuses.map((status, index) => ({ id: index + 1, workerId: 1, clientId: 201, workerName: users.worker.name, clientName: users.client.name, service: ['plumbing', 'electricity', 'moving', 'plumbing', 'painting', 'cleaning', 'garden'][index], location: 'Rabat', description: ['Kitchen tap repair — sample request.', 'Install a ceiling light — sample proposal.', 'Move furniture — sample confirmed job.', 'Bathroom leak — sample work in progress.', 'Paint a room — ready for a sample review.', 'Clean an apartment — sample reviewed job.', 'Garden maintenance — sample cancellation.'][index], status, price: [null, 250, 400, 180, 300, 150, null][index], scheduledAt: index > 0 && index < 6 ? stamp(86400000) : null, postedAt: 'Demo', rating: index === 5 ? 5 : null, comment: index === 5 ? 'Great work! Sample review.' : null }))
    const messages = bookings.flatMap(booking => [
      { id: booking.id * 10, bookingId: booking.id, senderRole: 'client', sender: users.client.name, body: 'Hello! This is a sample conversation.', createdAt: stamp(-3600000), readBy: ['client'] },
      { id: booking.id * 10 + 1, bookingId: booking.id, senderRole: 'worker', sender: users.worker.name, body: 'Hello, we can agree on the details here.', createdAt: stamp(-1800000), readBy: ['worker'] },
    ])
    state = { epoch, users, bookings, messages, activity: [
      { id: 1, bookingId: 1, sender: users.client.name, recipient: 'worker', kind: 'requested', createdAt: stamp(-3600000), unread: true },
      { id: 2, bookingId: 2, sender: users.worker.name, recipient: 'client', kind: 'proposed', createdAt: stamp(-1800000), unread: true },
    ] }
    savePractice(storage, state)
    listeners.forEach(listener => listener())
  }
  function change(values) { state = { ...state, ...values }; savePractice(storage, state); listeners.forEach(listener => listener()) }
  function publicWorkers() {
    const worker = state.users.worker, profile = worker.worker_profile
    const reviews = state.bookings.filter(job => job.workerId === 1 && job.rating).map(job => ({ id: job.id, author: job.clientName, rating: job.rating, comment: job.comment }))
    return [{ id: 1, name: worker.name, specialties: profile.service_categories.map(item => item.key), otherWork: profile.other_work, transportVehicles: profile.transport_vehicles, experience: Number(profile.experience_years), location: worker.city, serviceRadiusKm: Number(profile.service_radius_km), available: profile.available, connectionFeePercent: 10, description: profile.description, reviews, rating: reviews.length ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : null, reviewCount: reviews.length },
      ...['Khadija Bennani', 'Omar Idrissi', 'Lina El Yacoubi'].map((name, index) => ({ id: index + 2, name: `${name} · Demo`, specialties: [['cleaning', 'moving'], ['painting', 'walls'], ['doors', 'garden']][index], otherWork: null, transportVehicles: index === 0 ? ['van'] : [], experience: index + 3, location: ['Salé', 'Rabat', 'Casablanca'][index], serviceRadiusKm: 15, available: index !== 1, connectionFeePercent: 10, description: 'Sample professional profile for developer testing.', reviews: [{ id: 1, author: 'Demo client', rating: 5, comment: 'Sample review.' }], rating: 5, reviewCount: 1 }))]
  }
  function forRole(role) {
    if (!['worker', 'client'].includes(role)) throw new AppError('invalid')
    const ownBookings = () => state.bookings.filter(job => role === 'client' ? job.clientId === state.users.client.id : job.workerId === 1)
    const getJob = id => {
      const job = ownBookings().find(item => item.id === Number(id))
      if (!job) throw new AppError('notFound')
      return job
    }
    const viewJob = job => {
      const { feePayments: _feePayments, ...details } = copy(job)
      const fees = feeSummary(job, role)
      const contacts = !['pending', 'cancelled'].includes(job.status) && fees.unlocked
      const locked = fees.required && !fees.unlocked
      const visible = locked ? redactContacts(details) : details
      const detailsLocked = locked && role === 'worker' && !!details.movingDetails
      if (detailsLocked) for (const key of ['pickup', 'dropoff', 'access']) delete visible.movingDetails[key]
      return { ...visible, detailsLocked, fees, workerPhone: role === 'client' && contacts ? '0000000000' : null, clientPhone: role === 'worker' && contacts ? '0000000000' : null }
    }
    function activity(job, kind) {
      return { id: Math.max(0, ...state.activity.map(item => item.id)) + 1, bookingId: job.id, sender: state.users[role].name, recipient: role === 'worker' ? 'client' : 'worker', kind, createdAt: stamp(0), unread: true }
    }
    async function bookingRequest(path = '', body) {
      if (!path) {
        if (body === undefined) return ownBookings().map(viewJob)
        if (role !== 'client') throw new AppError('invalid')
        if (tokens.has(body.client_token)) {
          const previous = getJob(tokens.get(body.client_token))
          if (previous.workerId !== Number(body.workerId) || previous.service !== body.service || previous.location !== body.location.trim() || previous.description !== body.description.trim() || JSON.stringify(previous.movingDetails || null) !== JSON.stringify(body.moving_details || null)) throw new AppError('changed')
          return viewJob(previous)
        }
        const worker = publicWorkers().find(item => item.id === Number(body.workerId))
        if (!worker?.available || !worker.specialties.includes(body.service) || !body.location?.trim() || !body.description?.trim()) throw new AppError('invalid')
        const moving = body.moving_details
        if (moving && (body.service !== 'moving' || !moving.pickup?.trim() || !moving.dropoff?.trim() || !moving.items?.trim() || !['discuss', 'transport_only', 'one', 'team'].includes(moving.helpers) || (moving.vehicle && !worker.transportVehicles.includes(moving.vehicle)))) throw new AppError('invalid')
        const job = { feeRateBps: 1000, feePayments: [], movingDetails: moving ? copy(moving) : null, issues: [], id: Math.max(0, ...state.bookings.map(item => item.id)) + 1, workerId: worker.id, clientId: 201, workerName: worker.name, clientName: state.users.client.name, service: body.service, location: body.location.trim(), description: body.description.trim(), status: 'pending', price: null, scheduledAt: null, rating: null, comment: null, postedAt: 'Demo' }
        if (body.client_token) tokens.set(body.client_token, job.id)
        change({ bookings: [...state.bookings, job], activity: [...state.activity, activity(job, 'requested')] })
        return viewJob(job)
      }
      const [id, operation, detail] = path.split('?')[0].split('/').filter(Boolean)
      const job = getJob(id)
      if (operation === 'payments') {
        if (!body?.simulate || body.method !== 'cashplus' || job.status !== 'confirmed') throw new AppError('invalid')
        if (!(new Date(job.scheduledAt).getTime() > clock())) throw new AppError('expired')
        const own = job.feePayments?.find(item => item.role === role)
        if (!own || !['pending', 'paid'].includes(own.status)) throw new AppError('changed')
        if (own.status === 'paid') return viewJob(job)
        const next = { ...job, feePayments: job.feePayments.map(item => item.role === role ? { ...item, status: 'paid', method: body.method } : item) }
        change({ bookings: state.bookings.map(item => item.id === job.id ? next : item) })
        return viewJob(next)
      }
      if (operation === 'messages') {
        if (detail === 'read') {
          change({ messages: state.messages.map(item => item.bookingId === job.id && item.id <= body.through_id ? { ...item, readBy: [...new Set([...item.readBy, role])] } : item) })
          return { ok: true }
        }
        if (body === undefined) return { messages: state.messages.filter(item => item.bookingId === job.id).map(item => ({ ...copy(item), body: job.feeRateBps && !feeSummary(job, role).unlocked ? redactContacts(item.body) : item.body, mine: item.senderRole === role, unread: !item.readBy.includes(role) })), hasOlder: false }
        if (!body.body?.trim() || body.body.length > 2000) throw new AppError('invalid')
        const token = `message:${role}:${body.client_token}`
        if (tokens.has(token)) {
          const existing = state.messages.find(item => item.id === tokens.get(token))
          if (existing.bookingId !== job.id || existing.body !== body.body.trim()) throw new AppError('changed')
          return { ...copy(existing), mine: true, unread: false }
        }
        if (job.feeRateBps && !feeSummary(job, role).unlocked && redactContacts(body.body) !== body.body) throw new AppError('contactLocked')
        if (!['pending', 'confirmed', 'in_progress'].includes(job.status)) throw new AppError('changed')
        const message = { id: Math.max(0, ...state.messages.map(item => item.id)) + 1, bookingId: job.id, senderRole: role, sender: state.users[role].name, body: body.body.trim(), createdAt: stamp(0), readBy: [role] }
        if (body.client_token) tokens.set(token, message.id)
        change({ messages: [...state.messages, message], activity: [...state.activity, activity(job, 'message')] })
        return { ...copy(message), mine: true, unread: false }
      }
      if (body === undefined && !operation) return viewJob(job)
      const next = { ...job }
      let kind
      if (operation === 'issue') {
        if (!['no_show', 'quality', 'price', 'safety', 'other'].includes(body.reason) || !body.details?.trim() || body.details.length > 1500 || !body.client_token) throw new AppError('invalid')
        const token = `issue:${role}:${body.client_token}`
        const signature = JSON.stringify({ id, reason: body.reason, details: body.details })
        if (tokens.has(token)) { if (tokens.get(token) !== signature) throw new AppError('changed'); return viewJob(job) }
        tokens.set(token, signature)
        next.issues = [...(job.issues || []), { id: (job.issues?.length || 0) + 1, sender: state.users[role].name, reason: body.reason, details: body.details.trim(), createdAt: stamp(0) }]
        kind = 'issue'
      } else if (operation === 'review') {
        if (role !== 'client' || job.status !== 'completed' || job.rating || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) throw new AppError('invalid')
        next.rating = body.rating; next.comment = String(body.comment || '').slice(0, 1500); kind = 'reviewed'
      } else if (operation === 'action') {
        const allowed = {
          accept: role === 'worker' && job.status === 'pending' && job.price == null,
          confirm: role === 'client' && job.status === 'pending' && job.price != null,
          start: role === 'worker' && job.status === 'confirmed',
          complete: role === 'client' && job.status === 'in_progress' && body.completion_confirmed === true,
          decline: role === 'worker' && job.status === 'pending',
          cancel: ['pending', 'confirmed'].includes(job.status),
        }
        if (!allowed[body.action]) throw new AppError('changed')
        if (['cancel', 'decline'].includes(body.action)) {
          if (!['changed_plans', 'no_response', 'unavailable', 'no_show', 'other'].includes(body.reason)) throw new AppError('invalid')
          next.cancellationReason = body.reason
        }
        if (job.feeRateBps && ['accept', 'confirm'].includes(body.action) && body.fees_accepted !== true) throw new AppError('feeConsent')
        if (body.action === 'start' && !feeSummary(job, role).unlocked) throw new AppError('feesUnpaid')
        if (['cancel', 'decline'].includes(body.action)) next.feePayments = (job.feePayments || []).map(item => ({ ...item, status: item.status === 'paid' && item.amount_cents > 0 ? 'refund_pending' : item.status === 'pending' ? 'void' : item.status }))
        if (body.action === 'accept') {
          if (!Number.isFinite(body.price) || Math.abs(body.price * 100 - Math.round(body.price * 100)) > 0.00001 || body.price < 0 || body.price > 999999.99 || !(new Date(body.scheduled_at).getTime() > clock())) throw new AppError('invalid')
          next.price = body.price; next.scheduledAt = body.scheduled_at
        } else if (body.action === 'confirm') {
          if (!(new Date(job.scheduledAt).getTime() > clock())) throw new AppError('expired')
          next.status = 'confirmed'
          if (job.feeRateBps) {
            const fee = feeQuote(job.price, job.feeRateBps).feeCents
            next.feePayments = ['client', 'worker'].map(payer => ({ role: payer, amount_cents: fee, currency: 'MAD', reference: `demo-${job.id}-${payer}`, status: fee === 0 ? 'paid' : 'pending', method: null }))
          }
        } else next.status = { start: 'in_progress', complete: 'completed', decline: 'cancelled', cancel: 'cancelled' }[body.action]
        kind = { accept: 'proposed', confirm: 'confirmed', start: 'started', complete: 'completed', decline: 'cancelled', cancel: 'cancelled' }[body.action]
      } else throw new AppError('invalid')
      change({ bookings: state.bookings.map(item => item.id === job.id ? next : item), activity: [...state.activity, activity(next, kind)] })
      return viewJob(next)
    }
    async function authRequest(path, body) {
      if (path === 'settings') return { providers: [], password_available: true }
      if (path === 'activity') { const items = state.activity.filter(item => item.recipient === role); return { items: copy(items), unread: items.filter(item => item.unread).length } }
      const readMatch = path.match(/^activity\/(\d+)\/read$/)
      if (readMatch) { change({ activity: state.activity.map(item => item.id === Number(readMatch[1]) && item.recipient === role ? { ...item, unread: false } : item) }); return { ok: true } }
      if (path === 'password') {
        if (body.current_password !== passwords[role] || body.password !== body.password_confirmation || body.password?.length < 8) throw new AppError('demoPassword')
        passwords[role] = body.password
        return { user: copy(state.users[role]) }
      }
      if (path !== 'profile') throw new AppError('invalid')
      if (!body.name?.trim() || !body.city?.trim()) throw new AppError('invalid')
      let user = { ...state.users[role], name: body.name.trim(), city: body.city.trim(), phone: body.phone || '' }
      if (role === 'worker') {
        if (!body.specialties?.length || !body.description?.trim() || Number(body.service_radius_km) < .5 || Number(body.service_radius_km) > 500 || !Number.isFinite(Number(body.service_radius_km)) || Number(body.experience_years) < 0 || Number(body.experience_years) > 80) throw new AppError('chooseService')
        if (body.specialties.includes('other') && !body.other_work?.trim()) throw new AppError('invalid')
        if (body.specialties.includes('moving') && !body.transport_vehicles?.length) throw new AppError('chooseVehicle')
        user = { ...user, worker_profile: { ...user.worker_profile, description: body.description.trim(), experience_years: Number(body.experience_years), service_categories: body.specialties.map(key => ({ key })), other_work: body.specialties.includes('other') ? body.other_work : null, service_radius_km: Number(body.service_radius_km), latitude: body.latitude, longitude: body.longitude, available: body.available, transport_vehicles: body.specialties.includes('moving') ? body.transport_vehicles.filter(item => vehicleOptions.includes(item)) : [] } }
      }
      change({ users: { ...state.users, [role]: user }, bookings: state.bookings.map(job => ({ ...job, ...(role === 'worker' && job.workerId === 1 ? { workerName: user.name } : role === 'client' ? { clientName: user.name } : {}) })) })
      return { user: copy(user) }
    }
    return { bookingRequest, authRequest, async workers(id) { const workers = publicWorkers(); return copy(id === undefined ? workers : workers.find(item => item.id === Number(id)) || null) }, exportData() { return { demo: true, user: copy(state.users[role]), bookings: ownBookings().map(viewJob) } } }
  }
  async function startPractice(text) {
    if (startingPractice) return startingPractice
    const existing = state.bookings.find(job => job.practice)
    if (existing) return copy(existing)
    startingPractice = (async () => {
      const client = forRole('client')
      const job = await client.bookingRequest('', { workerId: 1, service: 'electricity', location: 'Rabat', description: text.description, client_token: `practice-request-${state.epoch}` })
      change({ bookings: state.bookings.map(item => item.id === job.id ? { ...item, practice: true } : item) })
      await client.bookingRequest(`/${job.id}/messages`, { body: text.opening, client_token: `practice-opening-${job.id}` })
      return forRole('worker').bookingRequest(`/${job.id}`)
    })()
    try { return await startingPractice }
    finally { startingPractice = null }
  }
  async function practiceClient(id, text) {
    const job = state.bookings.find(item => item.id === Number(id) && item.practice)
    if (!job) throw new AppError('invalid')
    const client = forRole('client')
    if (job.status === 'pending' && job.price == null) {
      const last = state.messages.filter(item => item.bookingId === job.id && item.senderRole === 'worker').at(-1)
      if (!last || last.id <= (job.practiceReplyThrough || 0)) throw new AppError('invalid')
      await client.bookingRequest(`/${job.id}/messages`, { body: text.reply, client_token: `practice-reply-${job.id}-${last.id}` })
      change({ bookings: state.bookings.map(item => item.id === job.id ? { ...item, practiceReplyThrough: last.id } : item) })
    } else if (job.status === 'pending' && job.price != null) {
      await client.bookingRequest(`/${job.id}/action`, { action: 'confirm', fees_accepted: true })
      await client.bookingRequest(`/${job.id}/messages`, { body: text.accept, client_token: `practice-accept-${job.id}` })
    } else if (job.status === 'in_progress') {
      await client.bookingRequest(`/${job.id}/messages`, { body: text.done, client_token: `practice-done-${job.id}` })
      await client.bookingRequest(`/${job.id}/action`, { action: 'complete', completion_confirmed: true })
      await client.bookingRequest(`/${job.id}/review`, { rating: 5, comment: text.review })
    } else throw new AppError('changed')
    return forRole('worker').bookingRequest(`/${job.id}`)
  }
  async function practicePayment(id) {
    const job = state.bookings.find(item => item.id === Number(id) && item.practice)
    if (!job) throw new AppError('invalid')
    await forRole('client').bookingRequest(`/${job.id}/payments`, { method: 'cashplus', simulate: true })
    return forRole('worker').bookingRequest(`/${job.id}`)
  }
  // Read before reset writes an empty practice slot.
  const saved = loadPractice(storage)
  reset()
  if (saved) {
    state.bookings.push(saved.job)
    state.messages.push(...saved.messages)
    savePractice(storage, state)
  }
  return { reset, forRole, startPractice, practiceClient, practicePayment, getSnapshot: () => state, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) } }
}
