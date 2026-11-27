/* Adminlume enhancement: WordPress owns opening, focus and collapse state. */
(() => {
  const start = () => {
    const body = document.body;
    const sidebar = document.getElementById('adminmenuwrap');
    const menu = document.getElementById('adminmenu');
    if (!sidebar || !menu || !body.classList.contains('rounded-admin')) return;
    const desktop = matchMedia('(min-width: 783px)');
    let frame = 0;
    let navigation = null;
    let collapseHost = null;
    const collapse = document.getElementById('collapse-menu');
    const siteNode = document.getElementById('wp-admin-bar-adminlume-site');

    // Desktop: the collapse control moves into the workspace toolbar beside the
    // site name; the menu itself moves into an independent scroll container.
    // Both are moved, never cloned, and restored for the native mobile layout.
    const prepare = enabled => {
      if (enabled && !navigation) {
        if (collapse && siteNode) {
          collapseHost = document.createElement('ul');
          collapseHost.className = 'ra-collapse-host';
          collapseHost.append(collapse);
          siteNode.append(collapseHost);
        }
        navigation = document.createElement('div');
        navigation.id = 'ra-sidebar-navigation';
        navigation.append(menu);
        navigation.addEventListener('scroll', schedule, { passive: true });
        sidebar.append(navigation);
      } else if (!enabled && navigation) {
        if (collapse) menu.append(collapse);
        collapseHost?.remove();
        collapseHost = null;
        sidebar.append(menu);
        navigation.remove();
        navigation = null;
      }
    };

    const update = () => {
      frame = 0;
      const enabled = desktop.matches && !body.classList.contains('block-editor-page');
      body.classList.toggle('ra-sidebar-scroll', enabled);
      prepare(enabled);
      const folded = body.classList.contains('folded') ||
        (body.classList.contains('auto-fold') && innerWidth <= 960);
      const rtl = getComputedStyle(body).direction === 'rtl';
      const barHeight = document.getElementById('wpadminbar')?.getBoundingClientRect().height || 32;

      for (const item of menu.children) {
        const submenu = item.querySelector(':scope > .wp-submenu');
        if (!submenu) continue;
        const hasCurrentChild = Boolean(submenu.querySelector(':scope > li.current, :scope > li > a[aria-current="page"]'));
        if (item.classList.contains('ra-has-current-child') !== hasCurrentChild) {
          item.classList.toggle('ra-has-current-child', hasCurrentChild);
        }
        const floating = enabled && (folded || !item.classList.contains('wp-has-current-submenu'));
        if (submenu.classList.contains('ra-flyout') !== floating) {
          submenu.classList.toggle('ra-flyout', floating);
        }
        if (!floating) continue;
        const anchor = item.querySelector(':scope > a.menu-top');
        const active = item.classList.contains('opensub') || submenu.classList.contains('sub-open') ||
          anchor === document.activeElement || submenu.contains(document.activeElement);
        if (!active) continue;

        const rect = item.getBoundingClientRect();
        const boundary = sidebar.getBoundingClientRect();
        const height = submenu.getBoundingClientRect().height;
        const scrollBoundary = navigation.getBoundingClientRect();
        const top = rect.bottom < scrollBoundary.top || rect.top > scrollBoundary.bottom ? -10000 :
          Math.max(barHeight + 4, Math.min(rect.top - 1, innerHeight - height - 8));
        const left = rtl ? boundary.left - submenu.offsetWidth : boundary.right;
        submenu.style.setProperty('--ra-flyout-top', `${top}px`);
        submenu.style.setProperty('--ra-flyout-left', `${Math.max(0, left)}px`);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Observe native menu state rather than duplicating WordPress's event handlers.
    new MutationObserver(schedule).observe(body, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(records => {
      if (records.some(record => record.target === menu || record.target.parentElement === menu ||
        record.target.classList.contains('wp-submenu'))) schedule();
    }).observe(menu, { subtree: true, attributes: true, attributeFilter: ['class'] });
    menu.addEventListener('mouseover', schedule);
    menu.addEventListener('focusin', schedule);
    menu.addEventListener('focusout', schedule);
    sidebar.addEventListener('transitionend', schedule);
    window.addEventListener('resize', schedule, { passive: true });
    desktop.addEventListener('change', schedule);
    update();

    // Reveal the active section inside the sidebar, without scrolling the document.
    const current = menu.querySelector('li.current, li.wp-has-current-submenu');
    if (navigation && current) {
      const bottom = current.getBoundingClientRect().bottom;
      if (bottom > navigation.getBoundingClientRect().bottom) {
        navigation.scrollTop += bottom - navigation.getBoundingClientRect().bottom + 16;
      }
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
