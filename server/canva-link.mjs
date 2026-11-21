// Resolve only Canva's own HTTPS short links. Never proxy content or credentials.
const cache = new Map()
const pending = new Map()
const safeUrl = value => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.port && !url.username && !url.password &&
      ['canva.link','www.canva.link','www.canva.com','canva.com'].includes(url.hostname) ? url : null
  } catch { return null }
}
export async function resolveCanvaLink(value, fetcher = fetch) {
  let url = typeof value === 'string' && value.length <= 2048 ? safeUrl(value) : null
  if (!url || !['canva.link','www.canva.link'].includes(url.hostname) || !/^\/[\w-]+\/?$/.test(url.pathname)) return null
  const signal = AbortSignal.timeout(6000)
  for (let hop=0; hop<5; hop++) {
    if (['canva.com','www.canva.com'].includes(url.hostname)) {
      const design=url.pathname.match(/^\/design\/([\w-]+)(?:\/([\w-]+))?\/(?:view|edit|watch)\/?$/)
      if (design) return `https://www.canva.com/design/${design[1]}${design[2] ? '/'+design[2] : ''}/view`
    }
    let response = await fetcher(url.href, {method:'HEAD',redirect:'manual',signal,headers:{Accept:'text/html'}})
    if ([405,501].includes(response.status)) {
      await response.body?.cancel()
      // Some redirect servers reject HEAD. Only inspect GET response headers.
      // Do not retry permission failures or bypass Canva's access restrictions.
      response = await fetcher(url.href, {method:'GET',redirect:'manual',signal,headers:{Accept:'text/html'}})
    }
    await response.body?.cancel()
    const location=response.headers.get('location')
    if (![301,302,303,307,308].includes(response.status) || !location) return null
    url=safeUrl(new URL(location,url).href)
    if (!url) return null
  }
  return null
}

export async function canvaLinkHandler(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8')
  res.setHeader('X-Content-Type-Options','nosniff')
  res.setHeader('Cache-Control','no-store')
  if (req.method !== 'GET') { res.statusCode=405; res.setHeader('Allow','GET'); res.end('{}'); return }
  const params=new URL(req.url,'https://local.invalid').searchParams
  const value=params.get('url') || ''
  if (value.length>2048) {res.statusCode=400;res.end('{}');return}
  let result=params.get('refresh')==='1' ? null : cache.get(value)
  if (!result || result.expires<Date.now()) {
    if (!pending.has(value)) {
      if (pending.size>=8) {res.statusCode=429;res.end('{}');return}
      pending.set(value,resolveCanvaLink(value).catch(()=>null).finally(()=>pending.delete(value)))
    }
    result={href:await pending.get(value),expires:Date.now()+300000}
    if (result.href) {
      if (cache.size>=100) cache.delete(cache.keys().next().value)
      cache.set(value,result)
    } else cache.delete(value)
  }
  res.end(JSON.stringify({href:result.href,verified:false}))
}
