import {gsap} from 'gsap';

type GalleryItem = {image: string; alt: string};
type MediaConfig = {gallery: GalleryItem[]; openDialog: (id: string) => void};
type Point = {x: number; y: number};

/** Media controls share the site's native dialogs, but own their gesture state. */
export function initializeMediaInteractions(config: MediaConfig, reduced: MediaQueryList) {
  const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => root.querySelector<T>(selector)!;
  const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [...root.querySelectorAll<T>(selector)];
  const events = new AbortController();
  const {signal} = events;
  const decoded = new Map<string, Promise<{src: string} | null>>();
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  function loadImage(src: string) {
    let pending = decoded.get(src);
    if (!pending) {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
      pending = image.decode().catch(() => undefined).then(() => {
        if (image.naturalWidth) return {src: image.src};
        decoded.delete(src);
        return null;
      });
      decoded.set(src, pending);
    }
    return pending;
  }

  const gallery = $('.gallery');
  const galleryMain = $<HTMLButtonElement>('.gallery__main');
  const galleryImage = $<HTMLImageElement>('[data-gallery-image]');
  const galleryPreview = $<HTMLImageElement>('[data-gallery-preview]');
  const galleryCount = $('[data-gallery-current]');
  let requestedGallery = 0;
  let displayedGallery = 0;
  let galleryRequest = 0;
  let galleryTween: gsap.core.Tween | undefined;
  let fadeLayer: HTMLImageElement | null = null;
  let swipe: {id: number; x: number; y: number} | null = null;
  let suppressClickUntil = 0;
  galleryMain.style.touchAction = 'pan-y';
  galleryImage.draggable = false;
  galleryPreview.draggable = false;
  function retainDecodedPreview() {
    const current = config.gallery[displayedGallery];
    if (current && galleryPreview.getAttribute('src') !== current.image) {
      galleryPreview.src = current.image;
      galleryPreview.alt = current.alt;
    }
  }
  galleryPreview.addEventListener('error', retainDecodedPreview, {signal});
  if (galleryPreview.complete && !galleryPreview.naturalWidth) retainDecodedPreview();

  function finishGalleryTransition() {
    galleryTween?.kill();
    galleryTween = undefined;
    if (fadeLayer) {
      galleryImage.src = fadeLayer.src;
      galleryImage.alt = config.gallery[displayedGallery].alt;
      fadeLayer.remove();
      fadeLayer = null;
    }
  }

  async function showGallery(index: number) {
    if (!config.gallery.length) return;
    requestedGallery = (index + config.gallery.length) % config.gallery.length;
    const next = requestedGallery;
    const id = ++galleryRequest;
    gallery.setAttribute('aria-busy', 'true');
    const image = await loadImage(config.gallery[next].image);
    if (id !== galleryRequest) return;
    gallery.removeAttribute('aria-busy');
    // Keep the requested position so another Next can pass a failed photograph.
    // The visible image and counter commit only after a successful decode.
    if (!image) return;
    finishGalleryTransition();
    if (next !== displayedGallery) {
      displayedGallery = next;
      if (reduced.matches) {
        galleryImage.src = image.src;
        galleryImage.alt = config.gallery[next].alt;
      } else {
        // Keep the old frame opaque underneath the decoded incoming photograph.
        // This temporary layer uses the same source artwork and existing crop CSS.
        fadeLayer = galleryImage.cloneNode(false) as HTMLImageElement;
        fadeLayer.removeAttribute('data-gallery-image');
        fadeLayer.setAttribute('aria-hidden', 'true');
        fadeLayer.alt = '';
        fadeLayer.src = image.src;
        fadeLayer.loading = 'eager';
        fadeLayer.style.cssText = 'position:absolute;inset:0;opacity:0;pointer-events:none';
        galleryImage.after(fadeLayer);
        galleryTween = gsap.to(fadeLayer, {opacity: 1, duration: .45, ease: 'power1.out', onComplete: finishGalleryTransition});
      }
      galleryCount.textContent = String(next + 1);
    }
    const following = config.gallery[(next + 1) % config.gallery.length];
    void loadImage(following.image).then(preview => {
      if (preview && id === galleryRequest) {
        galleryPreview.src = preview.src;
        galleryPreview.alt = following.alt;
      } else if (!preview && id === galleryRequest) retainDecodedPreview();
    });
  }

  function stepGallery(delta: number) { void showGallery(requestedGallery + delta); }
  gallery.addEventListener('keydown', event => {
    if ((event.target as HTMLElement).closest('input,textarea,select')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      stepGallery(event.key === 'ArrowRight' ? 1 : -1);
    }
  }, {signal});
  galleryMain.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClickUntil = 0;
    swipe = {id: event.pointerId, x: event.clientX, y: event.clientY};
    galleryMain.setPointerCapture(event.pointerId);
  }, {signal});
  galleryMain.addEventListener('pointerup', event => {
    if (!swipe || swipe.id !== event.pointerId) return;
    const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
    swipe = null;
    if (galleryMain.hasPointerCapture(event.pointerId)) galleryMain.releasePointerCapture(event.pointerId);
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      suppressClickUntil = performance.now() + 500;
      stepGallery(dx < 0 ? 1 : -1);
      event.preventDefault();
    }
  }, {signal});
  galleryMain.addEventListener('pointercancel', () => { swipe = null; suppressClickUntil = 0; }, {signal});
  galleryMain.addEventListener('lostpointercapture', () => { swipe = null; }, {signal});
  galleryMain.addEventListener('click', event => {
    if (event.detail !== 0 && performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClickUntil = 0;
    }
  }, {capture: true, signal});

  const cardRail = $('.layout-cards');
  const cards = $$<HTMLElement>('.layout-card', cardRail);
  const railCount = $('[data-layout-count]');
  const railPrev = $<HTMLButtonElement>('[data-layout-prev]');
  const railNext = $<HTMLButtonElement>('[data-layout-next]');
  let railTarget: number | null = null;
  let railFrame = 0;
  let railTimer = 0;

  function railPositions() {
    const origin = cardRail.getBoundingClientRect().left + cardRail.clientLeft;
    const maximum = Math.max(0, cardRail.scrollWidth - cardRail.clientWidth);
    return cards.map(card => {
      const bounds = card.getBoundingClientRect();
      return clamp(bounds.left - origin + cardRail.scrollLeft + bounds.width / 2 - cardRail.clientWidth / 2, 0, maximum);
    });
  }
  function layoutIndex() {
    const positions = railPositions();
    return positions.reduce((best, position, index) => Math.abs(position - cardRail.scrollLeft) < Math.abs(positions[best] - cardRail.scrollLeft) ? index : best, 0);
  }
  function updateRail() {
    railFrame = 0;
    const scrollable = cardRail.scrollWidth > cardRail.clientWidth + 1;
    const index = railTarget ?? layoutIndex();
    const label = `${index + 1} / ${cards.length}`;
    if (railCount.textContent !== label) railCount.textContent = label;
    railPrev.disabled = !scrollable || index === 0;
    railNext.disabled = !scrollable || index === cards.length - 1;
    cardRail.tabIndex = scrollable ? 0 : -1;
  }
  function scheduleRail() { if (!railFrame) railFrame = requestAnimationFrame(updateRail); }
  function settleRail() { railTarget = null; scheduleRail(); }
  function scrollLayout(delta: number) {
    if (cards.length < 2 || cardRail.scrollWidth <= cardRail.clientWidth + 1) return;
    const index = clamp((railTarget ?? layoutIndex()) + delta, 0, cards.length - 1);
    railTarget = index;
    cardRail.scrollTo({left: railPositions()[index], behavior: reduced.matches ? 'instant' : 'smooth'});
    updateRail();
  }
  cardRail.addEventListener('scroll', () => {
    scheduleRail();
    clearTimeout(railTimer);
    railTimer = window.setTimeout(settleRail, 140);
  }, {passive: true, signal});
  cardRail.addEventListener('scrollend', settleRail, {signal});
  cardRail.addEventListener('pointerdown', settleRail, {passive: true, signal});
  cardRail.addEventListener('wheel', settleRail, {passive: true, signal});
  cardRail.addEventListener('keydown', event => {
    if ((event.target as HTMLElement).closest('input,textarea,select')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      scrollLayout(event.key === 'ArrowRight' ? 1 : -1);
    }
  }, {signal});
  const railResize = new ResizeObserver(() => { railTarget = null; scheduleRail(); });
  railResize.observe(cardRail, {box: 'border-box'});
  updateRail();

  const zoomDialog = $<HTMLDialogElement>('#zoom-dialog');
  const zoomStage = $('.zoom-stage');
  const zoomCanvas = $('.zoom-canvas');
  const zoomImage = $<HTMLImageElement>('[data-zoom-image]');
  const zoomReset = $('[data-zoom-reset]');
  const zoomIn = $<HTMLButtonElement>('[data-zoom-in]');
  const zoomOut = $<HTMLButtonElement>('[data-zoom-out]');
  const loading = document.createElement('p');
  loading.setAttribute('role', 'status');
  loading.hidden = true;
  loading.style.cssText = 'position:absolute;left:24px;right:24px;top:45%;text-align:center;color:var(--bronze);font-size:14px';
  zoomStage.append(loading);
  zoomCanvas.style.willChange = 'auto';
  zoomImage.draggable = false;
  let zoom = 1, panX = 0, panY = 0, zoomFrame = 0, zoomRequest = 0;
  let ready = false;
  const pointers = new Map<number, Point>();
  let drag: {point: Point; x: number; y: number} | null = null;
  let pinch: {distance: number; zoom: number; anchor: Point} | null = null;
  let bounds = {width: 0, height: 0, imageWidth: 0, imageHeight: 0, left: 0, top: 0};

  function updateZoom() {
    zoom = clamp(zoom, 1, 5);
    const x = Math.max(0, (bounds.imageWidth * zoom - bounds.width) / 2);
    const y = Math.max(0, (bounds.imageHeight * zoom - bounds.height) / 2);
    panX = clamp(panX, -x, x);
    panY = clamp(panY, -y, y);
    if (zoomFrame) return;
    zoomFrame = requestAnimationFrame(() => {
      zoomFrame = 0;
      zoomCanvas.style.transform = `translate(${panX}px,${panY}px) scale(${zoom})`;
      zoomReset.textContent = zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`;
      zoomIn.disabled = !ready || zoom >= 5;
      zoomOut.disabled = !ready || zoom <= 1;
      zoomStage.classList.toggle('is-dragging', zoom > 1 && pointers.size > 0);
    });
  }
  function measureZoom() {
    const rect = zoomStage.getBoundingClientRect();
    const width = zoomStage.clientWidth, height = zoomStage.clientHeight;
    const ratio = zoomImage.naturalWidth / (zoomImage.naturalHeight || 1);
    const imageWidth = Math.min(width, height * ratio);
    bounds = {width, height, imageWidth, imageHeight: ratio ? imageWidth / ratio : 0, left: rect.left, top: rect.top};
    updateZoom();
  }
  function clearPointers() {
    for (const id of pointers.keys()) if (zoomStage.hasPointerCapture(id)) zoomStage.releasePointerCapture(id);
    pointers.clear(); drag = null; pinch = null;
    zoomStage.classList.remove('is-dragging');
  }
  function resetZoom() { clearPointers(); zoom = 1; panX = 0; panY = 0; updateZoom(); }
  function zoomAt(value: number, point: Point = {x: 0, y: 0}) {
    if (!ready) return;
    const next = clamp(value, 1, 5);
    panX = point.x - (point.x - panX) * next / zoom;
    panY = point.y - (point.y - panY) * next / zoom;
    zoom = next;
    updateZoom();
  }
  function changeZoom(amount: number) { zoomAt(zoom + amount); }
  function local(point: Point): Point { return {x: point.x - bounds.left - bounds.width / 2, y: point.y - bounds.top - bounds.height / 2}; }
  function beginPinch() {
    const [a, b] = [...pointers.values()];
    const center = local({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});
    pinch = {distance: Math.hypot(a.x - b.x, a.y - b.y), zoom, anchor: {x: (center.x - panX) / zoom, y: (center.y - panY) / zoom}};
    drag = null;
  }
  async function openZoom(src: string, alt: string, title: string, plan = false) {
    const id = ++zoomRequest;
    ready = false;
    zoomImage.hidden = true;
    loading.textContent = 'Loading image…';
    loading.hidden = false;
    zoomStage.setAttribute('aria-busy', 'true');
    $('#zoom-title').textContent = title;
    zoomDialog.classList.toggle('is-plan', plan);
    config.openDialog('zoom-dialog');
    zoomCanvas.style.willChange = 'transform';
    resetZoom();
    measureZoom();
    const image = await loadImage(src);
    if (id !== zoomRequest || !zoomDialog.open) return;
    if (!image) {
      loading.textContent = 'The image could not be loaded. Close and try again.';
      zoomStage.removeAttribute('aria-busy');
      return;
    }
    zoomImage.src = image.src;
    zoomImage.alt = alt;
    await zoomImage.decode().catch(() => undefined);
    if (id !== zoomRequest || !zoomDialog.open) return;
    ready = true;
    zoomImage.hidden = false;
    loading.hidden = true;
    zoomStage.removeAttribute('aria-busy');
    measureZoom();
  }
  function openGallery() {
    const item = config.gallery[displayedGallery];
    if (item) void openZoom(item.image, item.alt, 'Six Senses interiors');
  }
  zoomStage.addEventListener('pointerdown', event => {
    if (!ready || event.button !== 0 || pointers.size >= 2) return;
    measureZoom();
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    zoomStage.setPointerCapture(event.pointerId);
    if (pointers.size === 2) beginPinch();
    else drag = {point: {x: event.clientX, y: event.clientY}, x: panX, y: panY};
    updateZoom();
  }, {signal});
  zoomStage.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const center = local({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});
      zoom = clamp(pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.distance), 1, 5);
      panX = center.x - pinch.anchor.x * zoom;
      panY = center.y - pinch.anchor.y * zoom;
    } else if (drag) {
      panX = drag.x + event.clientX - drag.point.x;
      panY = drag.y + event.clientY - drag.point.y;
    }
    updateZoom();
  }, {signal});
  function endPointer(event: PointerEvent) {
    if (!pointers.delete(event.pointerId)) return;
    pinch = null;
    const remaining = [...pointers.values()][0];
    // Rebase at the remaining finger's current position after a pinch.
    drag = remaining ? {point: {...remaining}, x: panX, y: panY} : null;
    updateZoom();
  }
  zoomStage.addEventListener('pointerup', endPointer, {signal});
  zoomStage.addEventListener('pointercancel', endPointer, {signal});
  zoomStage.addEventListener('lostpointercapture', endPointer, {signal});
  zoomStage.addEventListener('wheel', event => {
    event.preventDefault();
    const point = local({x: event.clientX, y: event.clientY});
    zoomAt(zoom + (event.deltaY < 0 ? .15 : -.15), point);
  }, {passive: false, signal});
  zoomStage.addEventListener('keydown', event => {
    if (!['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === '+' || event.key === '=') changeZoom(.5);
    else if (event.key === '-') changeZoom(-.5);
    else if (event.key === '0') resetZoom();
    else {
      panX += event.key === 'ArrowLeft' ? 40 : event.key === 'ArrowRight' ? -40 : 0;
      panY += event.key === 'ArrowUp' ? 40 : event.key === 'ArrowDown' ? -40 : 0;
      updateZoom();
    }
  }, {signal});
  const zoomResize = new ResizeObserver(() => { if (zoomDialog.open) { clearPointers(); measureZoom(); } });
  zoomResize.observe(zoomStage, {box: 'border-box'});
  zoomDialog.addEventListener('close', () => {
    zoomRequest++;
    clearPointers();
    zoomCanvas.style.willChange = 'auto';
  }, {signal});
  reduced.addEventListener('change', () => {
    finishGalleryTransition();
    if (railTarget !== null) cardRail.scrollTo({left: railPositions()[railTarget], behavior: 'instant'});
  }, {signal});

  return {
    stepGallery, openGallery, openZoom, changeZoom, resetZoom, scrollLayout,
    destroy() {
      events.abort();
      galleryRequest++; zoomRequest++;
      finishGalleryTransition(); clearPointers();
      railResize.disconnect(); zoomResize.disconnect();
      clearTimeout(railTimer); cancelAnimationFrame(railFrame); cancelAnimationFrame(zoomFrame);
      loading.remove(); zoomCanvas.style.willChange = 'auto';
    },
  };
}
