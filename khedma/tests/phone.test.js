import test from 'node:test'
import assert from 'node:assert/strict'
import { phoneDigits, phoneFeedback } from '../src/account/phone.js'

test('phone guidance counts local and international Moroccan digits separately', () => {
  assert.deepEqual(phoneFeedback('06 12 34'), { valid: false, kind: 'local', count: 6 })
  for (const prefix of ['05', '06', '07']) {
    assert.deepEqual(phoneFeedback(`${prefix} 12 34 56 78`), { valid: true, kind: 'local', count: 10 })
    assert.equal(phoneFeedback(`${prefix}1234567`).valid, false)
    assert.equal(phoneFeedback(`${prefix}123456789`).valid, false)
  }
  assert.deepEqual(phoneFeedback('+212 612 345 678'), { valid: true, kind: 'moroccoInternational', count: 9 })
  assert.deepEqual(phoneFeedback('+212 (0)6 12 34 56 78'), { valid: true, kind: 'moroccoInternational', count: 9 })
  assert.equal(phoneFeedback('+2120612345678').valid, true)
  assert.equal(phoneFeedback('+21206123456789').valid, false)
  assert.equal(phoneFeedback('+21200612345678').valid, false)
  assert.equal(phoneFeedback('00212612345678').valid, true)
  assert.equal(phoneFeedback('\u200F+212\u00A0(0)6 12 34 56 78\u200E').valid, true)
})

test('phone feedback supports Arabic digits and international country prefixes', () => {
  assert.equal(phoneFeedback('+33123456789').valid, true)
  assert.equal(phoneFeedback('0033123456789').valid, true)
  assert.equal(phoneDigits('٠٦١٢٣٤٥٦٧٨'), '0612345678')
  assert.equal(phoneDigits('۰۶۱۲۳۴۵۶۷۸'), '0612345678')
  assert.equal(phoneFeedback('٠٧ ١٢ ٣٤ ٥٦ ٧٨').valid, true)
})

test('malformed and ambiguous phone values are not silently accepted', () => {
  assert.equal(phoneFeedback('0412345678').valid, false)
  assert.equal(phoneFeedback('1234567890').valid, false)
  assert.equal(phoneFeedback('+3312345').valid, false)
  assert.equal(phoneFeedback('abc0612345678').valid, false)
  assert.equal(phoneFeedback('06+12345678').valid, false)
  assert.equal(phoneFeedback('06/12/34/56/78').valid, false)
  assert.equal(phoneFeedback('').valid, true)
})
