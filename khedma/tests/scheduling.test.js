import test from 'node:test'
import assert from 'node:assert/strict'
import { visitTime } from '../src/booking/scheduling.js'
const now = new Date(2026, 9, 4, 12, 30)
test('visit time uses this year and local clock without a year input', () => {
  const result = visitTime({ month: '10', day: '4', time: '13:15' }, now)
  const visit = new Date(result.scheduledAt)
  assert.equal(visit.getFullYear(), 2026)
  assert.equal(visit.getMonth(), 9)
  assert.equal(visit.getDate(), 4)
  assert.equal(visit.getHours(), 13)
  assert.equal(visit.getMinutes(), 15)
})
test('incomplete, impossible and past visit times have distinct explanations', () => {
  assert.equal(visitTime({ month: '10', day: '4', time: '' }, now).error, 'booking.dateIncomplete')
  assert.equal(visitTime({ month: '2', day: '31', time: '15:00' }, now).error, 'booking.dateInvalid')
  assert.equal(visitTime({ month: '10', day: '4', time: '12:00' }, now).error, 'booking.datePast')
  assert.equal(visitTime({ month: '10', day: '4', time: '25:00' }, now).error, 'booking.dateInvalid')
  assert.equal(visitTime({ month: '1', day: '1', time: '15:00' }, new Date(2026, 11, 31, 12)).error, 'booking.datePast')
  assert.equal(visitTime({ month: '2', day: '29', time: '15:00' }, new Date(2028, 0, 1)).error, undefined)
})
