/**
 * Normal-motion regression checks, with an owned local Astro server.
 * Run on the verification server: node scripts/motion-qa.mjs
 * Optional: PLAYWRIGHT_PACKAGE=/absolute/path/to/playwright/package.json
 * Neither engine submits an enquiry. All /api/ requests are intercepted.
 * RAF/long-task measurements describe this run; they are not an FPS pass gate.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const artifacts=path.join(root,'artifacts/motion-qa');
const startedAt=Date.now(),maximumRuntime=92000;
const report={project:'six-senses',startedAt:new Date(startedAt).toISOString(),ok:false,
  scope:'Chromium and WebKit, normal motion, desktop 1440x900, short desktop 1440x650, touch 390x844',
  performanceScope:'Warm hero-to-about scroll in a headless browser on this machine. Diagnostic only; not a device-independent FPS or performance score.',
  engines:[],timedOut:false};
let browser,server,serverError,serverOutput='',cleanupPromise;
await mkdir(artifacts,{recursive:true});

async function cleanup(){
  if(cleanupPromise)return cleanupPromise;
  cleanupPromise=(async()=>{
    const closing=browser?browser.close().catch(()=>{}):Promise.resolve();
    if(server?.pid){try{process.kill(-server.pid,'SIGTERM');}catch{}}
    await delay(300);
    if(server?.pid&&server.exitCode===null&&server.signalCode===null){
      try{process.kill(-server.pid,'SIGKILL');}catch{}
    }
    await Promise.race([closing,delay(2000)]);
  })();
  return cleanupPromise;
}
const deadline=setTimeout(()=>{
  report.timedOut=true;
  report.error=`Exceeded the ${maximumRuntime/1000}s runtime budget.`;
  void cleanup();
},maximumRuntime);
deadline.unref();
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{
  report.error=`Interrupted by ${signal}`;
  await cleanup();
  await writeFile(path.join(artifacts,'report.json'),JSON.stringify(report,null,2));
  process.exit(signal==='SIGINT'?130:143);
});

async function freePort(){
  const probe=createServer();
  await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});
  const port=probe.address().port;
  await new Promise((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
  return port;
}
async function ready(base){
  const until=Date.now()+20000;
  while(Date.now()<until&&!report.timedOut){
    if(serverError)throw serverError;
    if(server&&server.exitCode!==null)throw new Error(`Astro exited before ready (${server.exitCode}).`);
    try{if((await fetch(base,{signal:AbortSignal.timeout(1500)})).ok)return;}catch{}
    await delay(150);
  }
  throw new Error('The owned Astro server did not become ready within 20s.');
}

// Observe rendered geometry and opacity on successive frames. This also waits
// through smooth navigation, GSAP scrub, mode restoration and mobile reveals.
// A delay alone never marks an animation as settled.
async function settled(page){
  return page.evaluate(()=>new Promise((resolve,reject)=>{
    const selectors='.site-header,main>section,.chapter__stage,.state-primary,.state-secondary,#home h1,.hero-metrics,.invitation-card,.invitation-card h2,.invitation-card__brand,.about__heading,.about__copy,.scene-action,.architecture-photo,.architecture-copy,.architecture-copy p,#about .state-secondary h3,#about .state-secondary h3>span,.location-copy,.map-zoom,.layout-cards,.layout-card,.gallery,.investment-collage>div,.investment__closing>h3,.contact__panel';
    const nodes=[...document.querySelectorAll(selectors)];
    const start=performance.now();
    let previous='',stableFrames=0,frames=0,frame;
    const timeout=setTimeout(()=>{cancelAnimationFrame(frame);reject(new Error(`Animation did not settle after ${frames} observed frames.`));},4500);
    function sample(){
      frames++;
      const signature=JSON.stringify([scrollY,innerWidth,innerHeight,document.documentElement.scrollHeight,...nodes.map(element=>{
        const style=getComputedStyle(element),rect=element.getBoundingClientRect();
        return [Math.round(rect.x*100),Math.round(rect.y*100),Math.round(rect.width*100),Math.round(rect.height*100),style.transform,style.opacity,style.visibility,style.clipPath,element.dataset.view];
      })]);
      stableFrames=signature===previous?stableFrames+1:0;
      previous=signature;
      if(stableFrames>=7&&performance.now()-start>=220){
        clearTimeout(timeout);resolve({frames,elapsedMs:Math.round(performance.now()-start),scrollY});
      }else frame=requestAnimationFrame(sample);
    }
    frame=requestAnimationFrame(sample);
  }));
}
async function imageReady(page,selector){
  await page.waitForFunction(selector=>{
    const image=document.querySelector(selector);
    return image instanceof HTMLImageElement&&image.complete&&image.naturalWidth>0;
  },selector,{timeout:5000});
}
async function preparePage(page,base,storyMode){
  const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:15000});
  assert.equal(response?.status(),200,'The owned server must serve the actual page.');
  await page.waitForFunction(()=>document.querySelector('#home')?.dataset.view!==undefined);
  await page.waitForFunction(()=>document.fonts.status==='loaded');
  await page.waitForFunction(()=>!document.querySelector('.intro.is-active'),null,{timeout:3500});
  assert.equal(await page.locator('.chapter.is-story').count(),storyMode?7:0,'Unexpected initial motion mode.');
  await settled(page);
}
async function seek(page,id,progress){
  const target=await page.evaluate(({id,progress})=>{
    const chapter=document.getElementById(id),stage=chapter.querySelector('.chapter__stage');
    if(!chapter.classList.contains('is-story'))throw new Error(`${id} is not in story mode.`);
    const start=chapter.getBoundingClientRect().top+scrollY;
    const range=chapter.offsetHeight-stage.offsetHeight;
    const top=start+range*progress;
    window.scrollTo({top,behavior:'instant'});
    return {start,range,top};
  },{id,progress});
  assert.ok(target.range>500,`${id}: the story needs a real scroll interval.`);
  const stability=await settled(page);
  assert.ok(Math.abs(stability.scrollY-target.top)<=2,`${id}: sample did not reach progress ${progress}.`);
  return {target,stability};
}
async function scene(page,id,oldSelector,newSelector){
  return page.evaluate(({id,oldSelector,newSelector})=>{
    const chapter=document.getElementById(id),stage=chapter.querySelector('.chapter__stage');
    const primary=chapter.querySelector('.state-primary'),secondary=chapter.querySelector('.state-secondary');
    const box=element=>{const r=element.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
    function visible(element){
      const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
      let opacity=1,left=Math.max(0,rect.left),right=Math.min(innerWidth,rect.right),top=Math.max(0,rect.top),bottom=Math.min(innerHeight,rect.bottom),displayed=true;
      for(let parent=element;parent;parent=parent.parentElement){
        const css=getComputedStyle(parent);
        opacity*=Number(css.opacity);
        if(css.display==='none')displayed=false;
        if(parent!==element){
          const clip=parent.getBoundingClientRect();
          if(/hidden|clip|auto|scroll/.test(css.overflowX)){left=Math.max(left,clip.left);right=Math.min(right,clip.right);}
          if(/hidden|clip|auto|scroll/.test(css.overflowY)){top=Math.max(top,clip.top);bottom=Math.min(bottom,clip.bottom);}
        }
      }
      return {tag:element.tagName,class:element.className,opacity:Number(opacity.toFixed(4)),visible:displayed&&style.visibility==='visible'&&opacity>.05&&right-left>1&&bottom-top>1,rect:box(element)};
    }
    const state=element=>({inert:element.inert,ariaHidden:element.getAttribute('aria-hidden'),pointerEvents:getComputedStyle(element).pointerEvents,opacity:Number(getComputedStyle(element).opacity),visibility:getComputedStyle(element).visibility,rect:box(element)});
    return {id,view:chapter.dataset.view,scrollY,stage:box(stage),primary:state(primary),secondary:state(secondary),
      pressed:[...chapter.querySelectorAll('[data-story-switch]')].map(button=>({view:button.dataset.storySwitch,pressed:button.getAttribute('aria-pressed')})),
      old:[...primary.querySelectorAll(oldSelector)].map(visible),incoming:[...secondary.querySelectorAll(newSelector)].map(visible)};
  },{id,oldSelector,newSelector});
}
function selected(sample,view){
  assert.equal(sample.view,String(view),`${sample.id}: selected view`);
  assert.deepEqual(sample.pressed,[{view:'0',pressed:String(view===0)},{view:'1',pressed:String(view===1)}],`${sample.id}: pressed state`);
  for(const [index,state] of [sample.primary,sample.secondary].entries()){
    assert.equal(state.inert,index!==view,`${sample.id}: view ${index} inert state`);
    assert.equal(state.ariaHidden,index===view?null:'true',`${sample.id}: view ${index} accessible state`);
    assert.equal(state.pointerEvents,index===view?'auto':'none',`${sample.id}: view ${index} pointer access`);
  }
}
function foreground(sample,expected){
  assert.ok(sample.old.length&&sample.incoming.length,`${sample.id}: foreground selectors must match real content.`);
  const old=sample.old.some(item=>item.visible),incoming=sample.incoming.some(item=>item.visible);
  assert.ok(!(old&&incoming),`${sample.id}: old and new foreground overlap at a stable sample.`);
  if(expected==='old')assert.ok(old&&!incoming,`${sample.id}: primary foreground missing.`);
  if(expected==='new')assert.ok(incoming&&!old,`${sample.id}: incoming foreground missing.`);
  if(expected==='background')assert.ok(!old&&!incoming,`${sample.id}: foreground appeared during the image-only handoff.`);
}
async function activeSection(page){
  return page.evaluate(()=>{
    const line=innerHeight*.3;
    const active=[...document.querySelectorAll('main>section')].find(element=>{const r=element.getBoundingClientRect();return r.top<=line&&r.bottom>line;});
    const rect=active?.getBoundingClientRect();
    return {id:active?.id,top:rect?.top,bottom:rect?.bottom,viewport:innerHeight,scrollY,highlighted:document.querySelector('.desktop-nav [aria-current]')?.getAttribute('href')};
  });
}
async function dialogOpen(page,id,open=true){
  await page.waitForFunction(({id,open})=>document.getElementById(id)?.open===open,{id,open});
}
async function modalState(page,openIds=[]){
  // Native closing clears `open` and restores focus before the queued `close`
  // event runs the application's cleanup. Observe that complete state instead
  // of treating native focus restoration as proof that cleanup has finished.
  await page.waitForFunction(expected=>{
    const actual=[...document.querySelectorAll('dialog[open]')].map(dialog=>dialog.id).sort();
    const locked=expected.length>0;
    const bodyLocked=document.body.classList.contains('modal-open');
    const rootLocked=document.documentElement.classList.contains('modal-open');
    const menuExpanded=document.querySelector('.menu-toggle')?.getAttribute('aria-expanded');
    const scrollReleased=locked||[document.documentElement,document.body].every(element=>!['hidden','clip'].includes(getComputedStyle(element).overflowY));
    return actual.length===expected.length&&actual.every((id,index)=>id===expected[index])
      &&bodyLocked===locked&&rootLocked===locked&&scrollReleased
      &&menuExpanded===String(expected.includes('menu-dialog'));
  },[...openIds].sort());
}
async function focused(page,selector){
  await page.waitForFunction(selector=>document.activeElement?.matches(selector),selector);
}
async function containedFocus(page,id){
  await page.waitForFunction(id=>document.getElementById(id)?.contains(document.activeElement),id);
}
async function naturalStates(page){
  return page.evaluate(()=>({
    storyCount:document.querySelectorAll('.is-story').length,
    states:[...document.querySelectorAll('[data-story] .state-primary,[data-story] .state-secondary')].map(element=>{
      const css=getComputedStyle(element);
      return {chapter:element.closest('[data-story]').id,state:element.className,inert:element.inert,ariaHidden:element.getAttribute('aria-hidden'),position:css.position,opacity:Number(css.opacity),visibility:css.visibility,pointerEvents:css.pointerEvents,transform:css.transform};
    }),
    // These authored foregrounds have no mobile entrance animation. They must
    // be restored even when a mode switch happens midway through another scene.
    foregrounds:[...document.querySelectorAll('#home h1,.hero-metrics,.invitation-card,.invitation-card h2,.invitation-card__brand,.about__heading,.about__copy,.scene-action,#about .state-secondary h3,#about .state-secondary h3>span,.architecture-copy,.architecture-copy p')].map(element=>{
      const css=getComputedStyle(element);
      return {class:element.className,tag:element.tagName,opacity:Number(css.opacity),visibility:css.visibility};
    })
  }));
}
function assertNatural(sample){
  assert.equal(sample.storyCount,0,'Natural flow must not retain a scroll story.');
  assert.equal(sample.states.length,14,'Both original states must remain present.');
  for(const state of sample.states){
    const label=`${state.chapter}/${state.state}`;
    assert.equal(state.inert,false,`${label}: visible natural content is inert.`);
    assert.notEqual(state.ariaHidden,'true',`${label}: visible natural content is hidden from assistive technology.`);
    assert.equal(state.position,'relative',`${label}: not in document flow.`);
    assert.equal(state.opacity,1,`${label}: stale opacity.`);
    assert.equal(state.visibility,'visible',`${label}: stale visibility.`);
    assert.equal(state.pointerEvents,'auto',`${label}: pointer interaction blocked.`);
    assert.equal(state.transform,'none',`${label}: stale story transform.`);
  }
  assert.ok(sample.foregrounds.length>=10,'Natural-flow foreground checks must match real content.');
  for(const foreground of sample.foregrounds){
    assert.equal(foreground.opacity,1,`${foreground.class||foreground.tag}: stale foreground opacity after story cleanup.`);
    assert.equal(foreground.visibility,'visible',`${foreground.class||foreground.tag}: stale foreground visibility after story cleanup.`);
  }
}
async function diagnosticScroll(page){
  await seek(page,'home',0);
  const result=await page.evaluate(()=>new Promise(resolve=>{
    const chapter=document.getElementById('about'),stage=chapter.querySelector('.chapter__stage');
    const from=scrollY,to=chapter.getBoundingClientRect().top+scrollY+(chapter.offsetHeight-stage.offsetHeight)*.995;
    const requestedMs=2200,start=performance.now(),deltas=[],tasks=[];
    const supported=typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes.includes('longtask');
    const collect=entries=>entries.forEach(entry=>{if(entry.startTime>=start)tasks.push({startTime:entry.startTime,duration:entry.duration,name:entry.name});});
    const observer=supported?new PerformanceObserver(list=>collect(list.getEntries())):null;
    observer?.observe({type:'longtask',buffered:false});
    let first,last,frameCount=0;
    function frame(now){
      first??=now;
      if(last!==undefined)deltas.push(now-last);
      last=now;frameCount++;
      const progress=Math.min(1,(now-first)/requestedMs);
      window.scrollTo({top:from+(to-from)*progress,behavior:'instant'});
      if(progress<1){requestAnimationFrame(frame);return;}
      const end=performance.now(),finalScrollY=scrollY;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(observer){collect(observer.takeRecords());observer.disconnect();}
        resolve({requestedMs,elapsedMs:now-first,from,to,finalScrollY,frameCount,rafDeltasMs:deltas,
          longTasks:supported?{supported:true,entries:tasks.filter(task=>task.startTime<=end)}:{supported:false,entries:null}});
      }));
    }
    requestAnimationFrame(frame);
  }));
  const sorted=[...result.rafDeltasMs].sort((a,b)=>a-b);
  const percentile=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)]:null;
  result.rafSummary={medianMs:percentile(.5),p95Ms:percentile(.95),maxMs:sorted.at(-1)??null,over33ms:sorted.filter(value=>value>33.34).length,over50ms:sorted.filter(value=>value>50).length};
  if(result.longTasks.supported){
    result.longTasks.count=result.longTasks.entries.length;
    result.longTasks.totalDurationMs=result.longTasks.entries.reduce((sum,task)=>sum+task.duration,0);
  }
  assert.ok(result.frameCount>1&&result.to-result.from>1000,'The diagnostic must execute an actual multi-frame scroll.');
  assert.ok(Math.abs(result.finalScrollY-result.to)<=2,'The diagnostic did not reach its defined endpoint.');
  await settled(page);
  return result;
}

async function runEngine(name,type,base){
  const result={name,ok:false,checks:[],samples:[],screenshots:[],pageErrors:[],assetFailures:[],apiRequests:[]};
  report.engines.push(result);
  let page,context,ownedBrowser;
  async function step(name,fn){
    if(report.timedOut)throw new Error('The global runtime budget has expired.');
    result.stage=name;
    const start=Date.now();
    await fn();
    result.checks.push({name,elapsedMs:Date.now()-start});
  }
  async function screenshot(label){
    const filename=`${name}-${label}.png`;
    await page.screenshot({path:path.join(artifacts,filename),fullPage:false,timeout:4000});
    result.screenshots.push(filename);
  }
  async function newContext(options){
    context=await ownedBrowser.newContext({...options,deviceScaleFactor:1});
    await context.route(/\/api(?:\/|$)/,async route=>{
      const request=route.request();
      result.apiRequests.push({url:request.url(),method:request.method()});
      await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'Blocked by isolated motion QA. No enquiry was sent.'})});
    });
    page=await context.newPage();
    page.setDefaultTimeout(6000);
    page.on('pageerror',error=>result.pageErrors.push(error.message));
    page.on('response',response=>{
      if(response.status()>=400&&/\/(?:assets|fonts)\//.test(response.url()))result.assetFailures.push({url:response.url(),status:response.status()});
    });
  }
  async function sample(id,progress,expected,view){
    const scroll=await seek(page,id,progress);
    const selectors=id==='home'?['h1,.hero-metrics','.invitation-card']:['.about__heading,.about__copy,.scene-action','h3,h3>span,.architecture-copy,.architecture-copy p'];
    const measurement=await scene(page,id,...selectors);
    result.samples.push({progress,...measurement,...scroll});
    foreground(measurement,expected);
    if(view!==undefined)selected(measurement,view);
    return measurement;
  }
  async function navigate(id){
    await page.locator(`.desktop-nav a[href="#${id}"]`).click();
    await settled(page);
    assert.equal(new URL(page.url()).hash,`#${id}`,'The real navigation link must update the URL.');
    const active=await activeSection(page);
    assert.equal(active.id,id,`Navigation must arrive in ${id}.`);
    assert.equal(active.highlighted,`#${id}`,`Header must identify ${id}.`);
    result.samples.push({navigation:id,...active});
  }
  try{
    if(report.timedOut)throw new Error('The global runtime budget has expired.');
    ownedBrowser=await type.launch({headless:true,timeout:Math.max(1000,Math.min(10000,maximumRuntime-(Date.now()-startedAt)))});
    browser=ownedBrowser;
    result.version=ownedBrowser.version();
    await step('desktop normal-motion initialization',async()=>{
      await newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
      await preparePage(page,base,true);
      assert.equal(await page.evaluate(()=>matchMedia('(pointer:fine)').matches),true);
    });
    await step('skip link moves keyboard focus into the main content',async()=>{
      await page.keyboard.press('Tab');
      await focused(page,'.skip-link');
      await page.keyboard.press('Enter');
      await focused(page,'#main-content');
      await page.keyboard.press('Tab');
      await page.waitForFunction(()=>{
        const main=document.querySelector('#main-content'),active=document.activeElement;
        return active instanceof HTMLElement&&active!==main&&main.contains(active)&&active.tabIndex>=0&&!active.closest('.site-header,[inert]');
      });
      result.samples.push({skipLink:await page.evaluate(()=>({nextTag:document.activeElement.tagName,nextClass:document.activeElement.className,storySwitch:document.activeElement.getAttribute('data-story-switch')}))});
      // Return to pointer navigation so the subsequent visual captures do not
      // inherit the keyboard focus ring from this separate accessibility check.
      await page.mouse.click(8,450);
    });
    await step('hero primary, opaque handoff and invitation foreground',async()=>{
      await sample('home',.07,'old',0);
      await imageReady(page,'.hero__photo');
      await sample('home',.26,'old',0);
      await sample('home',.40,'background');
      const handoff=await sample('home',.57,'background',1);
      assert.ok(Math.abs(handoff.secondary.rect.top-handoff.stage.top)<2,'Hero incoming background must have arrived before the invitation.');
      assert.equal(handoff.secondary.opacity,1,'Hero background must remain opaque during its handoff.');
      await sample('home',.64,'new',1);
      await sample('home',.88,'new',1);
      await imageReady(page,'.hero__invitation>img');
      await screenshot('hero-invitation');
    });
    await step('about separated foregrounds and meaningful tower pan',async()=>{
      await sample('about',.07,'old',0);
      await sample('about',.26,'old',0);
      await sample('about',.40,'background');
      await sample('about',.64,'new',1);
      const reading=await sample('about',.76,'new',1);
      assert.ok(reading.incoming.length>=8,'About reading must include the heading lines and both text columns.');
      for(const item of reading.incoming){
        assert.equal(item.opacity,1,`About reading: ${item.class||item.tag} is still fading in or out.`);
        assert.equal(item.visible,true,`About reading: ${item.class||item.tag} is not visible.`);
      }
      await imageReady(page,'.architecture-photo img');
      const before=await page.locator('.architecture-photo').evaluate(element=>({top:element.getBoundingClientRect().top,height:element.offsetHeight}));
      await screenshot('about-reading');
      const end=await sample('about',.995,'background',1);
      const after=await page.locator('.architecture-photo').evaluate(element=>({top:element.getBoundingClientRect().top,bottom:element.getBoundingClientRect().bottom}));
      const available=before.height-end.stage.height,travel=before.top-after.top;
      result.samples.push({towerPan:{available,travel,stageHeight:end.stage.height,before,after}});
      assert.ok(available>end.stage.height*.75,'The tower image must have meaningful vertical content to explore.');
      assert.ok(travel>=available*.9&&travel<=available+3,`Tower pan covers ${travel}px of ${available}px.`);
      assert.ok(after.bottom>=end.stage.bottom-2,'Tower pan exposes an empty strip below the photograph.');
      await screenshot('about-pan-end');
    });
    await step('primary CTA and nested keyboard dialog focus',async()=>{
      await sample('about',.07,'old',0);
      const opener='#about .scene-action';
      await page.locator(opener).focus();
      await page.locator(opener).click();
      await dialogOpen(page,'enquiry-dialog');
      await containedFocus(page,'enquiry-dialog');
      await page.locator('#modal-form [name="firstName"]').focus();
      await page.keyboard.press('Tab');
      await focused(page,'#modal-form [name="lastName"]');
      const privacy='#modal-form [data-privacy]';
      await page.locator(privacy).focus();
      await page.keyboard.press('Enter');
      await dialogOpen(page,'privacy-dialog');
      await containedFocus(page,'privacy-dialog');
      await page.keyboard.press('Escape');
      await dialogOpen(page,'privacy-dialog',false);
      await modalState(page,['enquiry-dialog']);
      await focused(page,privacy);
      await page.keyboard.press('Escape');
      await dialogOpen(page,'enquiry-dialog',false);
      await modalState(page);
      await focused(page,opener);
    });
    await step('direct location navigation and interactive secondary map',async()=>{
      await navigate('location');
      const measurement=await scene(page,'location','.entry-title','.location-copy,.map-zoom');
      selected(measurement,1);foreground(measurement,'new');
      const opener='#location .map-zoom';
      await page.locator(opener).focus();
      await page.locator(opener).click();
      await dialogOpen(page,'zoom-dialog');
      await page.keyboard.press('Escape');
      await dialogOpen(page,'zoom-dialog',false);
      await modalState(page);
      await focused(page,opener);
    });
    await step('direct layouts navigation and keyboard residence details',async()=>{
      await navigate('layouts');
      const measurement=await scene(page,'layouts','.entry-title','.chapter-aside,.layout-cards');
      selected(measurement,1);foreground(measurement,'new');
      await seek(page,'layouts',.92);
      await page.waitForFunction(()=>{
        const images=[...document.querySelectorAll('#layouts .layout-card__plan img')];
        return images.length>0&&images.every(image=>image.complete&&image.naturalWidth>0);
      });
      await screenshot('layouts-steady');
      const opener='#layouts .layout-card--triplex .layout-card__plan';
      await page.locator(opener).focus();
      await page.keyboard.press('Enter');
      await dialogOpen(page,'unit-dialog');
      await containedFocus(page,'unit-dialog');
      await page.keyboard.press('Tab');
      await containedFocus(page,'unit-dialog');
      await page.keyboard.press('Escape');
      await dialogOpen(page,'unit-dialog',false);
      await modalState(page);
      await focused(page,opener);
    });
    await step('short desktop natural flow and desktop restoration preserve layouts',async()=>{
      await page.setViewportSize({width:1440,height:650});
      await settled(page);
      const natural=await naturalStates(page);assertNatural(natural);
      const active=await activeSection(page);
      assert.equal(active.id,'layouts','Short-window fallback lost the current chapter.');
      const secondary=await page.locator('#layouts .state-secondary').boundingBox();
      assert.ok(secondary&&secondary.y<650*.35&&secondary.y+secondary.height>650*.5,'Short-window fallback lost the selected layout scene.');
      result.samples.push({mode:'short-desktop',active,natural});
      await page.setViewportSize({width:1440,height:900});
      await settled(page);
      assert.equal(await page.locator('.chapter.is-story').count(),7);
      assert.equal((await activeSection(page)).id,'layouts','Restoring desktop lost the current chapter.');
      const restored=await scene(page,'layouts','.entry-title','.chapter-aside,.layout-cards');
      selected(restored,1);foreground(restored,'new');
      result.samples.push({mode:'restored-desktop',...restored});
    });
    await step('investment title leads the collage without a blank handoff',async()=>{
      await seek(page,'investment',.22);
      const frames=await page.evaluate(()=>new Promise(resolve=>{
        const chapter=document.getElementById('investment'),stage=chapter.querySelector('.chapter__stage');
        const start=chapter.getBoundingClientRect().top+scrollY,range=chapter.offsetHeight-stage.offsetHeight;
        const outgoing=[...chapter.querySelectorAll('.investment__details .chapter-aside,.investment-metrics')],title=chapter.querySelector('.investment__closing>h3');
        const opacity=element=>{let value=1;for(let node=element;node&&node!==chapter.parentElement;node=node.parentElement){const css=getComputedStyle(node);if(css.visibility==='hidden'||css.display==='none')return 0;value*=Number(css.opacity);}return value;};
        const samples=[];let first;
        function frame(now){
          first??=now;const fraction=Math.min(1,(now-first)/1100);
          scrollTo({top:start+range*(.22+.48*fraction),behavior:'instant'});
          samples.push({time:now-first,outgoing:Math.max(...outgoing.map(opacity)),incoming:opacity(title),top:title.getBoundingClientRect().top,view:chapter.dataset.view});
          if(fraction<1)requestAnimationFrame(frame);else resolve(samples);
        }
        requestAnimationFrame(frame);
      }));
      assert.ok(frames.length>=8,'The handoff must be observed over multiple rendered frames.');
      assert.ok(frames.every(frame=>frame.outgoing+frame.incoming>.001),'The investment handoff contains a completely blank frame.');
      assert.ok(frames.every(frame=>!(frame.outgoing>.05&&frame.incoming>.05)),'Outgoing copy overlaps the incoming central title.');
      const incoming=frames.filter(frame=>frame.incoming>.9);
      assert.ok(incoming.length>2,'The central title must appear before the photographs settle.');
      assert.ok(Math.max(...incoming.map(frame=>frame.top))-Math.min(...incoming.map(frame=>frame.top))<=1,'The central title must stay stationary.');
      result.samples.push({id:'investment-continuous-handoff',frames});
      await seek(page,'investment',.43);
      const sample=await scene(page,'investment','.chapter-aside,.investment-metrics','h3');
      foreground(sample,'new');selected(sample,1);
      result.samples.push({progress:.43,...sample});
      await screenshot('investment-title-before-photographs');
    });
    await step('investment collage visual snapshot',async()=>{
      const scroll=await seek(page,'investment',.92);
      result.samples.push({id:'investment',progress:.92,...scroll});
      await page.waitForFunction(()=>{
        const images=[...document.querySelectorAll('#investment .investment-collage img')];
        return images.length>0&&images.every(image=>image.complete&&image.naturalWidth>0);
      });
      const completed=await scene(page,'investment','.chapter-aside,.investment-metrics','h3');
      result.samples.push({progress:.92,...completed});
      await screenshot('investment-collage');
      result.samples.push({...await scene(page,'investment','.chapter-aside,.investment-metrics','h3'),capturePhase:'after'});
      foreground(completed,'new');selected(completed,1);
    });
    await step('active RAF and long-task scroll diagnostics',async()=>{
      result.performance=await diagnosticScroll(page);
    });
    await step('contact navigation and live reduced-motion change preserve contact',async()=>{
      await navigate('contact');
      const before=await activeSection(page);
      await page.emulateMedia({reducedMotion:'reduce'});
      await settled(page);
      assert.equal(await page.locator('.chapter.is-story').count(),0,'Reduced motion left scroll timelines enabled.');
      const after=await activeSection(page);
      assert.equal(after.id,'contact','Reduced-motion change jumped away from contact.');
      assert.equal(after.highlighted,'#contact');
      assert.ok(after.top<900*.3&&after.bottom>900*.3,'Contact is no longer in the reading viewport.');
      await page.locator('#contact-form [name="firstName"]').focus();
      await focused(page,'#contact-form [name="firstName"]');
      result.samples.push({mode:'reduced-on-contact',before,after});
    });
    await context.close();
    await step('touch 390x844 natural flow, overflow and accessible content',async()=>{
      await newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
      await preparePage(page,base,false);
      assert.equal(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches),true,'The mobile check must use a touch context.');
      const natural=await naturalStates(page);assertNatural(natural);
      const measurement=await page.evaluate(()=>({
        viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
        inert:[...document.querySelectorAll('main [inert]')].filter(element=>element.inert).map(element=>element.className),
        hiddenFocusable:[...document.querySelectorAll('main a,main button,main input,main select,main textarea,[tabindex]')].filter(element=>{
          const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
          return element.tabIndex>=0&&!element.disabled&&rect.width>0&&rect.height>0&&style.visibility==='visible'&&element.closest('main [aria-hidden="true"]');
        }).map(element=>element.outerHTML.slice(0,200))
      }));
      assert.ok(measurement.documentWidth<=390+1,`Mobile document overflows by ${measurement.documentWidth-390}px.`);
      assert.ok(measurement.bodyWidth<=390+1,`Mobile body overflows by ${measurement.bodyWidth-390}px.`);
      assert.deepEqual(measurement.inert,[],'Mobile content retained inert nodes.');
      assert.deepEqual(measurement.hiddenFocusable,[],'Mobile accessible content contains hidden focusable controls.');
      result.samples.push({mode:'mobile',measurement,natural});
      await imageReady(page,'.hero__photo');
      await screenshot('mobile-home');
    });
    await step('mobile navigation dialog keyboard focus and contact link',async()=>{
      await page.locator('.menu-toggle').focus();
      await page.keyboard.press('Enter');
      await dialogOpen(page,'menu-dialog');
      await containedFocus(page,'menu-dialog');
      await page.keyboard.press('Tab');
      await containedFocus(page,'menu-dialog');
      await page.keyboard.press('Escape');
      await dialogOpen(page,'menu-dialog',false);
      await modalState(page);
      await focused(page,'.menu-toggle');
      await page.locator('.menu-toggle').tap();
      await dialogOpen(page,'menu-dialog');
      await page.locator('#menu-dialog a[href="#contact"]').tap();
      await dialogOpen(page,'menu-dialog',false);
      await modalState(page);
      await settled(page);
      assert.equal((await activeSection(page)).id,'contact','Mobile navigation did not reach contact.');
    });
    await step('no browser errors, failed original assets or enquiry attempts',async()=>{
      assert.deepEqual(result.pageErrors,[]);
      assert.deepEqual(result.assetFailures,[]);
      assert.deepEqual(result.apiRequests,[],'No part of this test should attempt an enquiry. All attempts were blocked.');
    });
    result.ok=true;
    delete result.stage;
  }catch(error){
    result.error=error.stack||String(error);
    if(page&&!page.isClosed()&&!report.timedOut){try{await screenshot('failure');}catch{}}
  }finally{
    if(ownedBrowser)await Promise.race([ownedBrowser.close().catch(()=>{}),delay(2000)]);
    if(browser===ownedBrowser)browser=undefined;
    result.finishedAt=new Date().toISOString();
    console.log(`${name}: ${result.ok?'PASS':'FAIL'} (${result.checks.length} checks)${result.stage?` at ${result.stage}`:''}`);
  }
}

try{
  const require=createRequire(import.meta.url);
  const {chromium,webkit}=process.env.PLAYWRIGHT_MODULE?require(process.env.PLAYWRIGHT_MODULE):createRequire(process.env.PLAYWRIGHT_PACKAGE||'/home/sergey/.local/share/imon-toolkit/node/node_modules/playwright/package.json')('playwright');
  const externalBase=process.env.MOTION_QA_BASE_URL;
  const port=externalBase?0:await freePort(),base=externalBase||`http://127.0.0.1:${port}`;
  report.base=base;
  server=externalBase?undefined:spawn(process.execPath,[path.join(root,'node_modules/astro/bin/astro.mjs'),'dev','--ignore-lock','--host','127.0.0.1','--port',String(port)],{
    cwd:root,env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe'],detached:true
  });
  const capture=chunk=>{serverOutput=(serverOutput+chunk.toString()).slice(-12000);};
  server?.stdout.on('data',capture);server?.stderr.on('data',capture);
  server?.on('error',error=>{serverError=error;});
  await ready(base);
  for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
    if(report.timedOut)break;
    await runEngine(name,type,base);
  }
  report.ok=!report.timedOut&&report.engines.length===2&&report.engines.every(engine=>engine.ok);
}catch(error){
  report.error=error.stack||String(error);
}finally{
  clearTimeout(deadline);
  await cleanup();
  report.elapsedMs=Date.now()-startedAt;
  if(!report.ok)report.serverLog=serverOutput;
  await writeFile(path.join(artifacts,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`Motion QA ${report.ok?'PASS':'FAIL'} in ${(report.elapsedMs/1000).toFixed(1)}s. Report: ${path.join(artifacts,'report.json')}`);
  process.exitCode=report.ok?0:1;
}
