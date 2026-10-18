export class AppError extends Error {
  constructor(code, status, fields = []) {
    super(code)
    this.code = code
    this.status = status
    this.fields = fields
  }
}

export function responseError(data, status) {
  const messages = Object.values(data.errors || {}).flat().join(' ') || data.message || ''
  const fields = Object.keys(data.errors || {})
  const code = /fees_accepted/.test(Object.keys(data.errors || {}).join(' ')) ? 'feeConsent'
    : /Contact details are locked/.test(messages) ? 'contactLocked'
    : /Both platform fees/.test(messages) ? 'feesUnpaid'
    : /Payment checkout is not configured/.test(messages) ? 'paymentNotReady'
    : /credentials do not match/i.test(messages) ? 'credentials'
    : /already been taken/i.test(messages) ? (fields.length === 1 && fields[0] === 'phone' ? 'duplicatePhone' : fields.length === 1 && fields[0] === 'email' ? 'duplicateEmail' : 'duplicate')
    : /valid phone number|Moroccan phone number|international country code/i.test(messages) ? 'phoneInvalid'
    : /password.*incorrect|password.*does not match|password is incorrect/i.test(messages) ? 'currentPassword'
    : /currently unavailable/i.test(messages) ? 'unavailable'
    : /proposed visit time has passed/i.test(messages) ? 'expired'
    : /must start this job/i.test(messages) ? 'waitForStart'
    : /already started/i.test(messages) ? 'workStarted'
    : /vehicle offered/i.test(messages) ? 'chooseVehicle'
    : ({ 401: 'signIn', 403: 'forbidden', 404: 'notFound', 409: 'changed', 419: 'session', 422: 'invalid', 429: 'rateLimit' }[status] || (status >= 500 ? 'server' : 'connection'))
  return new AppError(code, status, fields)
}
