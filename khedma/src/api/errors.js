import i18n from '../i18n/config'
import { responseError } from './errors-core'

export function translatedError(error, t = i18n.t.bind(i18n)) {
  if (error.name === 'AbortError') return error
  const code = error.code || 'connection'
  const fields = [...new Set((error.fields || []).map(field => field.split('.')[0]))]
  const message = fields.length && code === 'invalid'
    ? fields.map(field => t('api.fieldInvalid', { field: t(`api.fields.${field}`, { defaultValue: t('api.fields.details') }) })).join(' ')
    : t(`api.${code}`)
  return Object.assign(new Error(message), { status: error.status, fields: error.fields, code })
}
export function translatedResponseError(data, status) { return translatedError(responseError(data, status)) }
