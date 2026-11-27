/*
 * Cliente del Suitelet. Cada llamada va a la URL del Suitelet con ?endpoint=...
 * El Suitelet responde { ok: true, data } o { ok: false, error }: acá se devuelve `data`
 * o se tira un Error con el mensaje del servidor.
 */

/**
 * URL del Suitelet: la inyectada en window.SUITELET_URL (si es una URL real, no un marcador
 * tipo __SUITELET_URL__ sin reemplazar), o la página actual, que ya trae script y deploy.
 */
const urlInyectada = () => {
  const u = window.SUITELET_URL
  return typeof u === 'string' && u && !u.startsWith('__') ? u : null
}
const baseUrl = () => new URL(urlInyectada() ?? window.location.href, window.location.origin)

async function request(endpoint, { params = {}, body, signal } = {}) {
  const url = baseUrl()
  url.searchParams.set('endpoint', endpoint)
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== '' && valor != null) url.searchParams.set(clave, valor)
  }

  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })

  let json
  try {
    json = await res.json()
  } catch {
    throw new Error(`Respuesta inválida del servidor (HTTP ${res.status})`)
  }
  if (!json.ok) throw new Error(json.error || 'Error del servidor')
  return json.data
}

export const apiGet = (endpoint, params, signal) => request(endpoint, { params, signal })
export const apiPost = (endpoint, body) => request(endpoint, { body })
