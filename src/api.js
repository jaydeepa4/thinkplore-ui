const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

function validationMessage(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').join(' ')
  return ''
}

export async function request(path, { method = 'GET', body, csrfToken } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (!safeMethods.has(method) && csrfToken) headers['X-CSRFToken'] = csrfToken

  let response
  try {
    response = await fetch('/api' + path, {
      method,
      credentials: 'same-origin',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Could not connect to Thinkplore. Please try again.')
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const fields = Object.fromEntries(
      Object.entries(data?.errors ?? data ?? {})
        .filter(([field]) => field !== 'detail' && field !== 'non_field_errors')
        .map(([field, value]) => [field, validationMessage(value)])
        .filter(([, message]) => message),
    )
    const detail = validationMessage(data?.detail)
    const general = validationMessage(data?.non_field_errors)
    const error = new Error(
      (detail.startsWith('CSRF Failed:') ? 'Please refresh this page and try again.' : detail)
      || general
      || Object.values(fields)[0]
      || 'Something went wrong. Please try again.',
    )
    error.fields = fields
    error.status = response.status
    throw error
  }

  if (data === null) throw new Error('Thinkplore returned an unexpected response. Please try again.')
  return data
}
