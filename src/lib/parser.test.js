import { describe, it, expect } from 'vitest';
import { parseTodoList, serializeTodoList, normalizeText } from './parser.js';

describe('Parser and Serializer', () => {
  it('parses the FOWL PLAY example accurately', () => {
    const raw = `TODO: FOWL PLAY
# note
+ Category
- [ ] todo
- [x] done todo`;

    const parsed = parseTodoList(raw);
    expect(parsed.title).toBe('FOWL PLAY');
    expect(parsed.items).toHaveLength(4);
    
    // Top note
    expect(parsed.items[0].type).toBe('note');
    expect(parsed.items[0].text).toBe('note');
    expect(parsed.items[0].parentId).toBeNull();

    // Category
    expect(parsed.items[1].type).toBe('category');
    expect(parsed.items[1].text).toBe('Category');
    const catId = parsed.items[1].id;

    // Unchecked todo
    expect(parsed.items[2].type).toBe('todo');
    expect(parsed.items[2].text).toBe('todo');
    expect(parsed.items[2].done).toBe(false);
    expect(parsed.items[2].parentId).toBe(catId);

    // Done todo
    expect(parsed.items[3].type).toBe('todo');
    expect(parsed.items[3].text).toBe('done todo');
    expect(parsed.items[3].done).toBe(true);
    expect(parsed.items[3].parentId).toBe(catId);
  });

  it('serializes and round-trips cleanly', () => {
    const raw = `TODO: FOWL PLAY
# note

+ Category
- [ ] todo
- [x] done todo`;

    const parsed = parseTodoList(raw);
    const serialized = serializeTodoList(parsed);
    const roundTripped = parseTodoList(serialized);

    expect(roundTripped.title).toBe('FOWL PLAY');
    expect(roundTripped.items.map(i => ({ type: i.type, text: i.text, done: i.done })))
      .toEqual(parsed.items.map(i => ({ type: i.type, text: i.text, done: i.done })));
  });

  it('treats plain "- item" as unchecked todo', () => {
    const raw = `TODO: Plain Items
- first item
- second item`;
    const parsed = parseTodoList(raw);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0].done).toBe(false);
    expect(parsed.items[0].text).toBe('first item');
    expect(parsed.items[1].done).toBe(false);
    expect(parsed.items[1].text).toBe('second item');
  });

  it('turns unknown prefixes into notes so nothing is dropped', () => {
    const raw = `TODO: Fallback
Something random without prefix
Another odd line`;
    const parsed = parseTodoList(raw);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0].type).toBe('note');
    expect(parsed.items[0].text).toBe('Something random without prefix');
    expect(parsed.warnings.length).toBeGreaterThan(0);
  });

  it('normalizes CRLF, tabs, and trims whitespace', () => {
    const raw = "TODO: Spaces\r\n\t+ Design\r\n\t- [ ] Make logo   \r\n";
    const parsed = parseTodoList(raw);
    expect(parsed.title).toBe('Spaces');
    expect(parsed.items[0].text).toBe('Design');
    expect(parsed.items[1].text).toBe('Make logo');
  });

  it('handles continuation lines', () => {
    const raw = `TODO: Multiline
+ Work
- [ ] Main task description
  which continues on this line
  and even this one`;
    const parsed = parseTodoList(raw);
    expect(parsed.items[1].text).toContain('Main task description\nwhich continues on this line\nand even this one');
  });

  it('handles escaped prefixes with backslash', () => {
    const raw = `TODO: Escaped
+ Category
- [ ] \\#not a note
\\# standalone line starting with hash`;
    const parsed = parseTodoList(raw);
    expect(parsed.items[1].text).toBe('#not a note');
  });

  it('preserves existing IDs and timestamps during re-parse', () => {
    const existing = {
      title: 'Existing List',
      items: [
        { id: 'cat_1', type: 'category', text: 'Work', done: false, parentId: null, createdAt: 1000 },
        { id: 'todo_1', type: 'todo', text: 'Task 1', done: false, parentId: 'cat_1', createdAt: 1050 }
      ]
    };

    const updatedRaw = `TODO: Existing List
+ Work
- [x] Task 1
- [ ] Task 2`;

    const parsed = parseTodoList(updatedRaw, existing);
    expect(parsed.items[0].id).toBe('cat_1');
    expect(parsed.items[1].id).toBe('todo_1');
    expect(parsed.items[1].done).toBe(true);
    expect(parsed.items[1].completedAt).toBeGreaterThan(0);
    expect(parsed.items[2].id).not.toBe('todo_1');
  });
});
