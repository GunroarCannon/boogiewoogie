/**
 * Parser and Serializer for Lined Paper Todo format
 * 
 * Syntax:
 * TODO: Title
 * # Top level note
 * + Category Name
 * # Category note
 * - [ ] Unchecked todo
 * - [x] Completed todo
 * - Simple todo without brackets (defaults to unchecked)
 */

function generateId() {
  return 'item_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
}

/**
 * Normalizes input text: converts CRLF to LF, converts tabs to spaces, trims blank lines at extremes.
 */
export function normalizeText(raw) {
  if (!raw) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ');
}

/**
 * Parses raw todo text into structured list object.
 * @param {string} text 
 * @param {object} [existingList] - optional existing list to preserve IDs and timestamps
 * @returns {object} { title, items: Array<Item>, warnings: Array<string> }
 */
export function parseTodoList(text, existingList = null) {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n');
  const warnings = [];
  
  let title = 'Untitled';
  let titleFound = false;
  let currentCategoryId = null;
  const items = [];
  let orderCounter = 0;

  // Track existing items map by text & type for reconciliation
  const existingMap = new Map();
  if (existingList && Array.isArray(existingList.items)) {
    for (const item of existingList.items) {
      const key = `${item.type}:${item.text}`;
      if (!existingMap.has(key)) {
        existingMap.set(key, []);
      }
      existingMap.get(key).push(item);
    }
  }

  function matchExisting(type, text, parentId) {
    const key = `${type}:${text}`;
    const matches = existingMap.get(key);
    if (matches && matches.length > 0) {
      // Find matching parent if possible
      const parentMatchIdx = matches.findIndex(m => m.parentId === parentId);
      const idx = parentMatchIdx >= 0 ? parentMatchIdx : 0;
      return matches.splice(idx, 1)[0];
    }
    return null;
  }

  let lineIndex = 0;
  let previousItem = null;

  while (lineIndex < lines.length) {
    const originalLine = lines[lineIndex];
    const trimmed = originalLine.trim();
    lineIndex++;

    // Ignore completely empty lines
    if (!trimmed) {
      continue;
    }

    // Check for title: TODO: Title or if first non-empty line doesn't start with prefix
    if (!titleFound) {
      const todoTitleMatch = trimmed.match(/^TODO:\s*(.*)$/i);
      if (todoTitleMatch) {
        title = todoTitleMatch[1].trim() || 'Untitled';
        titleFound = true;
        continue;
      } else if (!trimmed.startsWith('+') && !trimmed.startsWith('-') && !trimmed.startsWith('#')) {
        // First line as title if not prefixed
        title = trimmed;
        titleFound = true;
        continue;
      } else {
        // First line was a note or item or category, default title
        title = existingList?.title || 'Untitled';
        titleFound = true;
      }
    }

    // Indented continuation line attached to previous item
    if ((originalLine.startsWith('  ') || originalLine.startsWith('\t')) && previousItem && !trimmed.startsWith('+') && !trimmed.startsWith('-') && !trimmed.startsWith('#')) {
      previousItem.text += '\n' + trimmed;
      previousItem.updatedAt = Date.now();
      continue;
    }

    // Handle escaped prefixes like \+, \-, \#
    let processLine = trimmed;
    let isEscaped = false;
    if (processLine.startsWith('\\')) {
      processLine = processLine.substring(1);
      isEscaped = true;
    }

    // 1. Category: starts with '+'
    if (!isEscaped && processLine.startsWith('+')) {
      const catText = processLine.substring(1).trim();
      const existing = matchExisting('category', catText, null);
      const categoryId = existing ? existing.id : generateId();
      
      const categoryItem = {
        id: categoryId,
        type: 'category',
        text: catText,
        done: false,
        parentId: null,
        order: orderCounter++,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
        completedAt: null
      };

      currentCategoryId = categoryId;
      items.push(categoryItem);
      previousItem = categoryItem;
      continue;
    }

    // 2. Note: starts with '#'
    if (!isEscaped && processLine.startsWith('#')) {
      const noteText = processLine.substring(1).trim();
      const existing = matchExisting('note', noteText, currentCategoryId);
      
      const noteItem = {
        id: existing ? existing.id : generateId(),
        type: 'note',
        text: noteText,
        done: false,
        parentId: currentCategoryId,
        order: orderCounter++,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
        completedAt: null
      };

      items.push(noteItem);
      previousItem = noteItem;
      continue;
    }

    // 3. Todo item: starts with '-'
    if (!isEscaped && processLine.startsWith('-')) {
      const rest = processLine.substring(1).trim();
      let done = false;
      let todoText = rest;

      // Check for - [x] or - [X] or - [ ]
      const checkboxMatch = rest.match(/^\[([ xX])\]\s*(.*)$/);
      if (checkboxMatch) {
        done = checkboxMatch[1].toLowerCase() === 'x';
        todoText = checkboxMatch[2].trim();
      } else {
        // Plain - text counts as unchecked todo
        done = false;
        todoText = rest;
      }

      // Check for unescape inside todo text
      if (todoText.startsWith('\\#') || todoText.startsWith('\\+') || todoText.startsWith('\\-')) {
        todoText = todoText.substring(1);
      }

      const existing = matchExisting('todo', todoText, currentCategoryId);
      const isNowDone = done;
      const wasDone = existing ? existing.done : false;

      let completedAt = existing?.completedAt || null;
      if (isNowDone && !wasDone) {
        completedAt = Date.now();
      } else if (!isNowDone) {
        completedAt = null;
      }

      const todoItem = {
        id: existing ? existing.id : generateId(),
        type: 'todo',
        text: todoText,
        done: isNowDone,
        parentId: currentCategoryId,
        order: orderCounter++,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
        completedAt: completedAt
      };

      items.push(todoItem);
      previousItem = todoItem;
      continue;
    }

    // 4. Catch-all: Any unknown line becomes a note so nothing is ever dropped!
    warnings.push(`Line "${trimmed}" was treated as a note because it lacked a standard prefix (+, -, #).`);
    const existing = matchExisting('note', trimmed, currentCategoryId);
    const fallbackNote = {
      id: existing ? existing.id : generateId(),
      type: 'note',
      text: trimmed,
      done: false,
      parentId: currentCategoryId,
      order: orderCounter++,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      completedAt: null
    };

    items.push(fallbackNote);
    previousItem = fallbackNote;
  }

  return {
    title: title || 'Untitled',
    items,
    warnings
  };
}

