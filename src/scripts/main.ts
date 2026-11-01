import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

type Unit={id:string;name:string;plan:string;bedrooms:number;levels:string};
type GalleryItem={image:string;alt:string};
const config:{units:Unit[];gallery:GalleryItem[]}=JSON.parse(document.querySelector('#six-data')?.textContent||'{}');
const $=<T extends Element=HTMLElement>(selector:string,root:ParentNode=document)=>root.querySelector<T>(selector)!;
const $$=<T extends Element=HTMLElement>(selector:string,root:ParentNode=document)=>[...root.querySelectorAll<T>(selector)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const desktop=matchMedia('(min-width:1101px)');
const priorFocus=new WeakMap<HTMLDialogElement,HTMLElement>();
function openDialog(id:string){const dialog=document.getElementById(id) as HTMLDialogElement|null;if(!dialog||dialog.open)return;priorFocus.set(dialog,document.activeElement as HTMLElement);dialog.showModal();document.body.classList.add('modal-open');if(id==='menu-dialog')$('.menu-toggle').setAttribute('aria-expanded','true');}
$$<HTMLDialogElement>('dialog').forEach(dialog=>{
 dialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('modal-open');if(dialog.id==='menu-dialog')$('.menu-toggle').setAttribute('aria-expanded','false');const target=priorFocus.get(dialog);if(target?.isConnected&&!target.closest('dialog:not([open])'))target.focus({preventScroll:true});if(dialog.id==='unit-dialog'){const url=new URL(location.href);url.searchParams.delete('unit');history.replaceState({},'',url);}});
 dialog.addEventListener('click',event=>{if(!dialog.classList.contains('small-sheet')||event.target!==dialog)return;const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();});
});
function showUnit(id:string){const unit=config.units.find(u=>u.id===id);if(!unit)return;$$('[data-unit-panel]').forEach(p=>p.hidden=p.dataset.unitPanel!==id);$('#unit-title').textContent=unit.name;$$('#unit-dialog [data-unit]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.unit===id)));openDialog('unit-dialog');$('#unit-dialog').scrollTo({top:0,behavior:'instant'});const url=new URL(location.href);url.searchParams.set('unit',id);history.replaceState({},'',url);}

let galleryIndex=0;
function showGallery(index:number){galleryIndex=(index+config.gallery.length)%config.gallery.length;const current=config.gallery[galleryIndex],next=config.gallery[(galleryIndex+1)%config.gallery.length];const image=$<HTMLImageElement>('[data-gallery-image]'),preview=$<HTMLImageElement>('[data-gallery-preview]');image.src=current.image;image.alt=current.alt;preview.src=next.image;preview.alt=next.alt;$('[data-gallery-current]').textContent=String(galleryIndex+1);}
$('.gallery').addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();showGallery(galleryIndex+(event.key==='ArrowRight'?1:-1));}});
let swipe:{x:number;y:number}|null=null,suppressGalleryClick=false;
$('.gallery__main').addEventListener('pointerdown',event=>{swipe={x:event.clientX,y:event.clientY};});
$('.gallery__main').addEventListener('pointerup',event=>{if(!swipe)return;const dx=event.clientX-swipe.x,dy=event.clientY-swipe.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){showGallery(galleryIndex+(dx<0?1:-1));suppressGalleryClick=true;event.preventDefault();}swipe=null;});
$('.gallery__main').addEventListener('pointercancel',()=>{swipe=null;});
const cardRail=$('.layout-cards');cardRail.tabIndex=0;
function layoutIndex(){const cards=$$<HTMLElement>('.layout-card',cardRail);return Math.abs(cards[0].getBoundingClientRect().left-24)<Math.abs(cards[1].getBoundingClientRect().left-24)?0:1;}
function scrollLayout(delta:number){const cards=$$<HTMLElement>('.layout-card',cardRail),index=Math.max(0,Math.min(cards.length-1,layoutIndex()+delta));cardRail.scrollTo({left:cards[index].offsetLeft-24,behavior:reduced.matches?'instant':'smooth'});}
cardRail.addEventListener('scroll',()=>{$('[data-layout-count]').textContent=`${layoutIndex()+1} / 2`;},{passive:true});
cardRail.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();scrollLayout(event.key==='ArrowRight'?1:-1);}});

