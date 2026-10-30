/* Adminlume standalone asset: no theme build or external dependencies. */
(() => {
const init = () => {
  const bar = document.getElementById('wpadminbar');
  if (!bar || !document.body.classList.contains('nzm-frontend-toolbar') || bar.dataset.nzmDockInitialized) return;
  const root = bar.querySelector('#wp-admin-bar-root-default');
  const groups = [...bar.querySelectorAll('#wp-toolbar > .ab-top-menu')];
  if (!root) return;
  bar.dataset.nzmDockInitialized = 'true';
  const timers = new Map();
  const records = new Map();
  let suppressFocus = false;
  let frame = 0;
  let layoutWidth = -1;
  let structureDirty = true;
  let visibilityAnimation = null;

  const comments = bar.querySelector('#wp-admin-bar-comments > .ab-item');
  if (comments) {
    const label = document.createElement('span');
    label.className = 'nzm-dock-label';
    label.textContent = window.roundedAdminDock?.comments || 'Comments';
    comments.querySelector('.ab-label')?.before(label);
  }
  const account = bar.querySelector('#wp-admin-bar-my-account > .ab-item');
  if (account) [...account.childNodes].forEach(node => {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) return;
    const greeting = document.createElement('span');
    greeting.className = 'nzm-account-greeting';
    node.before(greeting);
    greeting.append(node);
  });
  const more = document.createElement('li');
  more.id = 'wp-admin-bar-nzm-toolbar-more';
  more.className = 'menupop';
  const toggle = document.createElement('a');
  toggle.href = '#';
  toggle.className = 'ab-item';
  toggle.setAttribute('role', 'menuitem');
  toggle.setAttribute('aria-haspopup', 'true');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', window.roundedAdminDock?.more || 'More actions');
  const glyph = document.createElement('span');
  glyph.className = 'ab-icon dashicons-before dashicons-ellipsis';
  glyph.setAttribute('aria-hidden', 'true');
  const title = document.createElement('span');
  title.className = 'nzm-more-label';
  title.textContent = toggle.getAttribute('aria-label');
  toggle.append(glyph, title);
  const wrapper = document.createElement('div');
  wrapper.className = 'ab-sub-wrapper';
  const overflow = document.createElement('ul');
  overflow.id = 'nzm-toolbar-overflow';
  overflow.className = 'ab-submenu';
  overflow.setAttribute('role', 'menu');
  wrapper.append(overflow);
  more.append(toggle, wrapper);
  root.append(more);

  // Keep visibility controls outside the native groups and responsive overflow.
  const hide = document.createElement('button');
  hide.type = 'button';
  hide.id = 'ra-dock-hide';
  hide.className = 'ra-dock-visibility';
  hide.setAttribute('aria-label', window.roundedAdminDock?.hide || 'Hide admin toolbar');
  hide.title = hide.getAttribute('aria-label');
  const visibilityIcon = hidden => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${hidden ? '<path d="m3 3 18 18 M10.6 10.6a2 2 0 0 0 2.8 2.8 M9.8 5.2A11 11 0 0 1 12 5c6 0 10 7 10 7a19 19 0 0 1-3.2 3.8 M6.2 6.2A22 22 0 0 0 2 12s4 7 10 7a11 11 0 0 0 5.8-1.8"/>' : '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'}</svg>`;
  hide.innerHTML = visibilityIcon(true);
  const hideLabel = document.createElement('span');
  hideLabel.className = 'ra-dock-hide-label';
  hideLabel.textContent = window.roundedAdminDock?.hideLabel || 'Hide';
  hide.append(hideLabel);
  bar.querySelector('#wp-toolbar').append(hide);
  const show = document.createElement('button');
  show.type = 'button';
  show.id = 'ra-dock-show';
  show.className = 'ra-dock-visibility';
  show.setAttribute('aria-label', window.roundedAdminDock?.show || 'Show admin toolbar');
  show.title = show.getAttribute('aria-label');
  show.setAttribute('aria-controls', 'wpadminbar');
  show.setAttribute('aria-expanded', 'true');
  show.innerHTML = visibilityIcon(false);
  show.hidden = true;
  document.body.append(show);

  const trigger = item => item.querySelector(':scope > .ab-item');
  const panel = item => item.querySelector(':scope > .ab-sub-wrapper');
  const close = item => {
    item.classList.remove('nzm-open', 'hover');
    trigger(item)?.setAttribute('aria-expanded', 'false');
    item.querySelectorAll('.nzm-open').forEach(close);
    clearTimeout(timers.get(item));
  };
  const position = item => {
    const popup = panel(item);
    const anchor = trigger(item);
    if (!popup || !anchor) return;
    const available = Math.max(60, bar.getBoundingClientRect().top - 18);
    popup.style.setProperty('--nzm-menu-max-height', `${available}px`);
    const bounds = anchor.getBoundingClientRect();
    const width = popup.getBoundingClientRect().width;
    const height = popup.getBoundingClientRect().height;
    const left = Math.max(8, Math.min(bounds.left, innerWidth - width - 8));
    const top = Math.max(8, bounds.top - height - 10);
    popup.style.setProperty('--nzm-menu-left', `${left}px`);
    popup.style.setProperty('--nzm-menu-top', `${top}px`);
  };
  const open = item => {
    if (!panel(item)) return;
    clearTimeout(timers.get(item));
    for (const sibling of item.parentElement.children) if (sibling !== item && sibling.classList.contains('nzm-open')) close(sibling);
    item.classList.add('nzm-open');
    trigger(item)?.setAttribute('aria-expanded', 'true');
    position(item);
  };
  const observer = new MutationObserver(() => { structureDirty = true; schedule(); });
  const observe = () => groups.forEach(group => observer.observe(group, { childList: true }));
  const keep = new Set(['wp-admin-bar-wp-logo', 'wp-admin-bar-site-name', 'wp-admin-bar-edit', 'wp-admin-bar-my-account']);
  const desktopKeep = new Set([...keep, 'wp-admin-bar-woocommerce-site-visibility-badge', 'wp-admin-bar-nzm-toolbar-dashboard', 'wp-admin-bar-customize', 'wp-admin-bar-comments', 'wp-admin-bar-new-content']);
  const layout = () => {
    frame = 0;
    if (bar.hidden || bar.inert) return;
    if (innerWidth === layoutWidth && !structureDirty) {
      bar.querySelectorAll('.nzm-open').forEach(position);
      return;
    }
    layoutWidth = innerWidth;
    structureDirty = false;
    observer.disconnect();
    const active = bar.contains(document.activeElement) ? document.activeElement : null;
    groups.forEach(group => [...group.children].forEach(node => {
      if (node !== more && !records.has(node)) records.set(node, group);
    }));
    bar.querySelectorAll('.nzm-open').forEach(close);
    records.forEach((group, node) => {
      if (!node.isConnected) { records.delete(node); return; }
      if (group === root) root.insertBefore(node, more);
      else group.append(node);
    });
    bar.classList.remove('nzm-dock-compact');
    bar.classList.remove('nzm-has-overflow');
    const compact = innerWidth <= 1100 || bar.scrollWidth > bar.clientWidth + 1;
    if (compact) {
      bar.classList.add('nzm-dock-compact');
    }
    records.forEach((group, node) => { if (!(compact ? keep : desktopKeep).has(node.id)) overflow.append(node); });
    bar.classList.toggle('nzm-has-overflow', overflow.children.length > 0);
    bar.querySelectorAll('.menupop').forEach(item => {
      if (panel(item)) {
        trigger(item)?.setAttribute('aria-haspopup', 'true');
        trigger(item)?.setAttribute('aria-expanded', 'false');
      }
    });
    if (active?.isConnected) {
      if (overflow.contains(active)) open(more);
      suppressFocus = true;
      active.focus({ preventScroll: true });
      suppressFocus = false;
    }
    observe();
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(layout); };
  const setHidden = (hidden, focus = true) => {
    visibilityAnimation?.cancel();
    visibilityAnimation = null;
    bar.querySelectorAll('.nzm-open').forEach(close);
    const animate = focus && typeof bar.animate === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    bar.hidden = hidden && !animate;
    bar.inert = hidden;
    show.hidden = !hidden;
    show.setAttribute('aria-expanded', String(!hidden));
    if (!hidden) { structureDirty = true; layout(); }
    if (focus) (hidden ? show : hide).focus({ preventScroll: true });
    if (animate) {
      const visible = { opacity: 1, transform: 'translateY(0) scale(1)' };
      const collapsed = { opacity: 0, transform: 'translateY(12px) scale(.98)' };
      const animation = bar.animate(hidden ? [visible, collapsed] : [collapsed, visible], { duration: 180, easing: 'ease-out' });
      visibilityAnimation = animation;
      animation.finished.then(() => {
        if (visibilityAnimation !== animation) return;
        bar.hidden = hidden;
        visibilityAnimation = null;
      }).catch(() => { /* A quick reopen cancels the previous animation. */ });
    }
    try {
      if (window.roundedAdminDock?.storageKey) localStorage.setItem(window.roundedAdminDock.storageKey, hidden ? 'hidden' : 'visible');
    } catch (_) { /* Storage may be disabled; controls still work. */ }
  };
  hide.addEventListener('click', () => setHidden(true));
  show.addEventListener('click', () => setHidden(false));
  toggle.addEventListener('click', event => {
    event.preventDefault();
    if (more.classList.contains('nzm-open')) close(more);
    else open(more);
  });
  bar.addEventListener('pointerover', event => {
    const item = event.target.closest('.menupop');
    if (item === more) { clearTimeout(timers.get(more)); return; }
    if (item && event.pointerType !== 'touch') open(item);
  });
  bar.addEventListener('pointerout', event => {
    const item = event.target.closest('.menupop');
    if (item && !item.contains(event.relatedTarget)) {
      timers.set(item, setTimeout(() => { if (!item.contains(document.activeElement)) close(item); }, 220));
    }
  });
  bar.addEventListener('focusin', event => {
    if (suppressFocus) return;
    const item = event.target.closest('.menupop');
    if (item && item !== more && event.target === trigger(item)) open(item);
  });
  bar.addEventListener('focusout', () => setTimeout(() => {
    bar.querySelectorAll('.nzm-open').forEach(item => { if (!item.contains(document.activeElement)) close(item); });
  }, 0));
  bar.addEventListener('keydown', event => {
    const item = event.target.closest('.menupop');
    const currentPanel = event.target.closest('.ab-sub-wrapper');
    const links = popup => [...popup.querySelectorAll('a.ab-item[href], button')].filter(el => el.closest('.ab-sub-wrapper') === popup && el.getClientRects().length);
    if (event.key === 'Escape' || (event.key === 'ArrowLeft' && currentPanel)) {
      const owner = currentPanel?.parentElement || item;
      if (!owner) return;
      event.preventDefault(); event.stopPropagation();
      close(owner);
      suppressFocus = true; trigger(owner)?.focus(); suppressFocus = false;
    } else if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && item && event.target === trigger(item)) {
      event.preventDefault(); open(item);
      const entries = links(panel(item));
      (event.key === 'ArrowUp' ? entries.at(-1) : entries[0])?.focus();
    } else if (currentPanel && ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const entries = links(currentPanel);
      const index = entries.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? entries.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length;
      entries[next]?.focus();
    } else if (event.key === 'ArrowRight' && item && event.target === trigger(item)) {
      event.preventDefault(); open(item); links(panel(item))[0]?.focus();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!bar.contains(event.target)) bar.querySelectorAll('.nzm-open').forEach(close);
  });
  window.addEventListener('resize', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  document.fonts?.ready.then(schedule);
  bar.classList.add('nzm-dock-ready');
  layout();
  try {
    if (window.roundedAdminDock?.storageKey && localStorage.getItem(window.roundedAdminDock.storageKey) === 'hidden') setHidden(true, false);
  } catch (_) { /* Keep the default visible toolbar. */ }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
})();
