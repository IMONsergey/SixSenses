import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {initializeMediaInteractions} from './media-interactions';

type Unit={id:string;name:string;plan:string;bedrooms:number;levels:string};
type GalleryItem={image:string;alt:string};
const config:{units:Unit[];gallery:GalleryItem[]}=JSON.parse(document.querySelector('#six-data')?.textContent||'{}');
const $=<T extends Element=HTMLElement>(selector:string,root:ParentNode=document)=>root.querySelector<T>(selector)!;
const $$=<T extends Element=HTMLElement>(selector:string,root:ParentNode=document)=>[...root.querySelectorAll<T>(selector)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const desktop=matchMedia('(min-width:1101px) and (min-height:760px) and (pointer:fine)');
const priorFocus=new WeakMap<HTMLDialogElement,HTMLElement>();
const dialogStack:HTMLDialogElement[]=[];
let dialogClickOrigin:HTMLElement|undefined;
function openDialog(id:string){const dialog=document.getElementById(id) as HTMLDialogElement|null;if(!dialog||dialog.open)return;priorFocus.set(dialog,dialogClickOrigin||document.activeElement as HTMLElement);dialog.showModal();dialogStack.push(dialog);document.documentElement.classList.add('modal-open');document.body.classList.add('modal-open');if(id==='menu-dialog')$('.menu-toggle').setAttribute('aria-expanded','true');}
$$<HTMLDialogElement>('dialog').forEach(dialog=>{
 dialog.addEventListener('close',()=>{const index=dialogStack.indexOf(dialog);if(index!==-1)dialogStack.splice(index,1);if(!document.querySelector('dialog[open]')){document.body.classList.remove('modal-open');document.documentElement.classList.remove('modal-open');}if(dialog.id==='menu-dialog')$('.menu-toggle').setAttribute('aria-expanded','false');const target=priorFocus.get(dialog),remaining=dialogStack.filter(item=>item.open).at(-1);if(target?.isConnected&&target.getClientRects().length&&!target.closest('dialog:not([open]),[inert]')&&(!remaining||target.closest('dialog')===remaining))target.focus({preventScroll:true});if(dialog.id==='unit-dialog'){const url=new URL(location.href);url.searchParams.delete('unit');history.replaceState({},'',url);}});
 dialog.addEventListener('click',event=>{if(!dialog.classList.contains('small-sheet')||event.target!==dialog)return;const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();});
});
function showUnit(id:string){const unit=config.units.find(u=>u.id===id);if(!unit)return;$$('[data-unit-panel]').forEach(p=>p.hidden=p.dataset.unitPanel!==id);$('#unit-title').textContent=unit.name;$$('#unit-dialog [data-unit]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.unit===id)));openDialog('unit-dialog');$('#unit-dialog').scrollTo({top:0,behavior:'instant'});const url=new URL(location.href);url.searchParams.set('unit',id);history.replaceState({},'',url);}

const {stepGallery,openGallery,openZoom,changeZoom,resetZoom,scrollLayout}=initializeMediaInteractions({...config,openDialog},reduced);

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

// Scroll scenes use an opaque image handoff, followed by their foreground.
// The Dprofile sequence reveals the invitation after the new architecture is in place.
const header=$('.site-header');
let headerPending=false;
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ignoreMobileResize:true});
const chapters=$$<HTMLElement>('[data-story]');
const chapterParts=new Map(chapters.map(chapter=>[chapter,{
 primary:$('.state-primary',chapter),secondary:$('.state-secondary',chapter),
 buttons:$$<HTMLButtonElement>('[data-story-switch]',chapter)
}]));
const sections=$$<HTMLElement>('main>section');
const navLinks=$$<HTMLAnchorElement>('.desktop-nav a');
const readingProgress=$('.reading-progress');
let currentChapter='home',currentStoryView=0,modeRestoreFrame=0,motionInitialized=false;
function setView(chapter:HTMLElement,view:number){
 const parts=chapterParts.get(chapter)!;
 if(chapter.dataset.view!==String(view))chapter.dataset.view=String(view);
 parts.buttons.forEach(button=>{const value=String(Number(button.dataset.storySwitch)===view);if(button.getAttribute('aria-pressed')!==value)button.setAttribute('aria-pressed',value);});
 for(const [index,state] of [parts.primary,parts.secondary].entries()){
  const inactive=desktop.matches&&index!==view;
  if(state.inert!==inactive)state.inert=inactive;
  if(inactive){if(state.getAttribute('aria-hidden')!=='true')state.setAttribute('aria-hidden','true');}else if(state.hasAttribute('aria-hidden'))state.removeAttribute('aria-hidden');
 }
}
chapters.forEach(chapter=>setView(chapter,Number(chapter.dataset.baseView)||0));
const stories=new Map<HTMLElement,ScrollTrigger>();
const media=gsap.matchMedia();
const foregrounds:Record<string,[string,string]>={
 home:['h1,.hero-metrics','.invitation-card'],
 about:['.about__heading,.about__copy,.scene-action','h3,.architecture-copy'],
 location:['.entry-title','.location-copy,.map-zoom'],
 layouts:['.entry-title','.chapter-aside,.layout-cards,.layout-controls'],
 interiors:['.entry-title','.chapter-aside,.gallery'],
 infrastructure:['.chapter-aside,.wellbeing-cards','h3'],
 investment:['.chapter-aside,.investment-metrics','h3']
};
media.add('(min-width:1101px) and (min-height:760px) and (pointer:fine) and (prefers-reduced-motion:no-preference)',()=>{
 const restoreTarget=sections.find(section=>section.id===currentChapter);
 const restoreView=currentStoryView,restoreScroll=motionInitialized&&scrollY>0;
 cancelAnimationFrame(modeRestoreFrame);
 chapters.forEach(chapter=>{
  const {primary,secondary}=chapterParts.get(chapter)!;
  const [outSelector,inSelector]=foregrounds[chapter.id];
  const outgoing=$$(outSelector,primary),incoming=$$(inSelector,secondary);
  chapter.style.setProperty('--story-duration',chapter.dataset.duration||'2.4');
  chapter.classList.add('is-story');
  gsap.set(primary,{autoAlpha:1});
  gsap.set(secondary,{autoAlpha:1,yPercent:100});
  gsap.set(incoming,{autoAlpha:0,y:28});
  setView(chapter,0);
  const timeline=gsap.timeline({
   defaults:{ease:'none'},
   onUpdate:()=>{setView(chapter,timeline.progress()>=.54?1:0);scheduleHeader();},
   scrollTrigger:{trigger:chapter,start:'top top',end:'bottom bottom',scrub:.35,invalidateOnRefresh:true}
  });
  timeline.to({}, {duration:1},0)
   .to(outgoing,{autoAlpha:0,y:-24,duration:.13,stagger:.015},.16)
   .to(secondary,{yPercent:0,duration:.28},.28)
   .set(primary,{autoAlpha:0},.56)
   .to(incoming,{autoAlpha:1,y:0,duration:chapter.id==='about'?.10:.17,stagger:chapter.id==='about'?.02:.025},.59);
  if(chapter.id==='home'){
   timeline.to('.hero__photo',{scale:1.045,duration:.55},0);
   timeline.fromTo('.invitation-card',{clipPath:'inset(100% 0 0 0)'},{clipPath:'inset(0% 0 0 0)',duration:.18},.56);
   timeline.fromTo('.invitation-card h2,.invitation-card__brand',{opacity:0,y:14},{opacity:1,y:0,duration:.12,stagger:.045},.68);
  }
  if(chapter.id==='about'){
   const photograph=$('.architecture-photo',secondary);
   timeline.fromTo('.about__architecture>h3>span',{autoAlpha:0,y:12},{autoAlpha:1,y:0,duration:.08,stagger:.025},.60);
   timeline.to(incoming,{autoAlpha:0,y:-18,duration:.10},.80);
   timeline.to(photograph,{y:()=>-Math.max(0,photograph.offsetHeight-$('.chapter__stage',chapter).offsetHeight),duration:.20},.80);
  }
  if(chapter.id==='investment'){
   const stage=$('.chapter__stage',chapter);
   const photographs=$$<HTMLElement>('.investment-collage>div',secondary);
   // The original showcase assembles three columns around a stationary title.
   // Each photograph starts just outside the stage and settles into its authored crop.
   photographs.forEach((photograph,index)=>{
    const fromTop=['collage__marina','collage__golf','collage__living'].some(name=>photograph.classList.contains(name));
    timeline.fromTo(photograph,{y:()=>fromTop?-(photograph.offsetTop+photograph.offsetHeight+24):stage.offsetHeight-photograph.offsetTop+24},
     {y:0,duration:.25,ease:'power2.out'},.56+(index%3)*.035);
   });
  }
  if(chapter.id==='layouts')timeline.fromTo($$('.layout-card',secondary),{y:90},{y:0,duration:.24,stagger:.045,ease:'power2.out'},.61);
  if(chapter.id==='infrastructure')timeline.fromTo('.wellbeing__closing>div',{y:16},{y:0,duration:.4},.56);
  if(timeline.scrollTrigger)stories.set(chapter,timeline.scrollTrigger);
 });
 if(restoreScroll&&restoreTarget)modeRestoreFrame=requestAnimationFrame(()=>{
  ScrollTrigger.refresh();
  const trigger=stories.get(restoreTarget);
  if(trigger)window.scrollTo({top:storyPosition(trigger,restoreTarget.id,restoreView),behavior:'instant'});
  else restoreTarget.scrollIntoView({block:'start',behavior:'instant'});
  scheduleHeader();
 });
 return()=>{
  cancelAnimationFrame(modeRestoreFrame);
  const active=sections.find(section=>section.id===currentChapter);
  const view=currentStoryView;
  chapters.forEach(chapter=>{chapter.classList.remove('is-story');chapter.style.removeProperty('--story-duration');setView(chapter,chapter===active?view:Number(chapter.dataset.baseView)||0);});
  stories.clear();
  if(active&&scrollY>0)modeRestoreFrame=requestAnimationFrame(()=>{
   const parts=chapterParts.get(active);
   const target=desktop.matches||!parts?active:view?parts.secondary:parts.primary;
   target.scrollIntoView({block:'start',behavior:'instant'});
   scheduleHeader();
  });
 };
});
desktop.addEventListener('change',()=>{chapters.forEach(chapter=>setView(chapter,Number(chapter.dataset.view)||0));scheduleHeader();});
media.add('(max-width:1100px) and (prefers-reduced-motion:no-preference)',()=>{
 $$('.wellbeing-cards article,.layout-card,.investment-metrics article,.contact__panel').forEach(element=>{
  if(element.dataset.revealed==='true')return;
  gsap.from(element,{y:18,opacity:0,duration:.65,ease:'power2.out',scrollTrigger:{trigger:element,start:'top 94%',once:true,onEnter:()=>{element.dataset.revealed='true';}}});
 });
});
function storyPosition(trigger:ScrollTrigger,id:string,view:number){return trigger.start+(trigger.end-trigger.start)*(view?(id==='about'?.76:.88):.07);}
function chooseStory(chapter:HTMLElement,view:number){
 const trigger=stories.get(chapter);
 if(trigger)window.scrollTo({top:storyPosition(trigger,chapter.id,view),behavior:reduced.matches?'instant':'smooth'});
 else{setView(chapter,view);scheduleHeader();}
}
function navigateTo(id:string){
 const target=document.getElementById(id);if(!target)return;
 if(id==='main-content'){target.focus({preventScroll:true});target.scrollIntoView({behavior:'instant',block:'start'});return;}
 const trigger=stories.get(target);
 const desired=['location','layouts','interiors'].includes(id)?1:0;
 if(trigger)window.scrollTo({top:storyPosition(trigger,id,desired),behavior:reduced.matches?'instant':'smooth'});
 else{if(target.matches('[data-story]'))setView(target,desired);target.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});}
}
function updateHeader(){
 headerPending=false;
 const y=scrollY,h=innerHeight;
 const rects=sections.map(element=>({element,rect:element.getBoundingClientRect()}));
 const hero=rects.find(item=>item.element.id==='home');
 const active=rects.find(item=>item.rect.top<=h*.3&&item.rect.bottom>h*.3)?.element.id||currentChapter;
 let light=false;
 for(const item of rects){
  if(!['layouts','interiors'].includes(item.element.id))continue;
  const details=chapterParts.get(item.element)!.secondary;
  const r=details.getBoundingClientRect();
  if(r.top<=95&&r.bottom>95&&(!desktop.matches||item.element.dataset.view==='1'))light=true;
 }
 const available=document.documentElement.scrollHeight-h;
 currentChapter=active;
 const activeElement=sections.find(section=>section.id===active);
 const activeParts=activeElement&&chapterParts.get(activeElement);
 currentStoryView=activeParts?(desktop.matches?Number(activeElement!.dataset.view)||0:activeParts.secondary.getBoundingClientRect().top<=h*.5?1:0):0;
 header.classList.toggle('is-scrolled',y>60);
 header.classList.toggle('is-home',desktop.matches&&!!hero&&hero.rect.bottom>h*.5&&(stories.get(hero.element)?.progress||0)<.18&&y<h*.5);
 header.classList.toggle('is-light',light);
 navLinks.forEach(link=>{if(link.hash==='#'+active){if(!link.hasAttribute('aria-current'))link.setAttribute('aria-current','location');}else if(link.hasAttribute('aria-current'))link.removeAttribute('aria-current');});
 readingProgress.style.transform=`scaleX(${available>0?Math.max(0,Math.min(1,y/available)):0})`;
}
function scheduleHeader(){if(!headerPending){headerPending=true;requestAnimationFrame(updateHeader);}}
window.addEventListener('scroll',scheduleHeader,{passive:true});
window.addEventListener('resize',scheduleHeader,{passive:true});
updateHeader();
motionInitialized=true;