const zoomStage=$('.zoom-stage'),zoomCanvas=$('.zoom-canvas');let zoom=1,panX=0,panY=0;
const pointers=new Map<number,{x:number;y:number}>();let drag={x:0,y:0,panX:0,panY:0},pinch={distance:0,zoom:1};
function updateZoom(){zoom=Math.max(1,Math.min(5,zoom));const x=zoomStage.clientWidth*(zoom-1)/2,y=zoomStage.clientHeight*(zoom-1)/2;panX=Math.max(-x,Math.min(x,panX));panY=Math.max(-y,Math.min(y,panY));zoomCanvas.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;$('[data-zoom-reset]').textContent=zoom===1?'Fit':`${Math.round(zoom*100)}%`;}
function resetZoom(){zoom=1;panX=0;panY=0;pointers.clear();updateZoom();}
function openZoom(src:string,alt:string,title:string,plan=false){const image=$<HTMLImageElement>('[data-zoom-image]');image.src=src;image.alt=alt;$('#zoom-title').textContent=title;$('#zoom-dialog').classList.toggle('is-plan',plan);openDialog('zoom-dialog');resetZoom();}
zoomStage.addEventListener('pointerdown',event=>{zoomStage.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});drag={x:event.clientX,y:event.clientY,panX,panY};if(pointers.size===2){const[a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};}zoomStage.classList.add('is-dragging');});
zoomStage.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pointers.size===2){const[a,b]=[...pointers.values()];zoom=pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance);}else{panX=drag.panX+event.clientX-drag.x;panY=drag.panY+event.clientY-drag.y;}updateZoom();});
const endPointer=(event:PointerEvent)=>{pointers.delete(event.pointerId);if(!pointers.size)zoomStage.classList.remove('is-dragging');};zoomStage.addEventListener('pointerup',endPointer);zoomStage.addEventListener('pointercancel',endPointer);
zoomStage.addEventListener('wheel',event=>{event.preventDefault();zoom+=event.deltaY<0?.15:-.15;updateZoom();},{passive:false});
zoomStage.addEventListener('keydown',event=>{if(!['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();if(event.key==='+'||event.key==='=')zoom+=.5;else if(event.key==='-')zoom-=.5;else if(event.key==='0'){resetZoom();return;}else if(event.key==='ArrowLeft')panX-=40;else if(event.key==='ArrowRight')panX+=40;else if(event.key==='ArrowUp')panY-=40;else if(event.key==='ArrowDown')panY+=40;updateZoom();});

// Both enquiry forms share the real endpoint and retain the same idempotency key on a retry.
type FormState={startedAt:number;submissionId:string;context:string;pending:boolean;touched:boolean;fingerprint:string;completed:boolean};
const formStates=new WeakMap<HTMLFormElement,FormState>();
function newState(context:string):FormState{return{startedAt:Date.now(),submissionId:crypto.randomUUID(),context,pending:false,touched:false,fingerprint:'',completed:false};}
function clearErrors(form:HTMLFormElement){$$('[data-error]',form).forEach(e=>e.textContent='');$$('[aria-invalid]',form).forEach(e=>e.removeAttribute('aria-invalid'));$('[data-form-status]',form).textContent='';}
function fieldError(form:HTMLFormElement,name:string,message:string){if(name==='name')name='firstName';const input=form.elements.namedItem(name) as HTMLElement|null;input?.setAttribute('aria-invalid','true');const label=form.querySelector(`[data-error="${name}"]`);if(label)label.textContent=message;}
function openEnquiry(context:string){
 const form=$<HTMLFormElement>('#modal-form'),previous=formStates.get(form),body=form.closest<HTMLElement>('.enquiry-body')!;
 if(previous?.pending){openDialog('enquiry-dialog');return;}
 let state=previous;
 if(!state||state.completed){
  form.reset();$('.other-country',form).hidden=true;$<HTMLInputElement>('[name=otherCountry]',form).required=false;
  state=newState(context);formStates.set(form,state);
 }
 state.context=context;
 if(Date.now()-state.startedAt>7*24*60*60*1000)state.startedAt=Date.now();
 $('[data-interest]',body).textContent=context;$('.enquiry-heading',body).hidden=false;$('.enquiry-success',body).hidden=true;form.hidden=false;clearErrors(form);$('[data-submit-label]',form).textContent=state.fingerprint?'Try again':'Register';openDialog('enquiry-dialog');$('#enquiry-dialog').scrollTo({top:0,behavior:'instant'});
}
$$<HTMLFormElement>('[data-enquiry-form]').forEach(form=>{
 formStates.set(form,newState('Six Senses Residences Dubai Marina'));
 form.addEventListener('focusin',()=>{const s=formStates.get(form)!;if(!s.touched){s.startedAt=Date.now();s.touched=true;}},{once:false});
 form.addEventListener('input',event=>{const input=event.target as HTMLInputElement;if(!input.name)return;input.removeAttribute('aria-invalid');const e=form.querySelector(`[data-error="${input.name}"]`);if(e)e.textContent='';});
 $<HTMLSelectElement>('[name=country]',form).addEventListener('change',event=>{const value=(event.target as HTMLSelectElement).value;$('.other-country',form).hidden=value!=='Other';$<HTMLInputElement>('[name=otherCountry]',form).required=value==='Other';});
 form.addEventListener('submit',async event=>{
  event.preventDefault();const state=formStates.get(form)!;if(state.pending||state.completed)return;clearErrors(form);const data=new FormData(form);
  const first=String(data.get('firstName')||'').trim(),last=String(data.get('lastName')||'').trim(),email=String(data.get('email')||'').trim().toLowerCase(),phone=String(data.get('phone')||'').trim(),country=String(data.get('country')||''),otherCountry=String(data.get('otherCountry')||'').trim();let valid=true;
  if(first.length<2){fieldError(form,'firstName','Please enter your first name.');valid=false;}if(last.length<1){fieldError(form,'lastName','Please enter your last name.');valid=false;}
  if(`${first} ${last}`.trim().length>100){fieldError(form,'firstName','Please keep your full name within 100 characters.');valid=false;}
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){fieldError(form,'email','Enter a valid email address.');valid=false;}
  if(!/^[+()\d\s.\-]+$/.test(phone)||phone.replace(/\D/g,'').length<7||phone.replace(/\D/g,'').length>15||phone.length>30){fieldError(form,'phone','Enter a valid phone number with country code.');valid=false;}
  if(!country){fieldError(form,'country','Please select your country.');valid=false;}if(country==='Other'&&otherCountry.length<2){fieldError(form,'otherCountry','Please enter your country.');valid=false;}
  if(data.get('consent')!=='on'){fieldError(form,'consent','Please agree before sending your enquiry.');valid=false;}
  if(!valid){$<HTMLInputElement>('[aria-invalid=true]',form)?.focus();return;}
  const message=`Country: ${country==='Other'?otherCountry:country}${data.get('message')?'\n'+String(data.get('message')).trim():''}`;
  const values={project:'six-senses',context:state.context,name:`${first} ${last}`.trim(),email,phone,consent:true,website:String(data.get('website')||''),message};
  const fingerprint=JSON.stringify(values);
  if(state.fingerprint&&state.fingerprint!==fingerprint)state.submissionId=crypto.randomUUID();
  state.fingerprint=fingerprint;
  const payload={...values,startedAt:state.startedAt,submissionId:state.submissionId};
  state.pending=true;form.setAttribute('aria-busy','true');
  const controls=$$<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|HTMLButtonElement>('input,select,textarea,button',form).map(element=>({element,disabled:element.disabled}));
  controls.forEach(({element})=>element.disabled=true);
  $('[data-submit-label]',form).textContent='Sending...';$('[data-form-status]',form).textContent='Sending your enquiry…';
  const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),20000);
  try{const response=await fetch('/api/enquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});const result=await response.json().catch(()=>null);if(!response.ok||result?.ok!==true||typeof result?.id!=='string'||!result.id){if(result?.fields&&typeof result.fields==='object')for(const[k,v]of Object.entries(result.fields))fieldError(form,k,String(v));throw new Error(typeof result?.error==='string'?result.error:'Your enquiry could not be sent. Please try again.');}
   state.completed=true;const body=form.closest<HTMLElement>('.enquiry-body')!;form.hidden=true;$('.enquiry-heading',body).hidden=true;$('[data-success-interest]',body).textContent=state.context;const success=$('.enquiry-success',body);success.hidden=false;success.focus();success.scrollIntoView({block:'center',behavior:reduced.matches?'instant':'smooth'});
  }catch(error){$('[data-form-status]',form).textContent=error instanceof Error&&error.name==='AbortError'?'The connection timed out. Your details are still here; please try again.':error instanceof Error?error.message:'Your enquiry could not be sent. Please try again.';$('[data-submit-label]',form).textContent='Try again';}
  finally{clearTimeout(timeout);state.pending=false;form.removeAttribute('aria-busy');controls.forEach(({element,disabled})=>element.disabled=disabled);}
 });
});

// Scroll storytelling keeps the alternative Figma scenes inside their eight chapters.
const header=$('.site-header');let headerPending=false;
gsap.registerPlugin(ScrollTrigger);
const chapters=$$<HTMLElement>('[data-story]');
function setView(chapter:HTMLElement,view:number){chapter.dataset.view=String(view);$$<HTMLButtonElement>('[data-story-switch]',chapter).forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.storySwitch)===view)));if(desktop.matches){$('.state-primary',chapter).inert=view===1;$('.state-secondary',chapter).inert=view===0;}else{$('.state-primary',chapter).inert=false;$('.state-secondary',chapter).inert=false;}}
chapters.forEach(chapter=>setView(chapter,Number(chapter.dataset.baseView)||0));
const stories=new Map<HTMLElement,ScrollTrigger>();
const media=gsap.matchMedia();
media.add('(min-width:1101px) and (prefers-reduced-motion:no-preference)',()=>{
 chapters.forEach(chapter=>{
  chapter.classList.add('is-story');chapter.style.height=`${Number(chapter.dataset.duration)*innerHeight}px`;const primary=$('.state-primary',chapter),secondary=$('.state-secondary',chapter);
  gsap.set(primary,{autoAlpha:1,y:0});gsap.set(secondary,{autoAlpha:0,y:48});setView(chapter,0);
  const timeline=gsap.timeline({scrollTrigger:{trigger:chapter,start:'top top',end:'bottom bottom',scrub:.65,invalidateOnRefresh:true,onRefresh:()=>{chapter.style.height=`${Number(chapter.dataset.duration)*innerHeight}px`;},onUpdate:self=>{const view=self.progress>.42?1:0;setView(chapter,view);primary.style.pointerEvents=view===0?'auto':'none';secondary.style.pointerEvents=view===1?'auto':'none';scheduleHeader();}}});
  timeline.to({}, {duration:.2}).to(primary,{autoAlpha:0,y:-35,duration:.28,ease:'none'},.2).to(secondary,{autoAlpha:1,y:0,duration:.28,ease:'none'},.2).to({}, {duration:.52},.48);
  if(chapter.id==='home')timeline.fromTo('.hero__photo',{scale:1},{scale:1.09,duration:.48,ease:'none'},0);
  if(chapter.id==='about')timeline.fromTo('.architecture-photo',{yPercent:0},{yPercent:-6,duration:.52,ease:'none'},.48);
  if(chapter.id==='investment')timeline.fromTo('.investment-collage',{y:25},{y:-25,duration:.52,ease:'none'},.48);
  if(chapter.id==='infrastructure')timeline.fromTo('.wellbeing__closing>div',{y:30},{y:0,duration:.52,ease:'none'},.48);
  if(timeline.scrollTrigger)stories.set(chapter,timeline.scrollTrigger);
 });
 return()=>{chapters.forEach(chapter=>{chapter.classList.remove('is-story');chapter.style.height='';setView(chapter,Number(chapter.dataset.baseView)||0);$('.state-primary',chapter).style.pointerEvents='';$('.state-secondary',chapter).style.pointerEvents='';});stories.clear();};
});
media.add('(max-width:1100px)',()=>{chapters.forEach(chapter=>{$('.state-primary',chapter).inert=false;$('.state-secondary',chapter).inert=false;});});
media.add('(max-width:1100px) and (prefers-reduced-motion:no-preference)',()=>{$$('.wellbeing-cards article,.layout-card,.investment-metrics article,.contact__panel').forEach(element=>gsap.from(element,{y:24,opacity:0,duration:.8,ease:'power2.out',scrollTrigger:{trigger:element,start:'top 96%',once:true}}));});
function chooseStory(chapter:HTMLElement,view:number){const trigger=stories.get(chapter);if(trigger){window.scrollTo({top:trigger.start+(trigger.end-trigger.start)*(view===0?.08:.75),behavior:'smooth'});}else{setView(chapter,view);scheduleHeader();}}
function navigateTo(id:string){const target=document.getElementById(id);if(!target)return;const trigger=stories.get(target);const desired=['location','layouts','interiors'].includes(id)?1:0;if(trigger){window.scrollTo({top:trigger.start+(trigger.end-trigger.start)*(desired?.72:.04),behavior:reduced.matches?'instant':'smooth'});}else target.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});}
function updateHeader(){headerPending=false;const y=window.scrollY;header.classList.toggle('is-scrolled',y>60);const hero=$('#home'),heroProgress=stories.get(hero)?.progress||0;header.classList.toggle('is-home',desktop.matches&&hero.getBoundingClientRect().bottom>innerHeight*.5&&heroProgress<.2&&y<innerHeight*.5);let active='home';for(const element of $$<HTMLElement>('main>section')){const r=element.getBoundingClientRect();if(r.top<=innerHeight*.3&&r.bottom>innerHeight*.3)active=element.id;}
 let light=false;for(const element of $$('.layouts__details,.interiors__details')){const r=element.getBoundingClientRect();const chapter=element.closest<HTMLElement>('.chapter')!;if(r.top<=95&&r.bottom>95&&(!desktop.matches||chapter.dataset.view==='1'))light=true;}
 header.classList.toggle('is-light',light);$$<HTMLAnchorElement>('.desktop-nav a').forEach(a=>{if(a.hash==='#'+active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});const available=document.documentElement.scrollHeight-innerHeight;$('.reading-progress').style.transform=`scaleX(${available>0?Math.max(0,Math.min(1,y/available)):0})`;}
function scheduleHeader(){if(!headerPending){headerPending=true;requestAnimationFrame(updateHeader);}}
window.addEventListener('scroll',scheduleHeader,{passive:true});window.addEventListener('resize',scheduleHeader,{passive:true});updateHeader();

document.addEventListener('click',event=>{const target=(event.target as HTMLElement).closest<HTMLElement>('button,a');if(!target)return;
 if(target.hasAttribute('data-close'))target.closest<HTMLDialogElement>('dialog')?.close();
 else if(target.dataset.modal)openDialog(target.dataset.modal);
 else if(target.hasAttribute('data-enquire'))openEnquiry(target.dataset.enquire||'Six Senses Residences Dubai Marina');
 else if(target.hasAttribute('data-privacy'))openDialog('privacy-dialog');else if(target.hasAttribute('data-terms'))openDialog('terms-dialog');
 else if(target.dataset.unit)showUnit(target.dataset.unit);
 else if(target.dataset.planZoom){const unit=config.units.find(u=>u.id===target.dataset.planZoom);if(unit)openZoom(unit.plan,`${unit.name} floor plans`,unit.name,true);}
 else if(target.hasAttribute('data-gallery-next'))showGallery(galleryIndex+1);else if(target.hasAttribute('data-gallery-prev'))showGallery(galleryIndex-1);
 else if(target.hasAttribute('data-gallery-zoom')){if(suppressGalleryClick){suppressGalleryClick=false;return;}const item=config.gallery[galleryIndex];openZoom(item.image,item.alt,'Six Senses interiors');}
 else if(target.hasAttribute('data-photo'))openZoom(target.dataset.photo!,target.dataset.photoTitle||'Six Senses',target.dataset.photoTitle||'Six Senses');
 else if(target.hasAttribute('data-location-zoom'))openZoom($<HTMLImageElement>('.location-map img').src,'Six Senses Dubai Marina location map','Dubai Marina');
 else if(target.hasAttribute('data-zoom-in')){zoom+=.5;updateZoom();}else if(target.hasAttribute('data-zoom-out')){zoom-=.5;updateZoom();}else if(target.hasAttribute('data-zoom-reset'))resetZoom();
 else if(target.hasAttribute('data-layout-next'))scrollLayout(1);else if(target.hasAttribute('data-layout-prev'))scrollLayout(-1);
 else if(target.hasAttribute('data-story-switch'))chooseStory(target.closest<HTMLElement>('.chapter')!,Number(target.dataset.storySwitch));
 if(target instanceof HTMLAnchorElement&&target.hash&&target.origin===location.origin&&target.pathname===location.pathname){const id=target.hash.slice(1);if(document.getElementById(id)){event.preventDefault();if(target.closest('#menu-dialog'))$<HTMLDialogElement>('#menu-dialog').close();navigateTo(id);history.replaceState({},'',target.hash);}}
});

// The intro is brief, optional and never prevents the document from loading.
try{if(!reduced.matches&&!sessionStorage.getItem('six-intro-seen')){sessionStorage.setItem('six-intro-seen','1');const intro=$('.intro');intro.classList.add('is-active');gsap.timeline({onComplete:()=>intro.classList.remove('is-active')}).fromTo('.intro .six-logo',{opacity:0,scale:1.1},{opacity:1,scale:1.25,duration:.35}).to('.intro__line',{scaleX:1,duration:.35},.15).to(intro,{opacity:0,duration:.35},.65);}}catch{/* Storage restrictions simply skip the optional intro. */}
window.addEventListener('load',()=>ScrollTrigger.refresh(),{once:true});document.fonts.ready.then(()=>ScrollTrigger.refresh());
const unitParam=new URLSearchParams(location.search).get('unit');if(unitParam)showUnit(unitParam);
