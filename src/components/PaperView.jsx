import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';
import confetti from 'canvas-confetti';
import { playPop, playScratch, playChime, playCrumple } from '../lib/sound.js';
import {
  BookmarkIcon,
  PencilIcon,
  TrashIcon,
  XIcon,
  PlusIcon,
  StarIcon
} from './Icons.jsx';

export function PaperView({ list, role, onApplyOps }) {
  const isViewOnly = role === 'view';
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [quickAddCatId, setQuickAddCatId] = useState(null);
  const [quickAddText, setQuickAddText] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [newTopNoteText, setNewTopNoteText] = useState('');
  const [showAddTopNote, setShowAddTopNote] = useState(false);

  const activeItems = (list.items || []).filter(i => !i.deleted);
  const topNotes = activeItems.filter(i => i.type === 'note' && !i.parentId);
  const categories = activeItems.filter(i => i.type === 'category');
  const orphanTodos = activeItems.filter(i => i.type === 'todo' && !i.parentId);

  const toggleCollapse = (catId) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const handleToggleCheck = (todo) => {
    if (isViewOnly) return;
    const newDone = !todo.done;

    if (newDone) {
      playPop();
    } else {
      playScratch();
    }

    onApplyOps([
      {
        op: 'check_item',
        id: todo.id,
        done: newDone,
        completedAt: newDone ? Date.now() : null,
        updatedAt: Date.now()
      }
    ]);

    // Check if this completion finished the entire category
    if (newDone && todo.parentId) {
      const siblings = activeItems.filter(i => i.parentId === todo.parentId && i.type === 'todo');
      const otherUnfinished = siblings.filter(i => i.id !== todo.id && !i.done);
      if (otherUnfinished.length === 0 && siblings.length > 0) {
        // Confetti celebration!
        playChime();
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
          });
        } catch (e) {}
      }
    }
  };

  const handleStartEdit = (item) => {
    if (isViewOnly) return;
    setEditingId(item.id);
    setEditingText(item.text);
  };

  const handleSaveEdit = (item) => {
    if (editingText.trim() && editingText.trim() !== item.text) {
      onApplyOps([
        {
          op: 'edit_item',
          id: item.id,
          text: editingText.trim(),
          updatedAt: Date.now()
        }
      ]);
      playScratch();
    }
    setEditingId(null);
  };

  const handleDeleteItem = (id) => {
    if (isViewOnly) return;
    playCrumple();
    onApplyOps([
      {
        op: 'delete_item',
        id,
        updatedAt: Date.now()
      }
    ]);
  };

  const handleQuickAdd = (categoryId) => {
    if (isViewOnly || !quickAddText.trim()) return;
    const newId = 'todo_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    onApplyOps([
      {
        op: 'add_item',
        item: {
          id: newId,
          type: 'todo',
          text: quickAddText.trim(),
          done: false,
          parentId: categoryId,
          order: activeItems.length,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      }
    ]);
    playScratch();
    setQuickAddText('');
  };

  const handleAddCategory = () => {
    if (isViewOnly || !newCatName.trim()) return;
    const newId = 'cat_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    onApplyOps([
      {
        op: 'add_category',
        item: {
          id: newId,
          type: 'category',
          text: newCatName.trim(),
          order: activeItems.length,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      }
    ]);
    playScratch();
    setNewCatName('');
    setShowAddCat(false);
  };

  const handleAddTopNote = () => {
    if (isViewOnly || !newTopNoteText.trim()) return;
    const newId = 'note_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    onApplyOps([
      {
        op: 'add_item',
        item: {
          id: newId,
          type: 'note',
          text: newTopNoteText.trim(),
          parentId: null,
          order: activeItems.length,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      }
    ]);
    playScratch();
    setNewTopNoteText('');
    setShowAddTopNote(false);
  };

  return (
    <div class="paper-sheet">
      {/* 3 Punched holes */}
      <div class="paper-hole top" />
      <div class="paper-hole middle" />
      <div class="paper-hole bottom" />

      {/* Header & Title */}
      <div class="paper-header">
        <div class="title-row">
          <input
            class="paper-title"
            value={list.title || 'Untitled Todo'}
            disabled={isViewOnly}
            onChange={(e) => {
              if (!isViewOnly) {
                onApplyOps([
                  { op: 'update_title', title: e.target.value, updatedAt: Date.now() }
                ]);
              }
            }}
          />
        </div>
      </div>

      {/* Top Level Sticky Notes */}
      <div class="top-notes-section">
        {topNotes.map(note => (
          <div key={note.id} class="sticky-note">
            <span class="sticky-pin" />
            {editingId === note.id ? (
              <input
                autoFocus
                class="quick-add-input"
                value={editingText}
                onChange={e => setEditingText(e.target.value)}
                onBlur={() => handleSaveEdit(note)}
                onKeyDown={e => e.key === 'Enter' && handleSaveEdit(note)}
              />
            ) : (
              <span onDblClick={() => handleStartEdit(note)}># {note.text}</span>
            )}
            {!isViewOnly && (
              <button
                class="icon-btn danger"
                onClick={() => handleDeleteItem(note.id)}
                title="Delete note"
                style={{ padding: '2px' }}
              >
                <XIcon size={13} />
              </button>
            )}
          </div>
        ))}

        {!isViewOnly && (
          <div>
            {showAddTopNote ? (
              <div style={{ display: 'flex', gap: '8px', maxWidth: '360px', marginTop: '6px' }}>
                <input
                  autoFocus
                  placeholder="Sticky note text…"
                  class="quick-add-input"
                  value={newTopNoteText}
                  onChange={e => setNewTopNoteText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTopNote()}
                />
                <button class="action-pill-btn" onClick={handleAddTopNote}>Add</button>
                <button class="icon-btn" onClick={() => setShowAddTopNote(false)}><XIcon size={14} /></button>
              </div>
            ) : (
              <button
                class="icon-btn"
                onClick={() => setShowAddTopNote(true)}
                style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <BookmarkIcon size={14} /> Add sticky note
              </button>
            )}
          </div>
        )}
      </div>

      {/* Orphan Todos (if no categories yet) */}
      {orphanTodos.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          {orphanTodos.map(todo => renderTodoRow(todo))}
        </div>
      )}

      {/* Categories */}
      {categories.map(cat => {
        const isCollapsed = collapsedCategories.has(cat.id);
        const catChildren = activeItems.filter(i => i.parentId === cat.id);
        const catTodos = catChildren.filter(i => i.type === 'todo');
        const doneTodos = catTodos.filter(i => i.done);
        const allDone = catTodos.length > 0 && doneTodos.length === catTodos.length;

        return (
          <div key={cat.id} class="category-block">
            <div class="category-header" onClick={() => toggleCollapse(cat.id)}>
              <div class="category-title-group">
                <span class={`category-arrow ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
                {editingId === cat.id ? (
                  <input
                    autoFocus
                    class="quick-add-input"
                    style={{ fontFamily: 'var(--hand-font)', fontSize: '1.6rem', fontWeight: 'bold' }}
                    value={editingText}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setEditingText(e.target.value)}
                    onBlur={() => handleSaveEdit(cat)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(cat)}
                  />
                ) : (
                  <span
                    class="category-name"
                    onDblClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(cat);
                    }}
                  >
                    + {cat.text}
                  </span>
                )}

                {catTodos.length > 0 && (
                  <span class={`category-progress-pill ${allDone ? 'completed' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {doneTodos.length}/{catTodos.length} {allDone && <StarIcon size={12} />}
                  </span>
                )}
              </div>

              {!isViewOnly && (
                <div class="todo-actions" onClick={e => e.stopPropagation()}>
                  <button
                    class="icon-btn"
                    title="Edit category name"
                    onClick={() => handleStartEdit(cat)}
                  >
                    <PencilIcon size={15} />
                  </button>
                  <button
                    class="icon-btn danger"
                    title="Delete category"
                    onClick={() => handleDeleteItem(cat.id)}
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Category Children */}
            <div class={`category-items ${isCollapsed ? 'collapsed' : ''}`}>
              {catChildren.map(child => {
                if (child.type === 'note') {
                  return (
                    <div key={child.id} class="sticky-note" style={{ marginLeft: '12px' }}>
                      <span class="sticky-pin" />
                      {editingId === child.id ? (
                        <input
                          autoFocus
                          class="quick-add-input"
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          onBlur={() => handleSaveEdit(child)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit(child)}
                        />
                      ) : (
                        <span onDblClick={() => handleStartEdit(child)}># {child.text}</span>
                      )}
                      {!isViewOnly && (
                        <button
                          class="icon-btn danger"
                          onClick={() => handleDeleteItem(child.id)}
                        >
                          <XIcon size={13} />
                        </button>
                      )}
                    </div>
                  );
                }
                return renderTodoRow(child);
              })}

              {/* Quick Add under Category */}
              {!isViewOnly && (
                <div class="quick-add-form">
                  <span style={{ color: 'var(--text-muted)' }}>- [ ]</span>
                  <input
                    placeholder="Add task under this category…"
                    class="quick-add-input"
                    value={quickAddCatId === cat.id ? quickAddText : ''}
                    onFocus={() => setQuickAddCatId(cat.id)}
                    onChange={(e) => {
                      setQuickAddCatId(cat.id);
                      setQuickAddText(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleQuickAdd(cat.id);
                      }
                    }}
                  />
                  {quickAddCatId === cat.id && quickAddText.trim() && (
                    <button class="action-pill-btn" onClick={() => handleQuickAdd(cat.id)}>
                      Add
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Add New Category button */}
      {!isViewOnly && (
        <div style={{ marginTop: '24px' }}>
          {showAddCat ? (
            <div style={{ display: 'flex', gap: '8px', maxWidth: '360px' }}>
              <input
                autoFocus
                placeholder="Category name…"
                class="quick-add-input"
                style={{ fontFamily: 'var(--hand-font)', fontSize: '1.3rem' }}
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              />
              <button class="action-pill-btn" onClick={handleAddCategory}>Add Category</button>
              <button class="icon-btn" onClick={() => setShowAddCat(false)}><XIcon size={14} /></button>
            </div>
          ) : (
            <button
              class="action-pill-btn"
              onClick={() => setShowAddCat(true)}
              style={{ border: '1px dashed var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusIcon size={15} /> Add Category Section
            </button>
          )}
        </div>
      )}
    </div>
  );

  function renderTodoRow(todo) {
    const isEditing = editingId === todo.id;

    return (
      <div key={todo.id} class="todo-row">
        <div class="todo-left">
          <button
            class={`hand-checkbox ${todo.done ? 'checked' : ''}`}
            disabled={isViewOnly}
            onClick={() => handleToggleCheck(todo)}
            title={todo.done ? 'Mark incomplete' : 'Mark complete'}
          >
            {todo.done && (
              <svg class="check-mark" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          {isEditing ? (
            <input
              autoFocus
              class="quick-add-input"
              value={editingText}
              onChange={e => setEditingText(e.target.value)}
              onBlur={() => handleSaveEdit(todo)}
              onKeyDown={e => e.key === 'Enter' && handleSaveEdit(todo)}
            />
          ) : (
            <span
              class={`todo-text ${todo.done ? 'done' : ''}`}
              onClick={() => handleToggleCheck(todo)}
              onDblClick={(e) => {
                e.stopPropagation();
                handleStartEdit(todo);
              }}
            >
              {todo.text}
              {todo.done && (
                <svg class="strike-line" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path class="strike-path" d="M 0 5 Q 50 2, 100 6" />
                </svg>
              )}
            </span>
          )}
        </div>

        {!isViewOnly && (
          <div class="todo-actions">
            <button
              class="icon-btn"
              title="Edit task"
              onClick={() => handleStartEdit(todo)}
            >
              <PencilIcon size={15} />
            </button>
            <button
              class="icon-btn danger"
              title="Delete task"
              onClick={() => handleDeleteItem(todo.id)}
            >
              <TrashIcon size={15} />
            </button>
          </div>
        )}
      </div>
    );
  }
}
