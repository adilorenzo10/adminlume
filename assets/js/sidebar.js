/* Adminlume enhancement: WordPress owns opening, focus and collapse state. */
(() => {
  const start = () => {
    const body = document.body;
    const sidebar = document.getElementById('adminmenuwrap');
    const menu = document.getElementById('adminmenu');
    if (!sidebar || !menu || !body.classList.contains('rounded-admin')) return;
    const desktop = matchMedia('(min-width: 783px)');
    let frame = 0;
    let header = null;
    let navigation = null;
    let search = null;
    let searchInput = null;
    let searchClear = null;
    let searchStatus = null;
    const originalHidden = new Map();
    const site = document.getElementById('ra-site-link');
    const collapse = document.getElementById('collapse-menu');

    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
    const filterMenu = () => {
      const query = normalize(searchInput?.value || '');
      if (searchClear) searchClear.hidden = !searchInput.value;
      if (search) search.classList.toggle('ra-has-query', Boolean(searchInput?.value));
      let matches = 0;
      for (const item of menu.children) {
        if (!item.matches('li.menu-top, li.wp-menu-separator')) continue;
        if (!originalHidden.has(item)) originalHidden.set(item, item.hidden);
        const matched = !query || (!item.classList.contains('wp-menu-separator') && normalize(item.textContent).includes(query));
        item.hidden = originalHidden.get(item) || !matched;
        if (!item.hidden && item.classList.contains('menu-top')) matches++;
      }
      if (searchStatus) searchStatus.textContent = query && !matches ? search.dataset.empty : '';
      schedule();
    };
    const focusSearch = () => {
      if (innerWidth < 961 || !searchInput) return;
      if (body.classList.contains('folded')) document.getElementById('collapse-button')?.click();
      requestAnimationFrame(() => searchInput?.focus());
    };

    const prepareHeader = enabled => {
      if (enabled && !header) {
        header = document.createElement('ul');
        header.id = 'ra-sidebar-header';
        if (site) header.append(site);
        if (collapse) header.append(collapse);
        sidebar.prepend(header);
        navigation = document.createElement('div');
        navigation.id = 'ra-sidebar-navigation';
        navigation.append(menu);
        navigation.addEventListener('scroll', schedule, { passive: true });
        sidebar.append(navigation);
        search = document.createElement('div');
        search.id = 'ra-sidebar-search';
        search.dataset.empty = window.roundedAdminSidebar?.empty || 'No menu items found.';
        const label = document.createElement('label');
        label.className = 'screen-reader-text';
        label.htmlFor = 'ra-menu-search';
        label.textContent = window.roundedAdminSidebar?.search || 'Search menu';
        searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.id = 'ra-menu-search';
        searchInput.placeholder = label.textContent;
        searchInput.autocomplete = 'off';
        searchInput.setAttribute('aria-controls', 'adminmenu');
        searchInput.addEventListener('input', filterMenu);
        searchInput.addEventListener('keydown', event => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            searchInput.value = '';
            filterMenu();
          }
        });
        const icon = document.createElement('button');
        icon.type = 'button';
        icon.className = 'ra-search-toggle';
        icon.setAttribute('aria-label', label.textContent);
        icon.addEventListener('click', focusSearch);
        const shortcut = document.createElement('kbd');
        shortcut.textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K';
        shortcut.setAttribute('aria-hidden', 'true');
        searchClear = document.createElement('button');
        searchClear.type = 'button';
        searchClear.className = 'ra-search-clear';
        searchClear.hidden = true;
        const clearLabel = window.roundedAdminSidebar?.clear || 'Clear search';
        searchClear.setAttribute('aria-label', clearLabel);
        searchClear.title = clearLabel;
        searchClear.addEventListener('click', () => {
          searchInput.value = '';
          filterMenu();
          searchInput.focus();
        });
        search.append(label, icon, searchInput, shortcut, searchClear);
        header.after(search);
        searchStatus = document.createElement('p');
        searchStatus.className = 'ra-menu-search-status';
        searchStatus.setAttribute('role', 'status');
        navigation.append(searchStatus);
      } else if (!enabled && header) {
        searchInput.value = '';
        filterMenu();
        if (collapse) menu.append(collapse);
        if (site) menu.append(site);
        sidebar.append(menu);
        navigation.remove();
        navigation = null;
        header.remove();
        header = null;
        search.remove();
        search = searchInput = searchStatus = searchClear = null;
      }
    };

    const update = () => {
      frame = 0;
      const enabled = desktop.matches && !body.classList.contains('block-editor-page');
      body.classList.toggle('ra-sidebar-scroll', enabled);
      prepareHeader(enabled);
      const folded = body.classList.contains('folded') ||
        (body.classList.contains('auto-fold') && innerWidth <= 960);
      if (search) search.querySelector('.ra-search-toggle').tabIndex = folded ? 0 : -1;
      if (folded && searchInput?.value) {
        searchInput.value = '';
        filterMenu();
      }
      const rtl = getComputedStyle(body).direction === 'rtl';

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
          Math.max(36, Math.min(rect.top - 1, innerHeight - height - 8));
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
    window.addEventListener('keydown', event => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k' && desktop.matches && innerWidth >= 961) {
        if (document.activeElement?.closest('[role="dialog"], .media-modal')) return;
        event.preventDefault();
        event.stopPropagation();
        focusSearch();
      }
    }, { capture: true });
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