document.addEventListener('click',event=>{const target=(event.target as HTMLElement).closest<HTMLElement>('button,a');if(!target)return;
 dialogClickOrigin=target;queueMicrotask(()=>{if(dialogClickOrigin===target)dialogClickOrigin=undefined;});
 if(target.hasAttribute('data-close'))target.closest<HTMLDialogElement>('dialog')?.close();
 else if(target.dataset.modal)openDialog(target.dataset.modal);
 else if(target.hasAttribute('data-enquire'))openEnquiry(target.dataset.enquire||'Six Senses Residences Dubai Marina');
 else if(target.hasAttribute('data-privacy'))openDialog('privacy-dialog');else if(target.hasAttribute('data-terms'))openDialog('terms-dialog');
 else if(target.dataset.unit)showUnit(target.dataset.unit);
 else if(target.dataset.planZoom){const unit=config.units.find(u=>u.id===target.dataset.planZoom);if(unit)openZoom(unit.plan,`${unit.name} floor plans`,unit.name,true);}
 else if(target.hasAttribute('data-gallery-next'))stepGallery(1);else if(target.hasAttribute('data-gallery-prev'))stepGallery(-1);
 else if(target.hasAttribute('data-gallery-zoom'))openGallery();
 else if(target.hasAttribute('data-photo'))openZoom(target.dataset.photo!,target.dataset.photoTitle||'Six Senses',target.dataset.photoTitle||'Six Senses');
 else if(target.hasAttribute('data-location-zoom'))openZoom($<HTMLImageElement>('.location-map img').src,'Six Senses Dubai Marina location map','Dubai Marina');
 else if(target.hasAttribute('data-zoom-in'))changeZoom(.5);else if(target.hasAttribute('data-zoom-out'))changeZoom(-.5);else if(target.hasAttribute('data-zoom-reset'))resetZoom();
 else if(target.hasAttribute('data-layout-next'))scrollLayout(1);else if(target.hasAttribute('data-layout-prev'))scrollLayout(-1);
 else if(target.hasAttribute('data-story-switch'))chooseStory(target.closest<HTMLElement>('.chapter')!,Number(target.dataset.storySwitch));
 if(target instanceof HTMLAnchorElement&&target.hash&&target.origin===location.origin&&target.pathname===location.pathname){const id=target.hash.slice(1);if(document.getElementById(id)){event.preventDefault();if(target.closest('#menu-dialog'))$<HTMLDialogElement>('#menu-dialog').close();navigateTo(id);history.replaceState({},'',target.hash);}}
});

// The intro is brief, optional and never prevents the document from loading.
try{if(!reduced.matches&&!sessionStorage.getItem('six-intro-seen')){sessionStorage.setItem('six-intro-seen','1');const intro=$('.intro');intro.classList.add('is-active');gsap.timeline({onComplete:()=>intro.classList.remove('is-active')}).fromTo('.intro .six-logo',{opacity:0,scale:1.1},{opacity:1,scale:1.25,duration:.35}).to('.intro__line',{scaleX:1,duration:.35},.15).to(intro,{opacity:0,duration:.35},.65);}}catch{/* Storage restrictions simply skip the optional intro. */}
let refreshFrame=0;
function refreshStories(){cancelAnimationFrame(refreshFrame);refreshFrame=requestAnimationFrame(()=>{ScrollTrigger.refresh();scheduleHeader();});}
window.addEventListener('load',refreshStories,{once:true});
window.addEventListener('pageshow',refreshStories);
document.fonts.ready.then(refreshStories);
const unitParam=new URLSearchParams(location.search).get('unit');if(unitParam)showUnit(unitParam);
