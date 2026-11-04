import { h } from 'preact';
import { useState } from 'preact/hooks';
import { playPop, playScratch } from '../lib/sound.js';
import {
  ChartIcon,
  SitemapIcon,
  StarIcon,
  NotebookIcon,
  CircleCheckIcon,
  CircleIcon
} from './Icons.jsx';

export function GraphView({ list, role, onApplyOps }) {
  const [subTab, setSubTab] = useState('progress'); // 'progress' | 'overtime' | 'mindmap'
  const isViewOnly = role === 'view';

  const activeItems = (list.items || []).filter(i => !i.deleted);
  const categories = activeItems.filter(i => i.type === 'category');
  const todos = activeItems.filter(i => i.type === 'todo');
  const completedTodos = todos.filter(t => t.done);

  const totalCount = todos.length;
  const doneCount = completedTodos.length;
  const overallPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div style={{ width: '100%', maxWidth: '880px', margin: '0 auto' }}>
      {/* Sub-nav tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        paddingBottom: '8px'
      }}>
        <button
          class={`nav-tab-btn ${subTab === 'progress' ? 'active' : ''}`}
          onClick={() => setSubTab('progress')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ChartIcon size={16} /> Progress Rings
        </button>
        <button
          class={`nav-tab-btn ${subTab === 'overtime' ? 'active' : ''}`}
          onClick={() => setSubTab('overtime')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ChartIcon size={16} /> Activity & Burndown
        </button>
        <button
          class={`nav-tab-btn ${subTab === 'mindmap' ? 'active' : ''}`}
          onClick={() => setSubTab('mindmap')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <SitemapIcon size={16} /> Radial Mind Map
        </button>
      </div>

      {subTab === 'progress' && renderProgressTab()}
      {subTab === 'overtime' && renderOverTimeTab()}
      {subTab === 'mindmap' && renderMindMapTab()}
    </div>
  );

  // --- Sub-Tab 1: Progress Rings & Bars ---
  function renderProgressTab() {
    const strokeDashoffset = 283 - (283 * overallPct) / 100;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Overall Ring Card */}
        <div style={{
          backgroundColor: 'var(--paper-bg)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: 'var(--paper-shadow)',
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          flexWrap: 'wrap'
        }}>
          {/* Circular SVG */}
          <div style={{ position: 'relative', width: '120px', height: '120px' }}>
            <svg width="120" height="120" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(0,0,0,0.06)"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--accent-green)"
                strokeWidth="10"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              />
            </svg>
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              <span style={{ fontSize: '1.4rem' }}>{overallPct}%</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DONE</span>
            </div>
          </div>

          <div>
            <h3 style={{ fontFamily: 'var(--title-font)', fontSize: '1.8rem', marginBottom: '6px' }}>
              Overall Completion
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {doneCount} of {totalCount} tasks completed.
            </p>
            {overallPct === 100 && totalCount > 0 && (
              <p style={{ color: 'var(--accent-green)', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <StarIcon size={16} /> All tasks completed! Great job!
              </p>
            )}
          </div>
        </div>

        {/* Per Category Breakdown */}
        <div style={{
          backgroundColor: 'var(--paper-bg)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: 'var(--paper-shadow)'
        }}>
          <h3 style={{ fontFamily: 'var(--title-font)', fontSize: '1.6rem', marginBottom: '16px' }}>
            Category Progress
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {categories.map(cat => {
              const catTodos = activeItems.filter(i => i.parentId === cat.id && i.type === 'todo');
              const catDone = catTodos.filter(t => t.done).length;
              const catTotal = catTodos.length;
              const catPct = catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 0;

              return (
                <div key={cat.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'var(--hand-font)', fontSize: '1.25rem', fontWeight: 'bold' }}>
                      + {cat.text}
                    </span>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      {catDone} / {catTotal} ({catPct}%)
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '10px',
                    borderRadius: '5px',
                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${catPct}%`,
                      height: '100%',
                      backgroundColor: catPct === 100 ? 'var(--accent-green)' : 'var(--accent-blue)',
                      borderRadius: '5px',
                      transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- Sub-Tab 2: Over Time Activity & Burndown ---
  function renderOverTimeTab() {
    // Generate 14-day heatmap
    const days = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const completionsOnDay = completedTodos.filter(t => {
        if (!t.completedAt) return false;
        return new Date(t.completedAt).toISOString().split('T')[0] === dateStr;
      }).length;
      days.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        count: completionsOnDay
      });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Heatmap */}
        <div style={{
          backgroundColor: 'var(--paper-bg)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: 'var(--paper-shadow)'
        }}>
          <h3 style={{ fontFamily: 'var(--title-font)', fontSize: '1.6rem', marginBottom: '8px' }}>
            14-Day Completion Activity
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
            Heatmap of tasks marked as completed:
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(46px, 1fr))',
            gap: '8px'
          }}>
            {days.map(d => {
              const intensity = d.count === 0 ? 0 : d.count <= 2 ? 1 : d.count <= 4 ? 2 : 3;
              const bgColors = [
                'rgba(0, 0, 0, 0.05)',
                'rgba(16, 185, 129, 0.3)',
                'rgba(16, 185, 129, 0.6)',
                'var(--accent-green)'
              ];
              return (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.count} task${d.count === 1 ? '' : 's'} completed`}
                  style={{
                    backgroundColor: bgColors[intensity],
                    borderRadius: '8px',
                    padding: '10px 4px',
                    textAlign: 'center',
                    border: '1px solid rgba(0,0,0,0.06)'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{d.dayName}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: '2px' }}>{d.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Burndown / Timeline chart */}
        <div style={{
          backgroundColor: 'var(--paper-bg)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: 'var(--paper-shadow)'
        }}>
          <h3 style={{ fontFamily: 'var(--title-font)', fontSize: '1.6rem', marginBottom: '12px' }}>
            Cumulative Velocity
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
            Overall completed tasks progression:
          </p>

          <svg width="100%" height="160" viewBox="0 0 600 160" preserveAspectRatio="none">
            <polyline
              fill="rgba(16, 185, 129, 0.12)"
              stroke="var(--accent-green)"
              strokeWidth="3"
              points={generatePolylinePoints(days)}
            />
          </svg>
        </div>
      </div>
    );
  }

  function generatePolylinePoints(days) {
    let cumulative = 0;
    const points = ['0,150'];
    const stepX = 600 / (days.length - 1);
    const maxVal = Math.max(1, doneCount);

    days.forEach((d, idx) => {
      cumulative += d.count;
      const x = idx * stepX;
      const y = 150 - (cumulative / maxVal) * 120;
      points.push(`${x},${y}`);
    });
    points.push(`600,150`);
    return points.join(' ');
  }

  // --- Sub-Tab 3: Mind Map (Radial Tree) ---
  function renderMindMapTab() {
    const rootTitle = list.title || 'Todo';
    const topNotes = activeItems.filter(i => i.type === 'note' && !i.parentId);

    const handleMindMapCheck = (todo) => {
      if (isViewOnly) return;
      const newDone = !todo.done;
      if (newDone) playPop();
      else playScratch();

      onApplyOps([
        {
          op: 'check_item',
          id: todo.id,
          done: newDone,
          completedAt: newDone ? Date.now() : null,
          updatedAt: Date.now()
        }
      ]);
    };

    return (
      <div style={{
        backgroundColor: 'var(--paper-bg)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: 'var(--paper-shadow)',
        overflowX: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--title-font)', fontSize: '1.6rem' }}>
              Interactive Radial Mind Map
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Click any task node to toggle its completed state!
            </p>
          </div>
        </div>

        {/* Mind Map Tree Container */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          minWidth: '600px',
          padding: '20px 0'
        }}>
          {/* Root Node */}
          <div style={{
            backgroundColor: 'var(--accent-blue)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '24px',
            fontFamily: 'var(--title-font)',
            fontSize: '1.8rem',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            textAlign: 'center',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <NotebookIcon size={24} /> {rootTitle}
          </div>

          {/* Top Notes */}
          {topNotes.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {topNotes.map(n => (
                <div key={n.id} class="sticky-note" style={{ fontSize: '0.85rem' }}>
                  <span class="sticky-pin" />
                  # {n.text}
                </div>
              ))}
            </div>
          )}

          {/* Category Branches */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '28px',
            flexWrap: 'wrap',
            width: '100%'
          }}>
            {categories.map(cat => {
              const catChildren = activeItems.filter(i => i.parentId === cat.id);

              return (
                <div
                  key={cat.id}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.03)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    minWidth: '200px',
                    maxWidth: '260px'
                  }}
                >
                  <div style={{
                    fontFamily: 'var(--hand-font)',
                    fontSize: '1.4rem',
                    fontWeight: 'bold',
                    color: 'var(--text-primary)',
                    marginBottom: '10px',
                    borderBottom: '2px solid var(--paper-margin-red)',
                    paddingBottom: '4px'
                  }}>
                    + {cat.text}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {catChildren.map(child => {
                      if (child.type === 'note') {
                        return (
                          <div key={child.id} class="sticky-note" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                            # {child.text}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={child.id}
                          onClick={() => handleMindMapCheck(child)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            backgroundColor: child.done ? 'rgba(16, 185, 129, 0.15)' : 'var(--paper-bg)',
                            border: `1px solid ${child.done ? 'var(--accent-green)' : 'rgba(0,0,0,0.08)'}`,
                            cursor: isViewOnly ? 'default' : 'pointer',
                            fontSize: '0.9rem',
                            textDecoration: child.done ? 'line-through' : 'none',
                            color: child.done ? 'var(--text-strike)' : 'var(--text-primary)'
                          }}
                        >
                          {child.done ? <CircleCheckIcon size={16} /> : <CircleIcon size={16} />}
                          <span>{child.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
}
