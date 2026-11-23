import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import './filters.css';

function copySelection(dimensions, selection = {}) {
  return Object.fromEntries(
    [...dimensions.map(({ id }) => id), 'goals'].map((key) => [key, [...(selection[key] ?? [])]]),
  );
}

function GoalGroup({ group, visibleChildren, selected, expanded, onExpand, onSelect }) {
  const childrenId = useId();
  const checkbox = useRef(null);
  const childIds = group.children.map(({ id }) => id);
  const count = childIds.filter((id) => selected.includes(id)).length;
  const all = count > 0 && count === childIds.length;
  const some = count > 0 && !all;
  const status = all ? 'All' : some ? 'Some' : 'None';

  useLayoutEffect(() => {
    checkbox.current.indeterminate = some;
  }, [some]);

  return (
    <div className="tp-goal-group">
      <div className="tp-goal-group-row">
        <label className="tp-goal-group-choice">
          <input
            ref={checkbox}
            type="checkbox"
            checked={all}
            aria-describedby={`${childrenId}-status`}
            onChange={() => onSelect(childIds, !all)}
          />
          <span>{group.label}</span>
        </label>
        <span className="tp-goal-status" data-status={status} id={`${childrenId}-status`}>
          {status}
        </span>
        <button
          type="button"
          className="tp-filter-icon tp-expand-goals"
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.label}`}
          aria-expanded={expanded}
          aria-controls={childrenId}
          onClick={onExpand}
        >
          <ChevronDown size={17} aria-hidden="true" />
        </button>
      </div>
      <div className="tp-goal-children" id={childrenId} hidden={!expanded}>
        {visibleChildren.map(({ id, label }) => (
          <label key={id} className="tp-goal-child">
            <input
              type="checkbox"
              checked={selected.includes(id)}
              onChange={(event) => onSelect([id], event.currentTarget.checked)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function Filters({ dimensions, taxonomy, applied, onApply, onClose }) {
  const instanceId = useId();
  const dialog = useRef(null);
  const closeButton = useRef(null);
  const searchInput = useRef(null);
  const startedOnBackdrop = useRef(false);
  const [draft, setDraft] = useState(() => copySelection(dimensions, applied));
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [searchExpanded, setSearchExpanded] = useState({});
  const query = search.trim().toLocaleLowerCase();
  const groups = taxonomy.map((group) => ({
    ...group,
    visibleChildren: group.label.toLocaleLowerCase().includes(query)
      ? group.children
      : group.children.filter(({ label }) => label.toLocaleLowerCase().includes(query)),
  })).filter(({ visibleChildren }) => visibleChildren.length > 0);

  useLayoutEffect(() => {
    const element = dialog.current;
    const scroller = document.scrollingElement;
    const previousOverflow = scroller?.style.overflow;
    const opener = document.activeElement;

    element.showModal();
    closeButton.current.focus({ preventScroll: true });
    if (scroller) scroller.style.overflow = 'hidden';

    return () => {
      element.close();
      if (scroller) scroller.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  function select(key, ids, checked) {
    setDraft((current) => ({
      ...current,
      [key]: checked
        ? [...new Set([...current[key], ...ids])]
        : current[key].filter((id) => !ids.includes(id)),
    }));
  }

  function changeSearch(value) {
    setSearch(value);
    setSearchExpanded({});
  }

  function clearFilters() {
    setDraft(copySelection(dimensions));
    changeSearch('');
  }

  return (
    <dialog
      ref={dialog}
      className="tp-filter-dialog"
      aria-labelledby={`${instanceId}-title`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        startedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (startedOnBackdrop.current && event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="tp-filter-panel"
        onSubmit={(event) => {
          event.preventDefault();
          onApply(draft);
        }}
      >
        <header className="tp-filter-header">
          <h2 id={`${instanceId}-title`}>Filters</h2>
          <button ref={closeButton} className="tp-filter-icon tp-close-filters" type="button" aria-label="Close filters" onClick={onClose}>
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="tp-filter-body">
          {dimensions.map(({ id, label, options }) => (
            <fieldset key={id} className="tp-filter-fieldset">
              <legend>{label}</legend>
              <div className="tp-filter-options">
                {options.map((option) => (
                  <label key={option.id} className="tp-filter-option">
                    <input
                      type="checkbox"
                      checked={draft[id].includes(option.id)}
                      onChange={(event) => select(id, [option.id], event.currentTarget.checked)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <fieldset className="tp-filter-fieldset tp-learning-goals">
            <legend>Learning goals</legend>
            <div className="tp-goal-search">
              <Search size={17} aria-hidden="true" />
              <input
                ref={searchInput}
                type="text"
                aria-label="Search learning goals"
                placeholder="Search learning goals"
                value={search}
                onChange={(event) => changeSearch(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.preventDefault();
                }}
              />
              {search && (
                <button
                  type="button"
                  className="tp-filter-icon tp-clear-goal-search"
                  aria-label="Clear goal search"
                  onClick={() => {
                    changeSearch('');
                    searchInput.current.focus();
                  }}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="tp-goal-groups">
              {groups.map((group) => {
                const isExpanded = query ? (searchExpanded[group.id] ?? true) : Boolean(expanded[group.id]);
                const updateExpanded = query ? setSearchExpanded : setExpanded;

                return (
                  <GoalGroup
                    key={group.id}
                    group={group}
                    visibleChildren={group.visibleChildren}
                    selected={draft.goals}
                    expanded={isExpanded}
                    onExpand={() => updateExpanded((current) => ({ ...current, [group.id]: !isExpanded }))}
                    onSelect={(ids, checked) => select('goals', ids, checked)}
                  />
                );
              })}
              {groups.length === 0 && <p className="tp-goal-empty" role="status">No matching learning goals.</p>}
            </div>
          </fieldset>
        </div>

        <footer className="tp-filter-footer">
          <button type="button" className="tp-reset-filters" onClick={clearFilters}>Reset</button>
          <button type="submit" className="tp-apply-filters">Apply filters</button>
        </footer>
      </form>
    </dialog>
  );
}
