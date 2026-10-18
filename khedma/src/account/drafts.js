// Memory only: keep edits across app navigation, never store passwords or persist account data.
const drafts = new Map()
const fields = ['name', 'city', 'phone', 'description', 'experience_years', 'other_work', 'available', 'specialties', 'transport_vehicles', 'service_radius_km', 'centre']
export function rememberDraft(key, values) {
  drafts.set(key, structuredClone(Object.fromEntries(fields.filter(field => field in values).map(field => [field, values[field]]))))
}
export function readDraft(key) { return drafts.has(key) ? structuredClone(drafts.get(key)) : null }
export function forgetDraft(key) { drafts.delete(key) }
export function clearDrafts(scope = '') { for (const key of drafts.keys()) if (key.startsWith(scope)) drafts.delete(key) }
