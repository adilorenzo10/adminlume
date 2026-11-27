/*
 * Adminlume command palette, shared by the admin workspace header and the
 * front-end dock. It only indexes links and actions supplied by the caller,
 * builds its DOM with DOM APIs (no HTML strings), and follows the ARIA
 * combobox/listbox pattern with aria-activedescendant.
 */
(() => {
  const normalize = value => String(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();

  /** Visible text of a link without counters, screen-reader copies, or arrows. */
  const cleanText = element => {
    if (!element) return '';
    const copy = element.cloneNode(true);
    copy.querySelectorAll('.awaiting-mod, .update-plugins, .count, .plugin-count, .pending-count, .screen-reader-text, .ab-label[aria-hidden="true"], .wp-admin-bar-arrow').forEach(child => child.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  };

  /** Links with a destination or a native click handler. */
  const usable = link => Boolean(link && link.getAttribute('href') && (link.getAttribute('href') !== '#' || link.onclick || link.hasAttribute('onclick')));

  const element = (tag, attributes = {}, text = '') => {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    if (text) node.textContent = text;
    return node;
  };

  /**
   * Create a palette.
   *
   * @param {object}   config
   * @param {object}   config.strings    Localized labels.
   * @param {string[]} config.order      Group keys in display order.
   * @param {Function} config.index      Returns the static entries when the palette opens.
   * @param {Function} [config.dynamic]  Returns extra entries for a non-empty query.
   * @param {Element}  [config.trigger]  Button that opens the palette.
   * @param {string}   config.id         Unique prefix for element IDs.
   */
  const create = config => {
    const strings = config.strings;
    const id = config.id;
    const items = () => {
      const entries = [];
      const seen = new Set();
      const add = (group, label, context, kind, run, deep = false) => {
        if (!label) return;
        const key = `${group}|${label}|${context}`;
        if (seen.has(key)) return;
        seen.add(key);
        entries.push({ group, label, context, kind, run, deep, haystack: normalize(`${label} ${context} ${strings[group] || ''}`) });
      };
      config.index(add);
      return entries;
    };

    const rank = (item, query) => {
      const label = normalize(item.label);
      if (label.startsWith(query)) return 0;
      if (label.split(' ').some(word => word.startsWith(query))) return 1;
      if (label.includes(query)) return 2;
      return 3;
    };

    const palette = element('div', { class: 'ra-palette', hidden: '' });
    const backdrop = element('div', { class: 'ra-palette-backdrop' });
    const dialog = element('div', { class: 'ra-palette-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': strings.title });
    const field = element('div', { class: 'ra-palette-field' });
    const inputLabel = element('label', { class: 'screen-reader-text', for: `${id}-input` }, strings.placeholder);
    const input = element('input', {
      id: `${id}-input`,
      class: 'ra-palette-input',
      type: 'text',
      role: 'combobox',
      autocomplete: 'off',
      spellcheck: 'false',
      'aria-autocomplete': 'list',
      'aria-expanded': 'true',
      'aria-controls': `${id}-list`,
      placeholder: strings.placeholder
    });
    const escKey = element('kbd', { 'aria-hidden': 'true' }, 'Esc');
    const list = element('ul', { id: `${id}-list`, class: 'ra-palette-list', role: 'listbox', 'aria-label': strings.results });
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
    document.body.append(palette);

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
      visible.forEach((entry, position) => entry.node.setAttribute('aria-selected', position === active ? 'true' : 'false'));
      const current = visible[active].node;
      input.setAttribute('aria-activedescendant', current.id);
      current.scrollIntoView({ block: 'nearest' });
    };

    const render = () => {
      const raw = input.value.trim();
      const query = normalize(raw);
      const tokens = query ? query.split(' ') : [];
      const matches = index
        .filter(item => (tokens.length ? tokens.every(token => item.haystack.includes(token)) : !item.deep))
        .map(item => ({ item, score: query ? rank(item, query) : 0 }));
      if (query && config.dynamic) {
        // Query actions (such as site search) always match and rank last.
        for (const item of config.dynamic(raw)) matches.push({ item, score: 4 });
      }
      const groups = config.order
        .map(key => ({ key, entries: matches.filter(match => match.item.group === key).sort((a, b) => a.score - b.score) }))
        .filter(entry => entry.entries.length);
      if (query) groups.sort((a, b) => a.entries[0].score - b.entries[0].score);

      list.replaceChildren();
      visible = [];
      let count = 0;
      for (const { key, entries } of groups) {
        const wrapper = element('li', { role: 'presentation' });
        const heading = element('div', { id: `${id}-group-${key}`, class: 'ra-palette-heading', 'aria-hidden': 'true' }, strings[key] || key);
        const groupList = element('ul', { class: 'ra-palette-group', role: 'group', 'aria-labelledby': heading.id });
        for (const { item } of entries) {
          const option = element('li', { id: `${id}-option-${count}`, class: 'ra-palette-option', role: 'option', 'aria-selected': 'false' });
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
      empty.textContent = strings.empty.replace('%s', raw);
      clearTimeout(announce);
      announce = setTimeout(() => {
        const total = count === 1 && strings.countOne ? strings.countOne : strings.count.replace('%d', String(count));
        live.textContent = count ? total : empty.textContent;
      }, 350);
      setActive(0);
    };

    const isOpen = () => !palette.hidden;

    const open = () => {
      if (isOpen()) return;
      returnFocus = document.activeElement;
      index = items();
      input.value = '';
      palette.hidden = false;
      config.trigger?.setAttribute('aria-expanded', 'true');
      render();
      input.focus();
    };

    const close = (restore = true) => {
      if (!isOpen()) return;
      palette.hidden = true;
      config.trigger?.setAttribute('aria-expanded', 'false');
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
    if (config.trigger) {
      config.trigger.setAttribute('aria-expanded', 'false');
      config.trigger.setAttribute('aria-controls', input.id);
      config.trigger.addEventListener('click', open);
    }

    window.addEventListener('keydown', event => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'k') return;
      const target = event.target;
      if (target instanceof HTMLElement && target.isContentEditable) return;
      if (!isOpen() && document.activeElement?.closest('[role="dialog"], .media-modal')) return;
      if (config.enabled && !config.enabled()) return;
      event.preventDefault();
      event.stopPropagation();
      if (isOpen()) close();
      else open();
    }, { capture: true });

    return { open, close, isOpen };
  };

  window.adminlumePalette = { create, normalize, cleanText, usable, isMac: /Mac|iPhone|iPad/.test(navigator.platform) };
})();
