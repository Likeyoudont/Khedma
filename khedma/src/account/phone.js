export function phoneDigits(value) {
  return String(value).replace(/[٠-٩۰-۹]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.includes(digit) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(digit) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
}

export function phoneFeedback(value) {
  // Direction marks are often included when a number is copied from Arabic text.
  const number = phoneDigits(value).replace(/[\s().\-\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
  if (!number) return { valid: true, kind: 'empty', count: 0 }
  const count = number.replace(/\D/g, '').length
  if (!/^\+?\d+$/.test(number)) return { valid: false, kind: 'invalid', count }
  if (number.startsWith('+212') || number.startsWith('00212') || number.startsWith('212')) {
    const local = number.replace(/^(?:\+212|00212|212)/, '').replace(/^0/, '')
    return { valid: /^[5-7]\d{8}$/.test(local), kind: 'moroccoInternational', count: local.length }
  }
  if (number.startsWith('+') || number.startsWith('00')) {
    const international = number.replace(/^(?:\+|00)/, '')
    return { valid: /^[1-9]\d{7,14}$/.test(international), kind: 'international', count: international.length }
  }
  if (number.startsWith('0')) return { valid: /^0[5-7]\d{8}$/.test(number), kind: 'local', count }
  return { valid: false, kind: 'invalid', count }
}
