import {test} from 'node:test';
import assert from 'node:assert/strict';
import download from '../api/download.mjs';
import {readCatalog} from '../catalog.mjs';
const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(body){this.body=body}});
test('download redirects only verified catalog files to official GitHub',async()=>{
 const catalog=await readCatalog();
 for(const release of catalog.releases)for(const file of release.files){
  const res=response();await download({method:'GET',url:`/api/download?path=${encodeURIComponent(`${release.tag}/${file.name}`)}`},res);
  assert.equal(res.statusCode,307);assert.equal(res.headers.Location,file.downloadUrl);
  assert.match(res.headers.Location,/^https:\/\/(?:github|codeload.github)\.com\/biged214\/sccompanion\//);
 }
});
test('unknown paths and writes never redirect',async()=>{
 for(const path of ['../secret','https://evil.example','v1.0.3/unknown.exe']){
  const res=response();await download({method:'GET',url:`/api/download?path=${encodeURIComponent(path)}`},res);assert.equal(res.statusCode,404);assert.equal(res.headers.Location,undefined);
 }
 const res=response();await download({method:'POST',url:'/api/download'},res);assert.equal(res.statusCode,405);
});