/**
 * Serializes list structure back to raw text.
 * @param {object} list { title, items }
 * @returns {string}
 */
export function serializeTodoList(list) {
  if (!list) return '';
  const lines = [];

  lines.push(`TODO: ${list.title || 'Untitled'}`);

  const items = Array.isArray(list.items) ? [...list.items].filter(i => !i.deleted) : [];
  items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Top level notes (parentId === null and type === 'note')
  const topNotes = items.filter(i => i.type === 'note' && !i.parentId);
  for (const note of topNotes) {
    const escaped = escapePrefix(note.text);
    lines.push(`# ${escaped}`);
  }

  // Categories and their children
  const categories = items.filter(i => i.type === 'category');
  
  // If there are todos/notes without a category, output them under an implied or direct section
  const orphanItems = items.filter(i => !i.parentId && i.type === 'todo');
  if (orphanItems.length > 0 && categories.length > 0) {
    for (const item of orphanItems) {
      const marker = item.done ? '[x]' : '[ ]';
      lines.push(`- ${marker} ${escapePrefix(item.text)}`);
    }
  }

  for (const cat of categories) {
    lines.push('');
    lines.push(`+ ${escapePrefix(cat.text)}`);
    
    // Find children in order
    const children = items.filter(i => i.parentId === cat.id);
    for (const child of children) {
      if (child.type === 'note') {
        lines.push(`# ${escapePrefix(child.text)}`);
      } else if (child.type === 'todo') {
        const marker = child.done ? '[x]' : '[ ]';
        lines.push(`- ${marker} ${escapePrefix(child.text)}`);
      }
    }
  }

  // If there are no categories at all, output all todos directly
  if (categories.length === 0) {
    for (const item of items) {
      if (item.type === 'todo') {
        const marker = item.done ? '[x]' : '[ ]';
        lines.push(`- ${marker} ${escapePrefix(item.text)}`);
      }
    }
  }

  return lines.join('\n');
}

function escapePrefix(str) {
  if (!str) return '';
  if (str.startsWith('#') || str.startsWith('+')) {
    return '\\' + str;
  }
  return str;
}
