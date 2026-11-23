import React, { useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bookmark, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Download,
  FolderOpen, Lightbulb, ListChecks, Plus, Printer, Sprout, Target, Trash2, Users,
} from 'lucide-react';
import './activity-plan.css';

export const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function ActivityImage({ activity, className = '' }) {
  const [failedImage, setFailedImage] = useState(null);
  const image = activity.image;
  return (
    <div className={`activity-image ${className}`.trim()}>
      {image != null && failedImage !== image ? (
        <img
          src={`${import.meta.env.BASE_URL}images/activity-${image}.webp`}
          alt=""
          onError={() => setFailedImage(image)}
          decoding="async"
        />
      ) : (
        <Sprout size={60} strokeWidth={1.25} aria-hidden="true" />
      )}
    </div>
  );
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function downloadPrintable(activity) {
  const title = escapeHtml(activity.title);
  const materials = activity.materials.map((material) => `<li>${escapeHtml(material)}</li>`).join('');
  const steps = activity.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('');
  const documentHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | Thinkplore activity sheet</title>
  <style>
    * { box-sizing: border-box; }
    body { max-width: 44rem; margin: 2rem auto; padding: 0 1.5rem; font: 16px/1.5 system-ui, sans-serif; color: #183232; }
    h1 { margin: 0; font-size: 2rem; line-height: 1.15; }
    h2 { margin-bottom: .25rem; font-size: 1.1rem; }
    ul, ol { margin-top: 0; padding-left: 1.4rem; }
    li { padding-bottom: .3rem; }
    header { border-bottom: 2px solid; padding-bottom: .75rem; }
    .brand { font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .field { display: flex; gap: 2rem; margin: 1.2rem 0; }
    .workspace { border: 1px solid; min-height: 8rem; margin-top: .5rem; }
    button { font: inherit; margin-top: 1rem; padding: .4rem 1rem; cursor: pointer; }
    @media print { body { margin: 0; padding: 0; color: #000; } button { display: none; } section { break-inside: avoid; } }
  </style>
</head>
<body>
  <header><p class="brand">Thinkplore activity sheet</p><h1>${title}</h1></header>
  <div class="field"><span>Name __________________</span><span>Date ______________</span></div>
  <p>${escapeHtml(activity.description)}</p>
  <section><h2>What you’ll need</h2><ul>${materials}</ul></section>
  <section><h2>What to do</h2><ol>${steps}</ol></section>
  <section><h2>What did you notice?</h2><div class="workspace"></div></section>
  <button type="button" onclick="window.print()">Print this activity</button>
</body>
</html>`;
  const objectUrl = URL.createObjectURL(new Blob([documentHtml], { type: 'text/html;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${activity.id}-activity-sheet.html`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function Detail({ activity, catalog, saved, onSave, onAdd, planned, onBrowse, savePending, planPending }) {
  const { ages, dimensions, taxonomy } = catalog;
  const activityFormats = dimensions.find(({ id }) => id === 'format')?.options ?? [];
  const ageLabels = ages.filter(({ id }) => activity.ages.includes(id)).map(({ label }) => label);
  const goals = taxonomy.flatMap(({ children }) => children).filter(({ id }) => activity.goals.includes(id));
  const format = activityFormats.find(({ id }) => id === activity.format)?.label;

  return (
    <article className="activity-detail">
      <button className="activity-back" type="button" onClick={() => onBrowse()}>
        <ArrowLeft size={17} /> Back to activities
      </button>
      <header className="activity-detail-hero">
        <ActivityImage activity={activity} className="activity-detail-image" />
        <div className="activity-detail-intro">
          <div className="activity-detail-skills">
            {activity.skills.map((skill) => <span key={skill}>{skill}</span>)}
          </div>
          <h1>{activity.title}</h1>
          <p>{activity.description}</p>
          <div className="activity-detail-meta">
            <span><Clock size={16} /> {activity.minutes} min</span>
            {!!ageLabels.length && <span><Users size={16} /> {ageLabels.join(', ')}</span>}
            {format && <span><ListChecks size={16} /> {format}</span>}
          </div>
          <div className="activity-actions">
            <button className="activity-primary" type="button" onClick={() => onAdd()} disabled={planned || planPending}>
              {planned ? <Check size={17} /> : <Plus size={17} />}
              {planned ? 'In your weekly plan' : 'Add to weekly plan'}
            </button>
            <button className="activity-secondary" aria-pressed={Boolean(saved)} type="button" disabled={savePending} onClick={() => onSave()}>
              <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save activity'}
            </button>
          </div>
        </div>
      </header>
      <div className="activity-detail-sections">
        <div className="activity-detail-main">
          <section className="activity-panel">
            <h2><ListChecks size={23} /> How to do it</h2>
            <ol className="activity-steps">
              {activity.steps.map((step, index) => (
                <li key={step}><span aria-hidden="true">{index + 1}</span><div>{step}</div></li>
              ))}
            </ol>
          </section>
          {(activity.variation || activity.guidance) && (
            <section className="activity-panel activity-tip">
              <h2><Lightbulb size={23} /> Make it your own</h2>
              {activity.variation && <p>{activity.variation}</p>}
              {activity.guidance && <p><strong>For grown-ups</strong> {activity.guidance}</p>}
            </section>
          )}
        </div>
        <aside className="activity-detail-aside">
          <section className="activity-panel">
            <h2><FolderOpen size={21} /> What you’ll need</h2>
            <ul className="activity-materials">
              {activity.materials.length
                ? activity.materials.map((material) => <li key={material}>{material}</li>)
                : <li>No materials needed</li>}
            </ul>
          </section>
          {!!goals.length && (
            <section className="activity-panel">
              <h2><Target size={21} /> Learning goals</h2>
              <ul className="activity-materials">
                {goals.map(({ id, label }) => <li key={id}>{label}</li>)}
              </ul>
            </section>
          )}
          {activity.printable && (
            <section className="activity-panel activity-printable">
              <h2><Printer size={21} /> Printable activity</h2>
              <p>Download the activity sheet to print or use offline.</p>
              <button className="activity-secondary" type="button" onClick={() => downloadPrintable(activity)}>
                <Download size={17} /> Download printable
              </button>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}

export function Plan({
  entries, status, weekLabel, onChangeWeek, onAddMore, onToggle, onRemove, authenticated,
  onSignIn, onOpen, entryPending,
}) {
  const completed = entries.filter(({ done }) => done).length;
  const days = [...weekdays, 'Unscheduled'];
  const groupedEntries = Object.fromEntries(days.map((day) => [day, []]));
  for (const entry of entries) {
    const day = weekdays.find((weekday) => weekday.toLowerCase() === String(entry.day).toLowerCase()) ?? 'Unscheduled';
    groupedEntries[day].push(entry);
  }
  const daysWithEntries = days.filter((day) => groupedEntries[day].length);

  return (
    <section className="activity-plan" aria-labelledby="plan-heading">
      <header className="plan-hero">
        <div>
          <h1 id="plan-heading">My Weekly Plan</h1>
          <p>Make time for little moments of discovery throughout the week.</p>
        </div>
        {!status && !!entries.length && (
          <div className="plan-actions">
            <button className="activity-secondary" type="button" onClick={() => window.print()}><Printer size={17} /> Print plan</button>
            <button className="activity-primary" type="button" onClick={() => onAddMore()}><Plus size={17} /> Add activities</button>
          </div>
        )}
      </header>
      {authenticated && (
        <div className="plan-week-control" role="group" aria-label="Choose a week">
          <button className="icon-button" type="button" aria-label="Previous week" onClick={() => onChangeWeek(-1)}><ChevronLeft size={21} /></button>
          <strong aria-live="polite">{weekLabel}</strong>
          <button className="icon-button" type="button" aria-label="Next week" onClick={() => onChangeWeek(1)}><ChevronRight size={21} /></button>
        </div>
      )}
      {status ?? (entries.length ? (
        <>
          <div className="plan-progress">
            <div><strong>Weekly progress</strong><span>{completed} of {entries.length} completed</span></div>
            <progress value={completed} max={entries.length} aria-label="Weekly progress" />
          </div>
          <div className="plan-days">
            {daysWithEntries.map((day) => (
              <section className="plan-day" key={day}>
                <h2>{day}</h2>
                <ul>
                  {groupedEntries[day].map(({ activity, done }) => (
                    <li className={`plan-row${done ? ' plan-row-done' : ''}`} key={activity.id}>
                      <input
                        type="checkbox"
                        checked={Boolean(done)}
                        aria-label={`Mark ${activity.title} as ${done ? 'incomplete' : 'complete'}`}
                        onChange={() => onToggle(activity.id, !done)}
                        disabled={entryPending(activity.id)}
                      />
                      <span className="plan-print-checkbox" aria-hidden="true">{done ? '✓' : '□'}</span>
                      <ActivityImage activity={activity} className="plan-thumbnail" />
                      <div className="plan-row-content">
                        {onOpen ? (
                          <button className="plan-row-title" type="button" onClick={() => onOpen(activity.id)}>{activity.title}</button>
                        ) : <strong>{activity.title}</strong>}
                        <span><Clock size={14} /> {activity.minutes} min</span>
                      </div>
                      <button
                        type="button"
                        className="plan-remove"
                        onClick={() => onRemove(activity.id)}
                        disabled={entryPending(activity.id)}
                        aria-label={`Remove ${activity.title} from weekly plan`}
                      >
                        <Trash2 size={17} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      ) : (
        <section className="plan-empty">
          <CalendarDays size={36} strokeWidth={1.4} aria-hidden="true" />
          <h2>{authenticated ? 'Your week is a blank canvas' : 'Make a plan for your week'}</h2>
          <p>{authenticated ? 'Find something that sparks curiosity and add it to your weekly plan.' : 'Sign in to save activities to your plan and keep track of what you’ve tried.'}</p>
          <div className="plan-actions">
            {!authenticated && <button className="activity-primary" type="button" onClick={onSignIn}>Sign in</button>}
            <button className={authenticated ? 'activity-primary' : 'activity-secondary'} type="button" onClick={onAddMore}>Browse activities <ArrowRight size={17} /></button>
          </div>
        </section>
      ))}
    </section>
  );
}
