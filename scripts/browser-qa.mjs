import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import path from 'node:path';

const require=createRequire('/home/sergey/.local/share/imon-toolkit/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const port=4314,base=`http://127.0.0.1:${port}`,artifacts=path.resolve('artifacts');
await mkdir(artifacts,{recursive:true});
const report={project:'six-senses',startedAt:new Date().toISOString(),widths:[],checks:[],pageErrors:[],assetFailures:[],mockedRequests:[],ok:false};
let serverOutput='',browser,releaseHeldRequest,serverError,cleanupPromise;
const server=spawn(process.execPath,['node_modules/astro/bin/astro.mjs','dev','--host','127.0.0.1','--port',String(port)],{cwd:process.cwd(),env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe'],detached:true});
server.stdout.on('data',chunk=>serverOutput+=chunk.toString());
server.stderr.on('data',chunk=>serverOutput+=chunk.toString());
server.on('error',error=>serverError=error);
async function cleanup(){
 if(cleanupPromise)return cleanupPromise;
 cleanupPromise=(async()=>{
  releaseHeldRequest?.();
  const closingBrowser=browser?browser.close().catch(()=>{}):Promise.resolve();
  if(server.pid){try{process.kill(-server.pid,'SIGTERM');}catch{}}
  await delay(300);
  if(server.pid&&server.exitCode===null&&server.signalCode===null){try{process.kill(-server.pid,'SIGKILL');}catch{}}
  await Promise.race([closingBrowser,delay(2000)]);
 })();
 return cleanupPromise;
}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await cleanup();process.exit(signal==='SIGINT'?130:143);});
const check=name=>report.checks.push(name);
const observe=page=>{
 page.setDefaultTimeout(15000);
 page.on('pageerror',error=>report.pageErrors.push(error.message));
 page.on('response',response=>{if(response.status()>=400&&/\/(?:assets|fonts)\//.test(response.url()))report.assetFailures.push({url:response.url(),status:response.status()});});
};
async function ready(){
 const until=Date.now()+45000;
 while(Date.now()<until){
  if(serverError)throw serverError;
  if(server.exitCode!==null)throw new Error(`Astro exited before ready: ${server.exitCode}\n${serverOutput}`);
  try{if((await fetch(base,{signal:AbortSignal.timeout(2000)})).ok)return;}catch{}
  await delay(250);
 }
 throw new Error(`Astro did not become ready. ${serverOutput.slice(-6000)}`);
}
async function settle(page){
 await page.evaluate(async()=>{
  await document.fonts.ready;
  // Inspect every original image, including inactive scenes and closed dialogs.
  const images=Array.from(document.images).filter(image=>image.getAttribute('src'));
  images.forEach(image=>image.loading='eager');
  await Promise.all(images.map(image=>image.decode().catch(()=>null)));
 });
}
async function dialogOpen(page,id,open=true){
 await page.waitForFunction(({id,open})=>document.getElementById(id)?.open===open,{id,open});
}
async function zoomReady(page){
 await page.waitForFunction(()=>{const image=document.querySelector('[data-zoom-image]');return document.querySelector('#zoom-dialog')?.open&&!document.querySelector('.zoom-stage')?.hasAttribute('aria-busy')&&!image?.hidden&&image?.complete&&image.naturalWidth>0;});
}
async function galleryCount(page,value){await page.waitForFunction(value=>document.querySelector('[data-gallery-current]')?.textContent?.trim()===value,value);}
async function zoomGeometry(page){
 return page.evaluate(()=>{
  const stage=document.querySelector('.zoom-stage').getBoundingClientRect(),image=document.querySelector('[data-zoom-image]'),box=image.getBoundingClientRect();
  const ratio=Math.min(box.width/image.naturalWidth,box.height/image.naturalHeight),width=image.naturalWidth*ratio,height=image.naturalHeight*ratio;
  const left=box.left+(box.width-width)/2,top=box.top+(box.height-height)/2;
  return{stage:{left:stage.left,right:stage.right,top:stage.top,bottom:stage.bottom,width:stage.width,height:stage.height},image:{left,right:left+width,top,bottom:top+height,width,height}};
 });
}
function assertPanBounds(box){
 for(const[first,last,size]of [['left','right','width'],['top','bottom','height']]){
  if(box.image[size]>=box.stage[size]-1)assert.ok(box.image[first]<=box.stage[first]+1&&box.image[last]>=box.stage[last]-1,`Pan exposes empty stage: ${JSON.stringify(box)}`);
  else assert.ok(Math.abs((box.image[first]+box.image[last]-box.stage[first]-box.stage[last])/2)<=1,`Smaller image lost its centered fit: ${JSON.stringify(box)}`);
 }
}
async function focused(locator){
 await locator.page().waitForFunction(selector=>document.querySelector(selector)===document.activeElement,await locator.evaluate(element=>{
  if(!element.id)element.id=`qa-focus-${Math.random().toString(36).slice(2)}`;
  return `#${element.id}`;
 }));
}
async function formIdle(form){await form.page().waitForFunction(id=>!document.getElementById(id)?.hasAttribute('aria-busy'),await form.getAttribute('id'));}
async function fillForm(form,message='Automated UI check. No real enquiry is sent.'){
 await form.locator('[name="firstName"]').fill('Website');
 await form.locator('[name="lastName"]').fill('Verification');
 await form.locator('[name="email"]').fill('qa@example.com');
 await form.locator('[name="phone"]').fill('+10000000000');
 await form.locator('[name="country"]').selectOption('Other');
 await form.locator('[name="otherCountry"]').fill('Test country');
 await form.locator('[name="message"]').fill(message);
 await form.locator('[name="consent"]').check();
 await delay(850);
}
try{
 await ready();browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:937},reducedMotion:'reduce'});
 const page=await context.newPage();observe(page);
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:width>768?937:844});
  const response=await page.goto(base,{waitUntil:'networkidle'});assert.equal(response?.status(),200);await settle(page);
  const measurement=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,chapters:document.querySelectorAll('main>section').length,h1:document.querySelectorAll('h1').length,broken:Array.from(document.images).filter(image=>image.getAttribute('src')&&(!image.complete||image.naturalWidth===0)).map(image=>image.getAttribute('src')),metricOverflow:Array.from(document.querySelectorAll('.hero-metrics dd,.investment-metrics h3')).filter(element=>element.scrollWidth>element.clientWidth+2).map(element=>element.textContent)}));
  assert.ok(measurement.scroll<=width+1,`Document overflow at ${width}: ${measurement.scroll}`);
  assert.ok(measurement.body<=width+1,`Body overflow at ${width}: ${measurement.body}`);
  assert.equal(measurement.chapters,8);assert.equal(measurement.h1,1);
  assert.deepEqual(measurement.broken,[],`Broken original assets at ${width}`);
  assert.deepEqual(measurement.metricOverflow,[],`Replacement metric text overflows at ${width}`);
  report.widths.push(measurement);
  if(width===1440){
   assert.equal(await page.locator('.chapter.is-story').count(),0);
   await page.locator('#home [data-story-switch="1"]').click();
   assert.equal(await page.locator('#home .state-primary').evaluate(element=>element.inert),true);
   assert.equal(await page.locator('#home .state-secondary').isVisible(),true);
   await page.locator('#home [data-story-switch="0"]').click();
  }
  await page.evaluate(()=>scrollTo(0,0));
  if(width===1440||width===390)await page.screenshot({path:path.join(artifacts,`home-${width}.png`)});
 }
 check('HTTP 200; eight chapters; one h1; all original images load; no horizontal or metric-text overflow at 1440/768/390/320; reduced-motion view controls work');

 await page.setViewportSize({width:390,height:844});
 const menuButton=page.locator('.menu-toggle');
 await menuButton.click();await dialogOpen(page,'menu-dialog');assert.equal(await menuButton.getAttribute('aria-expanded'),'true');
 await page.keyboard.press('Escape');await dialogOpen(page,'menu-dialog',false);await focused(menuButton);assert.equal(await menuButton.getAttribute('aria-expanded'),'false');
 await menuButton.click();await page.locator('#menu-dialog a[href="#layouts"]').click();await dialogOpen(page,'menu-dialog',false);assert.equal(new URL(page.url()).hash,'#layouts');
 check('Mobile menu opens, navigates to layouts, closes with Escape and restores focus');

 const triplexButton=page.locator('.layout-card--triplex .layout-card__plan');
 await triplexButton.click();await dialogOpen(page,'unit-dialog');
 assert.match(await page.locator('#unit-title').innerText(),/Triplex A/i);
 assert.equal(await page.locator('[data-unit-panel="triplex"]').isVisible(),true);
 assert.equal(await page.locator('[data-unit-panel="duplex"]').isVisible(),false);
 assert.match(await page.locator('[data-unit-panel="triplex"]').innerText(),/1,174\.69/);
 await page.locator('#unit-dialog .unit-nav [data-unit="duplex"]').click();
 assert.match(await page.locator('#unit-title').innerText(),/Duplex B1/i);
 assert.equal(await page.locator('[data-unit-panel="duplex"]').isVisible(),true);
 assert.equal(await page.locator('[data-unit-panel="triplex"]').isVisible(),false);
 assert.match(await page.locator('[data-unit-panel="duplex"]').innerText(),/935\.02/);
 assert.equal(await page.locator('#unit-dialog .unit-nav [data-unit="duplex"]').getAttribute('aria-pressed'),'true');
 const planZoom=page.locator('[data-plan-zoom="duplex"]');
 await planZoom.click();await dialogOpen(page,'zoom-dialog');await zoomReady(page);
 await page.locator('[data-zoom-in]').click();await page.waitForFunction(()=>document.querySelector('[data-zoom-reset]')?.textContent==='150%');
 const beforePan=await zoomGeometry(page);assertPanBounds(beforePan);
 await page.locator('.zoom-stage').focus();await page.keyboard.press('ArrowRight');
 if(beforePan.image.width>beforePan.stage.width+2){
  await page.waitForFunction(previous=>{const image=document.querySelector('[data-zoom-image]'),box=image.getBoundingClientRect(),ratio=Math.min(box.width/image.naturalWidth,box.height/image.naturalHeight);return box.left+(box.width-image.naturalWidth*ratio)/2<previous-1;},beforePan.image.left);
 }
 assertPanBounds(await zoomGeometry(page));
 for(let i=0;i<8;i++)await page.keyboard.press('ArrowRight');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
 const edge=await zoomGeometry(page);assertPanBounds(edge);
 if(edge.image.width>edge.stage.width+2)assert.ok(Math.abs(edge.image.right-edge.stage.right)<=2,'Panning toward the right stops at the image edge');
 await page.locator('[data-zoom-reset]').click();await page.waitForFunction(()=>document.querySelector('[data-zoom-reset]')?.textContent==='Fit');assertPanBounds(await zoomGeometry(page));
 await page.keyboard.press('Escape');await dialogOpen(page,'zoom-dialog',false);await focused(planZoom);
 await page.keyboard.press('Escape');await dialogOpen(page,'unit-dialog',false);await focused(triplexButton);
 check('Triplex and Duplex detail controls preserve original areas; nested plan zoom/pan/reset/Escape restore focus');

 const gallery=page.locator('.gallery');
 assert.equal(await page.locator('[data-gallery-current]').innerText(),'1');
 const firstImage=await page.locator('[data-gallery-image]').getAttribute('src');
 await page.locator('.gallery__controls [data-gallery-next]').click();await galleryCount(page,'2');assert.equal(await page.locator('[data-gallery-current]').innerText(),'2');
 assert.notEqual(await page.locator('[data-gallery-image]').getAttribute('src'),firstImage);
 await gallery.focus();await page.keyboard.press('ArrowRight');await galleryCount(page,'3');assert.equal(await page.locator('[data-gallery-current]').innerText(),'3');
 await page.keyboard.press('ArrowLeft');await galleryCount(page,'2');assert.equal(await page.locator('[data-gallery-current]').innerText(),'2');
 const galleryZoom=page.locator('[data-gallery-zoom]');await galleryZoom.click();await dialogOpen(page,'zoom-dialog');await zoomReady(page);
 assert.equal(await page.locator('[data-zoom-image]').getAttribute('src'),await page.locator('[data-gallery-image]').getAttribute('src'));
 await page.keyboard.press('Escape');await dialogOpen(page,'zoom-dialog',false);await focused(galleryZoom);
 const mapButton=page.locator('[data-location-zoom]');await mapButton.click();await dialogOpen(page,'zoom-dialog');
 assert.match(await page.locator('#zoom-title').innerText(),/^Dubai Marina$/i);await page.keyboard.press('Escape');await dialogOpen(page,'zoom-dialog',false);await focused(mapButton);
 check('Four-image gallery advances with arrows/keyboard; gallery and map open original images and restore focus');

 const posted=[];
 const heldRequest=new Promise(resolve=>releaseHeldRequest=resolve);
 await page.route('**/api/enquiry',async route=>{
  const payload=route.request().postDataJSON();posted.push(payload);const attempt=posted.length;
  if(attempt===1){await route.abort('failed');return;}
  if(attempt===2){await heldRequest;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Storage is temporarily unavailable. Please retry.'})});return;}
  if(attempt===3){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:false,error:'Request not confirmed. Please retry.'})});return;}
  if(attempt===4){await route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({error:'Please check the highlighted fields.',fields:{email:'Confirm your email address.'}})});return;}
  await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:payload.submissionId})});
 });
 await triplexButton.click();await dialogOpen(page,'unit-dialog');
 const unitEnquiry=page.locator('[data-unit-panel="triplex"] [data-enquire]');
 await unitEnquiry.click();await dialogOpen(page,'enquiry-dialog');
 const form=page.locator('#modal-form'),status=form.locator('[data-form-status]'),success=page.locator('#enquiry-dialog .enquiry-success'),submit=form.locator('[type="submit"]');
 assert.match(await page.locator('#enquiry-dialog [data-interest]').innerText(),/^Unit 01 \| Triplex A$/i);
 await submit.click();assert.equal(posted.length,0);
 for(const name of ['firstName','lastName','email','phone','country','consent'])assert.ok((await form.locator(`[data-error="${name}"]`).innerText()).length>0,`Missing ${name} error`);
 await fillForm(form);
 const privacy=form.locator('[data-privacy]');await privacy.click();await dialogOpen(page,'privacy-dialog');
 await page.keyboard.press('Escape');await dialogOpen(page,'privacy-dialog',false);await focused(privacy);await dialogOpen(page,'enquiry-dialog');
 check('Contextual modal validates all required fields without sending, supports native country/other-country inputs and nested privacy focus');

 await submit.click();await formIdle(form);
 assert.equal(posted.length,1);assert.equal(await success.isVisible(),false);assert.equal(await form.locator('[name="email"]').inputValue(),'qa@example.com');
 assert.match(await form.locator('[data-submit-label]').innerText(),/^Try again$/i);
 await page.keyboard.press('Escape');await dialogOpen(page,'enquiry-dialog',false);await focused(unitEnquiry);
 await unitEnquiry.click();await dialogOpen(page,'enquiry-dialog');
 assert.equal(await form.locator('[name="otherCountry"]').inputValue(),'Test country');
 await submit.click();await page.waitForFunction(()=>document.querySelector('#modal-form').getAttribute('aria-busy')==='true');
 assert.equal(await form.locator('[name="email"]').isDisabled(),true);
 // Exercise the JS guard, even if a second submit bypasses the disabled button.
 await form.evaluate(element=>{element.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));element.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 await page.keyboard.press('Escape');await dialogOpen(page,'enquiry-dialog',false);await unitEnquiry.click();await dialogOpen(page,'enquiry-dialog');
 assert.equal(await form.locator('[name="email"]').isDisabled(),true);await delay(150);assert.equal(posted.length,2,'Pending request was duplicated');
 releaseHeldRequest();await formIdle(form);assert.match(await status.innerText(),/Storage is temporarily unavailable/i);assert.equal(await success.isVisible(),false);
 await submit.click();await formIdle(form);assert.equal(posted.length,3);assert.match(await status.innerText(),/Request not confirmed/i);assert.equal(await success.isVisible(),false);
 assert.ok(posted.slice(0,3).every(item=>item.submissionId===posted[0].submissionId&&item.startedAt===posted[0].startedAt),'Unchanged retries, including reopen, must retain UUID and start time');
 check('Network failure, close/reopen, pending reopen and duplicate-submit guard retain fields and UUID; 503 and ok:false never show success');

 await form.locator('[name="message"]').fill('Updated automated UI verification. No real enquiry is sent.');
 await submit.click();await formIdle(form);assert.equal(posted.length,4);assert.notEqual(posted[3].submissionId,posted[0].submissionId);
 assert.equal(await form.locator('[name="email"]').getAttribute('aria-invalid'),'true');assert.match(await form.locator('[data-error="email"]').innerText(),/Confirm your email/i);assert.equal(await success.isVisible(),false);
 await submit.click();await success.waitFor({state:'visible'});await formIdle(form);assert.equal(posted.length,5);assert.equal(posted[4].submissionId,posted[3].submissionId);await focused(success);
 assert.ok(posted.every(item=>item.project==='six-senses'&&item.context==='Unit 01 | Triplex A'&&item.consent===true));
 for(const item of posted)assert.match(item.submissionId,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
 await page.screenshot({path:path.join(artifacts,'enquiry-success-390.png')});
 check('Edited payload creates a fresh UUID; 422 fields are displayed; unchanged retry keeps that UUID; only confirmed ok:true/id shows success');

 await page.keyboard.press('Escape');await dialogOpen(page,'enquiry-dialog',false);await unitEnquiry.click();await dialogOpen(page,'enquiry-dialog');
 assert.equal(await form.locator('[name="firstName"]').inputValue(),'');assert.equal(await form.locator('[name="country"]').inputValue(),'');assert.equal(await form.locator('.other-country').isVisible(),false);assert.equal(await success.isVisible(),false);
 await fillForm(form);await submit.click();await success.waitFor({state:'visible'});await formIdle(form);assert.equal(posted.length,6);assert.notEqual(posted[5].submissionId,posted[4].submissionId);
 await page.keyboard.press('Escape');await dialogOpen(page,'enquiry-dialog',false);await page.keyboard.press('Escape');await dialogOpen(page,'unit-dialog',false);
 check('Reopening after confirmed success starts a clean enquiry with a new UUID');
 const inline=page.locator('#contact-form');await inline.locator('[type="submit"]').click();assert.ok((await inline.locator('[data-error="email"]').innerText()).length>0);assert.equal(posted.length,6);
 const footerPrivacy=page.locator('footer [data-privacy]');await footerPrivacy.click();await dialogOpen(page,'privacy-dialog');await page.keyboard.press('Escape');await dialogOpen(page,'privacy-dialog',false);await focused(footerPrivacy);
 check('Inline contact form validates independently; footer privacy opens and restores focus');
 report.mockedRequests=posted.map(item=>({project:item.project,context:item.context,submissionId:item.submissionId,startedAt:item.startedAt,consent:item.consent}));

 const motionContext=await browser.newContext({viewport:{width:1440,height:937},reducedMotion:'no-preference'});
 const motion=await motionContext.newPage();observe(motion);await motion.goto(base,{waitUntil:'networkidle'});await settle(motion);
 await motion.waitForFunction(()=>!document.querySelector('.intro').classList.contains('is-active'));
 assert.equal(await motion.locator('.chapter.is-story').count(),7);
 assert.equal(await motion.locator('#home .chapter__stage').evaluate(element=>getComputedStyle(element).position),'sticky');
 await motion.locator('.desktop-nav a[href="#layouts"]').click();
 await motion.waitForFunction(()=>document.querySelector('#layouts').dataset.view==='1'&&getComputedStyle(document.querySelector('#layouts .state-secondary')).opacity==='1');
 const pinned=await motion.locator('#layouts .chapter__stage').boundingBox();assert.ok(pinned&&Math.abs(pinned.y)<5,'Layout story did not pin at its detailed state');
 await motion.locator('.layout-card--triplex .layout-card__plan').click();await dialogOpen(motion,'unit-dialog');await motion.keyboard.press('Escape');await dialogOpen(motion,'unit-dialog',false);
 await motion.screenshot({path:path.join(artifacts,'motion-layouts-1440.png')});await motionContext.close();
 check('Motion-enabled desktop creates seven sticky stories; navigation reveals functional layout state and its details open');
 assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.assetFailures,[]);report.ok=true;
}catch(error){report.error=error.stack||String(error);process.exitCode=1;}
finally{
 await cleanup();
 report.finishedAt=new Date().toISOString();await writeFile(path.join(artifacts,'browser-qa.json'),JSON.stringify(report,null,2));await writeFile(path.join(artifacts,'dev-server.log'),serverOutput);console.log(JSON.stringify(report,null,2));
}
