export function redactContacts(value) {
  if (Array.isArray(value)) return value.map(redactContacts)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactContacts(item)]))
  if (typeof value !== 'string') return value
  return value.replace(/[\p{L}\d._%+-]+@[\p{L}\d.-]+\.[\p{L}]{2,}|(?:https?:\/\/|www\.)[^\s"<>]+|(?<![\p{L}\p{N}])(?:\+|[0٠۰]|212)[\p{N}\s().-]{7,24}[\p{N}](?![\p{L}\p{N}])/gu, match => {
    if (match.includes('@') || /^(https?:\/\/|www\.)/.test(match)) return '[…]'
    const count = (match.match(/\p{N}/gu) || []).length
    return count >= 9 && count <= 15 ? '[…]' : match
  })
}
