/* Adminlume: enhance the one native toolbar, never clone third-party controls. */
(() => {
  const init = () => {
    const bar = document.getElementById('wpadminbar');
    if (!bar || !document.body.classList.contains('nzm-frontend-toolbar') || bar.dataset.nzmDockInitialized) return;
    const toolbar = bar.querySelector('#wp-toolbar');
    const root = bar.querySelector('#wp-admin-bar-root-default');
    if (!toolbar || !root) return;
    bar.dataset.nzmDockInitialized = 'true';
    const labels = window.roundedAdminDock || {};
    toolbar.setAttribute('aria-label', labels.toolbar || 'Site actions');
    const timers = new Map();
    const records = new Set();
    const groups = () => [...toolbar.children].filter(node => node.matches('ul.ab-top-menu'));
    let frame = 0;
    let dirty = true;
    let compact = false;
    let collapsed = false;
    let animation = null;
    let suppressFocus = false;
    let lastWidth = -1;
    let pointerMenu = null;
    const trigger = item => item?.querySelector(':scope > .ab-item');
    const panel = item => item?.querySelector(':scope > .ab-sub-wrapper');
    const icon = name => {
      const span = document.createElement('span');
      span.className = `ab-icon dashicons dashicons-${name}`;
      span.setAttribute('aria-hidden', 'true');
      return span;
    };
    const menu = (id, label, glyph) => {
      const item = document.createElement('li');
      item.id = id;
      item.className = 'menupop nzm-generated-menu';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ab-item';
      button.setAttribute('role', 'menuitem');
      button.setAttribute('aria-haspopup', 'true');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', label);
      button.title = label;
      button.append(icon(glyph));
      const popup = document.createElement('div');
      popup.className = 'ab-sub-wrapper';
      const list = document.createElement('ul');
      list.className = 'ab-submenu';
      list.id = `${id}-items`;
      list.setAttribute('role', 'menu');
      list.setAttribute('aria-label', label);
      button.setAttribute('aria-controls', list.id);
      popup.append(list);
      item.append(button, popup);
      return { item, button, list };
    };
    const site = menu('wp-admin-bar-nzm-toolbar-site', labels.siteMenu || 'Site menu', 'wordpress');
    const siteLabel = document.createElement('span');
    siteLabel.className = 'nzm-site-label';
    siteLabel.textContent = labels.site || trigger(bar.querySelector('#wp-admin-bar-site-name'))?.textContent.trim() || 'WordPress';
    site.button.append(siteLabel, icon('arrow-up-alt2'));
    const more = menu('wp-admin-bar-nzm-toolbar-more', labels.more || 'More actions', 'ellipsis');
    more.list.id = 'nzm-toolbar-overflow';
    more.button.setAttribute('aria-controls', more.list.id);
    const collect = () => groups().forEach(group => [...group.children].forEach(node => {
      if (node !== site.item && node !== more.item) records.add(node);
    }));
    collect();
    root.prepend(site.item);
    root.append(more.item);

    // Visually replace the greeting, retaining the native account link and menu.
    const account = trigger(bar.querySelector('#wp-admin-bar-my-account'));
    if (account) {
      account.setAttribute('aria-label', labels.account || 'Account menu');
      account.title = labels.account || 'Account menu';
      [...account.childNodes].forEach(node => {
        if (node.nodeType !== Node.TEXT_NODE) return;
        const greeting = document.createElement('span');
        greeting.className = 'nzm-account-greeting';
        node.before(greeting);
        greeting.append(node);
      });
      const avatar = account.querySelector('img.avatar');
      const fallback = () => {
        avatar?.classList.add('nzm-avatar-unavailable');
        if (!account.querySelector('.dashicons-admin-users')) account.append(icon('admin-users'));
      };
      if (!avatar) fallback();
      else {
        avatar.addEventListener('error', fallback, { once: true });
        if (avatar.complete && !avatar.naturalWidth) fallback();
      }
    }

    // Keep compatibility IDs and the previous per-user local-storage key.
    const collapse = document.createElement('button');
    collapse.id = 'ra-dock-hide';
    collapse.type = 'button';
    collapse.className = 'ra-dock-visibility';
    collapse.setAttribute('aria-label', labels.collapse || 'Collapse toolbar');
    collapse.title = collapse.getAttribute('aria-label');
    collapse.setAttribute('aria-controls', 'wpadminbar');
    collapse.append(icon('minus'));
    toolbar.append(collapse);
    const expand = document.createElement('button');
    expand.id = 'ra-dock-show';
    expand.type = 'button';
    expand.className = 'ra-dock-visibility';
    expand.setAttribute('aria-label', labels.expand || 'Expand toolbar');
    expand.title = expand.getAttribute('aria-label');
    expand.setAttribute('aria-controls', 'wpadminbar');
    expand.setAttribute('aria-expanded', 'false');
    expand.append(icon('wordpress'), icon('arrow-up-alt2'));
    expand.hidden = true;
    document.body.append(expand);

    const close = item => {
      item.classList.remove('nzm-open', 'hover');
      trigger(item)?.setAttribute('aria-expanded', 'false');
      clearTimeout(timers.get(item));
      item.querySelectorAll('.nzm-open').forEach(close);
    };
    const position = item => {
      const popup = panel(item);
      const anchor = trigger(item);
      if (!popup || !anchor) return;
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft || 0) + 8;
      const topEdge = (viewport?.offsetTop || 0) + 8;
      const rightEdge = leftEdge + (viewport?.width || innerWidth) - 16;
      const bottom = bar.getBoundingClientRect().top - 10;
      popup.style.setProperty('--nzm-menu-max-height', `${Math.max(44, bottom - topEdge)}px`);
      const bounds = anchor.getBoundingClientRect();
      const rect = popup.getBoundingClientRect();
      popup.style.setProperty('--nzm-menu-left', `${Math.max(leftEdge, Math.min(bounds.left, rightEdge - rect.width))}px`);
      // Nested panels also open above the dock, with their own scroll container.
      popup.style.setProperty('--nzm-menu-top', `${Math.max(topEdge, bottom - rect.height)}px`);
    };
    const open = item => {
      if (!panel(item)) return;
      clearTimeout(timers.get(item));
      for (const sibling of item.parentElement.children) {
        if (sibling !== item && sibling.classList.contains('nzm-open')) close(sibling);
      }
      item.classList.add('nzm-open');
      trigger(item)?.setAttribute('aria-haspopup', 'true');
      trigger(item)?.setAttribute('aria-expanded', 'true');
      position(item);
    };
    const reveal = element => {
      const parents = [];
      for (let owner = element.closest('.ab-sub-wrapper')?.parentElement; owner; owner = owner.parentElement?.closest('.ab-sub-wrapper')?.parentElement) parents.unshift(owner);
      parents.forEach(open);
    };
    const observer = new MutationObserver(mutations => {
      if (mutations.some(mutation => mutation.type === 'childList' &&
        (mutation.target === toolbar || groups().includes(mutation.target) || mutation.target === site.list || mutation.target === more.list) &&
        [...mutation.addedNodes, ...mutation.removedNodes].some(node => node.nodeType === Node.ELEMENT_NODE))) dirty = true;
      schedule();
    });
    const siteIds = new Set(['wp-admin-bar-wp-logo', 'wp-admin-bar-site-name', 'wp-admin-bar-woocommerce-site-visibility-badge', 'wp-admin-bar-nzm-toolbar-dashboard']);
    const layout = () => {
      frame = 0;
      if (collapsed || bar.inert) return;
      if (lastWidth === innerWidth && !dirty) {
        bar.querySelectorAll('.nzm-open').forEach(position);
        return;
      }
      lastWidth = innerWidth;
      dirty = false;
      observer.disconnect();
      collect();
      const active = bar.contains(document.activeElement) ? document.activeElement : null;
      bar.querySelectorAll('.nzm-open').forEach(close);
      const primary = [...records].find(node => node.id === 'wp-admin-bar-edit') || [...records].find(node => node.classList.contains('nzm-primary-action'));
      compact = innerWidth <= 600;
      bar.classList.toggle('nzm-dock-compact', compact);
      records.forEach(node => {
        if (!bar.contains(node)) { records.delete(node); return; }
        if (siteIds.has(node.id)) site.list.append(node);
        else if (node.id === 'wp-admin-bar-my-account') {
          (bar.querySelector('#wp-admin-bar-top-secondary') || root).append(node);
        } else if (node === primary || (!compact && node.id === 'wp-admin-bar-new-content')) root.insertBefore(node, more.item);
        else more.list.append(node);
      });
      if (primary?.parentElement === root) site.item.after(primary);
      // Long translations or third-party labels must not force horizontal overflow.
      if (!compact && bar.scrollWidth > bar.clientWidth + 1) {
        compact = true;
        bar.classList.add('nzm-dock-compact');
        const create = bar.querySelector('#wp-admin-bar-new-content');
        if (create) more.list.append(create);
      }
      bar.classList.toggle('nzm-has-overflow', more.list.children.length > 0);
      bar.querySelectorAll('.menupop').forEach(item => {
        if (!panel(item)) return;
        const button = trigger(item);
        button?.setAttribute('aria-haspopup', 'true');
        button?.setAttribute('aria-expanded', 'false');
        if (button && !button.title) button.title = button.textContent.trim() || button.getAttribute('aria-label') || '';
      });
      bar.querySelectorAll('.ab-top-menu > li > .ab-item').forEach(button => {
        const label = button.textContent.trim() || button.getAttribute('aria-label');
        if (label && !button.title) button.title = label;
        if (label && !button.hasAttribute('aria-label')) button.setAttribute('aria-label', label);
      });
      if (active?.isConnected) {
        reveal(active);
        suppressFocus = true;
        active.focus({ preventScroll: true });
        suppressFocus = false;
      }
      observer.observe(toolbar, { childList: true, subtree: true });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(layout); };
    const setCollapsed = (value, { focus = true, persist = true } = {}) => {
      collapsed = value;
      animation?.cancel();
      animation = null;
      bar.querySelectorAll('.nzm-open').forEach(close);
      const animate = focus && typeof bar.animate === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
      bar.hidden = value && !animate;
      bar.inert = value;
      expand.hidden = !value;
      expand.setAttribute('aria-expanded', String(!value));
      if (!value) { dirty = true; layout(); }
      if (!value) expand.classList.remove('nzm-yield-left', 'nzm-yield-right');
      if (focus) (value ? expand : collapse).focus({ preventScroll: true });
      if (animate) {
        const visible = { opacity: 1, transform: 'translateY(0) scale(1)' };
        const small = { opacity: 0, transform: 'translateY(8px) scale(.96)' };
        const current = bar.animate(value ? [visible, small] : [small, visible], { duration: 180, easing: 'ease-out' });
        animation = current;
        current.finished.then(() => {
          if (animation !== current) return;
          bar.hidden = value;
          animation = null;
        }).catch(() => { /* A quick reopen cancels the outgoing animation. */ });
      }
      if (persist) {
        try { if (labels.storageKey) localStorage.setItem(labels.storageKey, value ? 'hidden' : 'visible'); }
        catch (_) { /* Browser storage is optional. */ }
      }
    };
    collapse.addEventListener('click', () => setCollapsed(true));
    expand.addEventListener('click', () => setCollapsed(false));
    [site, more].forEach(entry => entry.button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (entry.item.classList.contains('nzm-open')) close(entry.item);
      else open(entry.item);
    }));
    bar.addEventListener('pointerdown', event => {
      const item = event.target.closest('.menupop');
      pointerMenu = item ? { item, open: item.classList.contains('nzm-open'), touch: event.pointerType === 'touch' } : null;
    }, true);
    // Core's touch handling uses .hover; synchronize our popovers without
    // swallowing plugin actions or modified clicks on native links.
    bar.addEventListener('click', event => {
      const item = event.target.closest('.menupop');
      if (!item || item.classList.contains('nzm-generated-menu') || !panel(item) || !trigger(item)?.contains(event.target)) return;
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return;
      const previous = pointerMenu?.item === item ? pointerMenu : null;
      pointerMenu = null;
      if (item.id === 'wp-admin-bar-my-account' || (previous?.touch && !previous.open)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (item.id === 'wp-admin-bar-my-account' && previous?.touch && previous.open) close(item);
        else open(item);
      }
    }, true);
    bar.addEventListener('pointerover', event => {
      if (event.pointerType === 'touch' || !matchMedia('(hover: hover)').matches) return;
      const item = event.target.closest('.menupop');
      if (item?.classList.contains('nzm-generated-menu')) clearTimeout(timers.get(item));
      else if (item) open(item);
    });
    bar.addEventListener('pointerout', event => {
      const item = event.target.closest('.menupop');
      if (item && !item.contains(event.relatedTarget)) {
        timers.set(item, setTimeout(() => { if (!item.contains(document.activeElement)) close(item); }, 180));
      }
    });
    bar.addEventListener('focusin', event => {
      if (suppressFocus) return;
      reveal(event.target);
      const item = event.target.closest('.menupop');
      if (item && !item.classList.contains('nzm-generated-menu') && event.target === trigger(item)) open(item);
    });
    bar.addEventListener('focusout', () => setTimeout(() => {
      bar.querySelectorAll('.nzm-open').forEach(item => { if (!item.contains(document.activeElement)) close(item); });
    }, 0));
    bar.addEventListener('keydown', event => {
      const item = event.target.closest('.menupop');
      const currentPanel = event.target.closest('.ab-sub-wrapper');
      const links = popup => popup ? [...popup.querySelectorAll('a.ab-item[href], button, input')].filter(element => element.closest('.ab-sub-wrapper') === popup && element.getClientRects().length && !element.disabled && element.tabIndex >= 0) : [];
      if (event.target.matches('input, textarea, select') && event.key !== 'Escape') return;
      if (event.key === 'Escape' || (event.key === 'ArrowLeft' && currentPanel)) {
        const owner = currentPanel?.parentElement || item;
        if (!owner) return;
        event.preventDefault(); event.stopPropagation();
        close(owner);
        suppressFocus = true; trigger(owner)?.focus(); suppressFocus = false;
      } else if (['ArrowUp', 'ArrowDown', 'ArrowRight'].includes(event.key) && item && event.target === trigger(item) && panel(item)) {
        event.preventDefault(); event.stopPropagation(); open(item);
        const entries = links(panel(item));
        (event.key === 'ArrowUp' ? entries.at(-1) : entries[0])?.focus();
      } else if (currentPanel && ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
        const entries = links(currentPanel);
        if (!entries.length) return;
        event.preventDefault(); event.stopPropagation();
        const index = entries.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? entries.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length;
        entries[next]?.focus();
      }
    });
    document.addEventListener('pointerdown', event => {
      if (!bar.contains(event.target)) bar.querySelectorAll('.nzm-open').forEach(close);
    });
    // Yield to focused site controls without scrolling or changing the site layout.
    document.addEventListener('focusin', event => {
      const target = event.target;
      if (bar.contains(target) || target === expand || !target.matches('a, button, input, textarea, select, [contenteditable="true"], [tabindex]')) return;
      const rect = target.getBoundingClientRect();
      const intersects = dock => rect.bottom > dock.top && rect.top < dock.bottom && rect.right > dock.left && rect.left < dock.right;
      if (!collapsed && intersects(bar.getBoundingClientRect())) {
        setCollapsed(true, { focus: false, persist: false });
      }
      if (collapsed && intersects(expand.getBoundingClientRect())) {
        expand.classList.toggle('nzm-yield-left', rect.left + rect.width / 2 > innerWidth / 2);
        expand.classList.toggle('nzm-yield-right', rect.left + rect.width / 2 <= innerWidth / 2);
      }
    });
    const viewport = () => {
      const visual = window.visualViewport;
      const offset = visual ? Math.max(0, innerHeight - visual.height - visual.offsetTop) : 0;
      bar.style.setProperty('--nzm-viewport-offset', `${offset}px`);
      expand.style.setProperty('--nzm-viewport-offset', `${offset}px`);
      schedule();
    };
    window.addEventListener('resize', viewport, { passive: true });
    window.visualViewport?.addEventListener('resize', viewport, { passive: true });
    window.visualViewport?.addEventListener('scroll', viewport, { passive: true });
    document.fonts?.ready.then(() => { dirty = true; schedule(); });
    bar.classList.add('nzm-dock-ready');
    layout();
    viewport();
    try { if (labels.storageKey && localStorage.getItem(labels.storageKey) === 'hidden') setCollapsed(true, { focus: false, persist: false }); }
    catch (_) { /* Keep the default expanded toolbar. */ }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
