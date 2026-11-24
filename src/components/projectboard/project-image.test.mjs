import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
const source = stripTypeScriptTypes(readFileSync(new URL('./project-image.ts',import.meta.url),'utf8'))
const {prepareProjectImage,prepareMemberPhoto} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('uploads fit the lower byte budgets, keep proportions and release decoded images on success or failure',async()=>{
  const originalDocument=globalThis.document, originalBitmap=globalThis.createImageBitmap
  let closed=0, draws=[], dimensions=[]
  const bitmap={width:1920,height:1080,close(){closed++}}
  let encode=(canvas,quality)=>'data:image/jpeg;base64,'+'A'.repeat(Math.round(canvas.width*canvas.height*quality))
  globalThis.createImageBitmap=async()=>bitmap
  globalThis.document={createElement(){
    const canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(...args){draws.push(args.slice(1))}}),
      toDataURL(type,quality){assert.equal(type,'image/jpeg');dimensions.push([this.width,this.height]);return encode(this,quality)}}
    return canvas
  }}
  try {
    const file={type:'image/png',size:1_000_000}
    const cover=await prepareProjectImage(file)
    assert.ok(cover.length<=160_000)
    assert.equal(closed,1)
    assert.ok(dimensions.some(([w])=>w<1280))
    assert.ok(dimensions.every(([w,h])=>Math.abs(w/h-16/9)<0.01))
    dimensions=[];draws=[]
    const portrait=await prepareMemberPhoto(file)
    assert.ok(portrait.length<=36_000)
    assert.ok(dimensions.every(([w,h])=>w===h&&w<=320))
    assert.deepEqual(draws[0].slice(0,4),[420,0,1080,1080])
    assert.equal(closed,2)
    encode=()=>'data:,'
    await assert.rejects(()=>prepareMemberPhoto(file),/compress/)
    assert.equal(closed,3)
    await assert.rejects(()=>prepareProjectImage({...file,type:'text/html'}),/JPG, PNG or WebP/)
    await assert.rejects(()=>prepareProjectImage({...file,size:6*1024*1024}),/smaller than 5 MB/)
    assert.equal(closed,3)
  } finally {globalThis.document=originalDocument;globalThis.createImageBitmap=originalBitmap}
})
