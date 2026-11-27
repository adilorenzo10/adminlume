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
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
    const byId = id => document.getElementById(`wp-admin-bar-${id}`);
    const submenuOf = node => node?.querySelector(':scope > .ab-sub-wrapper > .ab-submenu');

    body.classList.add('ra-topbar-ready');

    // Static nodes are not menu items; keep the toolbar's semantics honest.
    for (const id of ['adminlume-breadcrumb', 'adminlume-environment', 'adminlume-search']) {
      byId(id)?.querySelector(':scope > .ab-item')?.removeAttribute('role');
    }
    const trigger = searchNode.querySelector('.ra-search-trigger');
    const triggerKbd = searchNode.querySelector('.ra-search-kbd');
    if (mac && triggerKbd) triggerKbd.textContent = '⌘K';

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

    /* Command palette. */
    const normalize = value => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
    const cleanText = element => {
      if (!element) return '';
      const copy = element.cloneNode(true);
      copy.querySelectorAll('.awaiting-mod, .update-plugins, .count, .plugin-count, .pending-count, .screen-reader-text, .ab-label[aria-hidden="true"], .wp-admin-bar-arrow').forEach(child => child.remove());
      return copy.textContent.replace(/\s+/g, ' ').trim();
    };
    const usable = link => link && link.getAttribute('href') && (link.getAttribute('href') !== '#' || link.onclick || link.hasAttribute('onclick'));

    const buildIndex = () => {
      const items = [];
      const seen = new Set();
      const add = (groupKey, label, context, kind, run, deep = false) => {
        if (!label) return;
        const key = `${groupKey}|${label}|${context}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({ group: groupKey, label, context, kind, run, deep, haystack: normalize(`${label} ${context} ${strings[groupKey] || ''}`) });
      };

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

      const status = submenuOf(notifications);
      status?.querySelectorAll(':scope > li:not(#wp-admin-bar-adminlume-notifications-footer) > a.ab-item').forEach(link => {
        const label = link.querySelector('.screen-reader-text')?.textContent.trim() || cleanText(link);
        if (usable(link)) add('tools', label, '', 'tool', () => link.click());
      });
      const moreList = submenuOf(more);
      moreList?.querySelectorAll(':scope > li:not(#wp-admin-bar-adminlume-more-heading)').forEach(node => {
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
      return items;
    };

    const order = ['create', 'navigate', 'tools', 'site', 'account', 'commands'];
    const rank = (item, query) => {
      const label = normalize(item.label);
      if (label.startsWith(query)) return 0;
      if (label.split(' ').some(word => word.startsWith(query))) return 1;
      if (label.includes(query)) return 2;
      return 3;
    };

    const element = (tag, attributes = {}, text = '') => {
      const node = document.createElement(tag);
      for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
      if (text) node.textContent = text;
      return node;
    };

    const palette = element('div', { class: 'ra-palette', hidden: '' });
    const backdrop = element('div', { class: 'ra-palette-backdrop' });
    const dialog = element('div', { class: 'ra-palette-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': strings.title });
    const field = element('div', { class: 'ra-palette-field' });
    const inputLabel = element('label', { class: 'screen-reader-text', for: 'ra-palette-input' }, strings.placeholder);
    const input = element('input', {
      id: 'ra-palette-input',
      class: 'ra-palette-input',
      type: 'text',
      role: 'combobox',
      autocomplete: 'off',
      spellcheck: 'false',
      'aria-autocomplete': 'list',
      'aria-expanded': 'true',
      'aria-controls': 'ra-palette-list',
      placeholder: strings.placeholder
    });
    const escKey = element('kbd', { 'aria-hidden': 'true' }, 'Esc');
    const list = element('ul', { id: 'ra-palette-list', class: 'ra-palette-list', role: 'listbox', 'aria-label': strings.results });
    const empty = element('p', { class: 'ra-palette-empty', hidden: '' });
    const live = element('p', { class: 'screen-reader-text', role: 'status', 'aria-live': 'polite' });
    const footer = element('p', { class: 'ra-palette-footer', 'aria-hidden': 'true' });
    for (const [keys, hint] of [['↑↓', strings.move], ['↵', strings.open], ['Esc', strings.close]]) {
      const hintNode = element('span');
      hintNode.append(element('kbd', {}, keys), document.createTextNode(` ${hint}`));
      footer.append(hintNode);
    }
    field.append(inputLabel, input, escKey);
    dialog.append(field, list, empty, live, footer);
    palette.append(backdrop, dialog);
    body.append(palette);

    let index = [];
    let visible = [];
    let active = 0;
    let returnFocus = null;
    let announce = 0;

    const setActive = next => {
      if (!visible.length) {
        input.removeAttribute('aria-activedescendant');
        return;
      }
      active = (next + visible.length) % visible.length;
      visible.forEach((item, position) => item.node.setAttribute('aria-selected', position === active ? 'true' : 'false'));
      const current = visible[active].node;
      input.setAttribute('aria-activedescendant', current.id);
      current.scrollIntoView({ block: 'nearest' });
    };

    const render = () => {
      const query = normalize(input.value);
      const tokens = query ? query.split(' ') : [];
      const matches = index
        .filter(item => (tokens.length ? tokens.every(token => item.haystack.includes(token)) : !item.deep))
        .map(item => ({ item, score: query ? rank(item, query) : 0 }));
      const groups = order
        .map(key => ({ key, entries: matches.filter(match => match.item.group === key).sort((a, b) => a.score - b.score) }))
        .filter(groupEntry => groupEntry.entries.length);
      if (query) groups.sort((a, b) => a.entries[0].score - b.entries[0].score);

      list.replaceChildren();
      visible = [];
      let count = 0;
      for (const { key, entries } of groups) {
        const wrapper = element('li', { role: 'presentation' });
        const heading = element('div', { id: `ra-palette-group-${key}`, class: 'ra-palette-heading', 'aria-hidden': 'true' }, strings[key] || key);
        const groupList = element('ul', { class: 'ra-palette-group', role: 'group', 'aria-labelledby': heading.id });
        for (const { item } of entries) {
          const option = element('li', { id: `ra-palette-option-${count}`, class: 'ra-palette-option', role: 'option', 'aria-selected': 'false' });
          option.append(
            element('span', { class: `ra-palette-glyph ra-glyph-${item.kind}`, 'aria-hidden': 'true' }),
            element('span', { class: 'ra-palette-label' }, item.label)
          );
          if (item.context) option.append(element('span', { class: 'ra-palette-context' }, item.context));
          const position = count;
          option.addEventListener('mousemove', () => { if (active !== position) setActive(position); });
          option.addEventListener('mousedown', event => event.preventDefault());
          option.addEventListener('click', () => run(position));
          groupList.append(option);
          visible.push({ item, node: option });
          count++;
        }
        wrapper.append(heading, groupList);
        list.append(wrapper);
      }

      empty.hidden = count > 0;
      list.hidden = count === 0;
      empty.textContent = strings.empty.replace('%s', input.value.trim());
      clearTimeout(announce);
      announce = setTimeout(() => {
        live.textContent = count ? strings.count.replace('%d', String(count)) : empty.textContent;
      }, 350);
      setActive(0);
    };

    const isOpen = () => !palette.hidden;

    const open = () => {
      if (isOpen()) return;
      returnFocus = document.activeElement;
      index = buildIndex();
      input.value = '';
      palette.hidden = false;
      trigger?.setAttribute('aria-expanded', 'true');
      render();
      input.focus();
    };

    const close = (restore = true) => {
      if (!isOpen()) return;
      palette.hidden = true;
      trigger?.setAttribute('aria-expanded', 'false');
      clearTimeout(announce);
      live.textContent = '';
      if (restore && returnFocus?.isConnected) returnFocus.focus();
      returnFocus = null;
    };

    const run = position => {
      const entry = visible[position];
      if (!entry) return;
      close(entry.item.kind !== 'command');
      entry.item.run();
    };

    input.addEventListener('input', render);
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive(active + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive(active - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        run(active);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else if (event.key === 'Tab') {
        // The field is the dialog's only focus stop; options are reached with arrows.
        event.preventDefault();
      }
    });
    backdrop.addEventListener('click', () => close());
    trigger?.setAttribute('aria-expanded', 'false');
    trigger?.setAttribute('aria-controls', 'ra-palette-input');
    trigger?.addEventListener('click', open);

    window.addEventListener('keydown', event => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'k') return;
      const target = event.target;
      if (target instanceof HTMLElement && target.isContentEditable) return;
      if (!isOpen() && document.activeElement?.closest('[role="dialog"], .media-modal')) return;
      event.preventDefault();
      event.stopPropagation();
      if (isOpen()) close();
      else open();
    }, { capture: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
