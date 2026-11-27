/* Adminlume workspace toolbar: regroups native nodes and provides a command palette. */
(() => {
  const start = () => {
    const body = document.body;
    const root = document.getElementById('wp-admin-bar-root-default');
    const searchNode = document.getElementById('wp-admin-bar-adminlume-search');
    if (!body.classList.contains('rounded-admin') || !root || !searchNode) return;

    const strings = Object.assign({
      title: 'Command palette',
      placeholder: 'Search screens, actions and tools…',
      results: 'Results',
      empty: 'No results for “%s”',
      count: '%d results',
      countOne: '1 result',
      create: 'Create',
      navigate: 'Go to',
      tools: 'Tools',
      site: 'Site',
      account: 'Account',
      commands: 'WordPress commands',
      openCommands: 'Open WordPress commands',
      move: 'to navigate',
      open: 'to open',
      close: 'to close'
    }, window.roundedAdminTopbar || {});
    const desktop = matchMedia('(min-width: 783px)');
    const byId = id => document.getElementById(`wp-admin-bar-${id}`);
    const submenuOf = node => node?.querySelector(':scope > .ab-sub-wrapper > .ab-submenu');

    body.classList.add('ra-topbar-ready');

    // Static nodes are not menu items; keep the toolbar's semantics honest.
    for (const id of ['adminlume-breadcrumb', 'adminlume-environment', 'adminlume-search']) {
      byId(id)?.querySelector(':scope > .ab-item')?.removeAttribute('role');
    }
    const trigger = searchNode.querySelector('.ra-search-trigger');
    const triggerKbd = searchNode.querySelector('.ra-search-kbd');
    if (window.adminlumePalette?.isMac && triggerKbd) triggerKbd.textContent = '⌘K';

    /* Desktop regrouping: native nodes move into Adminlume menus and back. */
    const notifications = byId('adminlume-notifications');
    const more = byId('adminlume-more');
    const keep = new Set(['menu-toggle', 'new-content', 'view', 'preview', 'archive', 'edit', 'updates', 'comments', 'woocommerce-site-visibility-badge']);
    const moved = [];
    let grouped = false;

    const moveInto = (node, target, before = null) => {
      const marker = document.createComment('adminlume-placeholder');
      node.before(marker);
      moved.push({ node, marker });
      target.insertBefore(node, before);
    };

    const group = () => {
      if (grouped) return;
      grouped = true;
      const notificationList = submenuOf(notifications);
      if (notificationList) {
        const footer = byId('adminlume-notifications-footer');
        for (const id of ['updates', 'comments']) {
          const node = byId(id);
          if (node && node.parentElement === root) moveInto(node, notificationList, footer);
        }
      }
      const newContent = byId('new-content');
      if (newContent && newContent.parentElement === root) moveInto(newContent, root, searchNode.nextSibling);

      const moreList = submenuOf(more);
      if (moreList) {
        for (const node of [...root.children]) {
          const id = node.id.replace(/^wp-admin-bar-/, '');
          if (!id || id.startsWith('adminlume-') || keep.has(id)) continue;
          moveInto(node, moreList, null);
        }
        more.classList.toggle('ra-has-items', moreList.children.length > 1);
      }
    };

    const ungroup = () => {
      if (!grouped) return;
      grouped = false;
      for (const { node, marker } of moved.splice(0).reverse()) {
        marker.replaceWith(node);
      }
      more?.classList.remove('ra-has-items');
    };

    const syncGrouping = () => (desktop.matches ? group() : ungroup());
    desktop.addEventListener('change', syncGrouping);
    syncGrouping();

    /* Command palette (shared module). */
    const shared = window.adminlumePalette;
    if (!shared) return;
    const { cleanText, usable } = shared;

    const index = add => {
      const newContent = byId('new-content');
      const newLabel = cleanText(newContent?.querySelector(':scope > .ab-item'));
      newContent?.querySelectorAll('.ab-submenu a.ab-item').forEach(link => {
        if (usable(link)) add('create', cleanText(link), newLabel, 'action', () => link.click());
      });

      for (const item of document.querySelectorAll('#adminmenu > li.menu-top')) {
        if (item.hidden || getComputedStyle(item).display === 'none') continue;
        const top = item.querySelector(':scope > a.menu-top');
        const parentLabel = cleanText(item.querySelector('.wp-menu-name'));
        if (usable(top)) add('navigate', parentLabel, '', 'navigate', () => top.click());
        item.querySelectorAll(':scope > .wp-submenu > li:not(.wp-submenu-head) > a').forEach(link => {
          const label = cleanText(link);
          if (usable(link) && label && label !== parentLabel) add('navigate', label, parentLabel, 'navigate', () => link.click(), true);
        });
      }

      submenuOf(notifications)?.querySelectorAll(':scope > li:not(#wp-admin-bar-adminlume-notifications-footer) > a.ab-item').forEach(link => {
        const label = link.querySelector('.screen-reader-text')?.textContent.trim() || cleanText(link);
        if (usable(link)) add('tools', label, '', 'tool', () => link.click());
      });
      submenuOf(more)?.querySelectorAll(':scope > li:not(#wp-admin-bar-adminlume-more-heading)').forEach(node => {
        const topLink = node.querySelector(':scope > .ab-item');
        const topLabel = cleanText(topLink) || topLink?.getAttribute('title') || '';
        if (topLink?.tagName === 'A' && usable(topLink)) add('tools', topLabel, '', 'tool', () => topLink.click());
        node.querySelectorAll('.ab-submenu a.ab-item').forEach(link => {
          if (usable(link)) add('tools', cleanText(link), topLabel, 'tool', () => link.click(), true);
        });
      });

      const siteLink = byId('adminlume-site')?.querySelector(':scope > a.ab-item');
      if (usable(siteLink)) add('site', siteLink.getAttribute('title') || cleanText(siteLink), '', 'site', () => siteLink.click());
      for (const id of ['view', 'preview', 'archive']) {
        const link = byId(id)?.querySelector(':scope > a.ab-item');
        if (usable(link)) add('site', cleanText(link), '', 'site', () => link.click());
      }

      byId('my-account')?.querySelectorAll('#wp-admin-bar-user-actions a.ab-item').forEach(link => {
        if (link.closest('#wp-admin-bar-user-info')) return;
        if (usable(link)) add('account', cleanText(link), '', 'navigate', () => link.click());
      });

      const commands = window.wp?.data;
      if (commands?.select?.('core/commands') && commands.dispatch?.('core/commands')?.open) {
        add('commands', strings.openCommands, '', 'command', () => commands.dispatch('core/commands').open());
      }
    };

    shared.create({
      id: 'ra-palette',
      strings,
      order: ['create', 'navigate', 'tools', 'site', 'account', 'commands'],
      index,
      trigger
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
