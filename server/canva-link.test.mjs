import {test} from 'node:test'
import assert from 'node:assert/strict'
import {resolveCanvaLink,canvaLinkHandler} from './canva-link.mjs'

test('Canva short redirects resolve to safe previews without downloading files',async()=>{
  let calls=0
  const result=await resolveCanvaLink('https://canva.link/example',async(url,options)=>{
    calls++;assert.equal(options.method,'HEAD');assert.equal(options.redirect,'manual');assert.ok(options.signal)
    return new Response(null,{status:302,headers:{location:'https://www.canva.com/design/ABC/shareToken/view?utm_source=share'}})
  })
  assert.equal(result,'https://www.canva.com/design/ABC/shareToken/view');assert.equal(calls,1)
})
test('redirects cannot reach non-Canva hosts, insecure URLs, ports or credentials',async()=>{
  for(const destination of ['http://www.canva.com/design/ABC/view','https://127.0.0.1/','https://canva.com.attacker.test/','https://user:pass@www.canva.com/design/ABC/view','https://www.canva.com:8080/design/ABC/view']){
    let calls=0
    assert.equal(await resolveCanvaLink('https://canva.link/example',async()=>{calls++;return new Response(null,{status:302,headers:{location:destination}})}),null)
    assert.equal(calls,1)
  }
})
test('blocked links, folder links and redirect loops have bounded failures',async()=>{
  assert.equal(await resolveCanvaLink('https://canva.link/example',async()=>new Response(null,{status:403})),null)
  let calls=0
  assert.equal(await resolveCanvaLink('https://canva.link/example',async()=>{calls++;return new Response(null,{status:302,headers:{location:'/example'}})}),null)
  assert.equal(calls,5)
  for(let i=0;i<1000;i++) assert.equal(await resolveCanvaLink(`https://canva.link.attacker${i}.test/example`,()=>{throw Error('must never fetch')}),null)
})

test('HEAD-unsupported redirect servers fall back to GET headers, not file contents',async()=>{
  const methods=[]
  const result=await resolveCanvaLink('https://canva.link/example',async(url,options)=>{
    methods.push(options.method)
    return options.method==='HEAD'
      ? new Response(null,{status:405})
      : new Response(null,{status:302,headers:{location:'https://www.canva.com/design/ABC/token/view'}})
  })
  assert.equal(result,'https://www.canva.com/design/ABC/token/view')
  assert.deepEqual(methods,['HEAD','GET'])
})

test('failed lookups can recover immediately and explicit reload refreshes cached redirects',async(t)=>{
  let calls=0
  t.mock.method(globalThis,'fetch',async()=>{
    calls++
    return calls===1 ? new Response(null,{status:503}) : new Response(null,{status:302,headers:{location:`https://www.canva.com/design/ABC/token${calls}/view`}})
  })
  const lookup=async(refresh='')=>{
    let body
    await canvaLinkHandler({method:'GET',url:`/api/canva-link?url=https%3A%2F%2Fcanva.link%2Fretry-case${refresh}`},{setHeader(){},end(value){body=value}})
    return JSON.parse(body).href
  }
  assert.equal(await lookup(),null)
  assert.equal(await lookup(),'https://www.canva.com/design/ABC/token2/view')
  assert.equal(await lookup(),'https://www.canva.com/design/ABC/token2/view')
  assert.equal(calls,2)
  assert.equal(await lookup('&refresh=1'),'https://www.canva.com/design/ABC/token3/view')
})
