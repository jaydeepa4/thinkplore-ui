import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Bookmark, CalendarDays, ChevronDown, ChevronRight, Clock3, Compass, Menu, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import '@fontsource/sora/latin-600.css'
import '@fontsource/sora/latin-700.css'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/dm-sans/latin-700.css'
import { createCatalogFilters } from './data.js'
import Filters from './Filters.jsx'
import { ActivityImage, Detail, Plan, weekdays } from './ActivityAndPlan.jsx'
import AuthDialog from './AuthDialog.jsx'
import { formatWeek, useThinkplore } from './useThinkplore.js'
import './styles.css'

const catalog = '/learning/activities'
const planPath = '/my-learning-plan'
const destinations = [
  ['Communities', '/communities', 'Connect with other parents and share ideas for learning through play.'],
  ['Habits', '/habits', 'Make space for small, repeatable routines at home.'],
  ['Parenting Programs', '/parenting-programs', 'Explore guided support for everyday parenting.'],
  ['Shop', '/shop', 'Discover resources for hands-on learning.'],
]
const imageBase = import.meta.env.BASE_URL + 'images/'
const agePath = id => '/learning/ages/' + id
const activityPath = id => catalog + '/' + id
const href = path => '#' + path

function Brand() {
  return <a href={href('/')} className="brand" aria-label="Thinkplore Home"><span className="brand-mark"><Compass size={25} strokeWidth={2.2}/></span>think<span className="brand-end">plore</span><span className="brand-dot">.</span></a>
}

function Navigation({ path, ages, user, sessionLoading, sessionError, onSignIn, onSignOut, onRetry, signingOut }) {
  const [mobile, setMobile] = useState(false)
  const [learning, setLearning] = useState(false)
  useEffect(() => { setMobile(false); setLearning(false) }, [path])
  useEffect(() => {
    if (!learning) return
    const dismiss = event => {
      if (event.key === 'Escape' || (event.type === 'pointerdown' && !event.target.closest('.learning-menu'))) setLearning(false)
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    return () => {
      document.removeEventListener('keydown', dismiss)
      document.removeEventListener('pointerdown', dismiss)
    }
  }, [learning])
  return <header className="site-header">
    <div className="wrap nav-shell">
      <Brand/>
      <button className="mobile-toggle icon-button" aria-expanded={mobile} aria-controls="site-nav" aria-label={mobile ? 'Close navigation' : 'Open navigation'} onClick={() => setMobile(!mobile)}>{mobile ? <X/> : <Menu/>}</button>
      <nav id="site-nav" className={mobile ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
        <a href={href('/')} aria-current={path === '/' ? 'page' : undefined}>Home</a>
        <div className="learning-menu">
          <button className={path.startsWith('/learning') ? 'nav-button selected' : 'nav-button'} aria-expanded={learning} aria-controls="learning-links" onClick={() => setLearning(!learning)}>Learning <ChevronDown size={15}/></button>
          {learning && <div className="learning-links" id="learning-links">
            {ages.map(age => <a href={href(agePath(age.id))} key={age.id} onClick={() => { setLearning(false); setMobile(false) }}>{age.label} <ChevronRight size={15}/></a>)}
            <a href={href(catalog)} onClick={() => { setLearning(false); setMobile(false) }}>All Activities <ChevronRight size={15}/></a>
          </div>}
        </div>
        {destinations.map(([label, url]) => <a key={url} href={href(url)} aria-current={path === url ? 'page' : undefined}>{label}</a>)}
      </nav>
      <div className="account-nav">
        <a className="plan-link" href={href(planPath)} aria-label="My Learning Plan" aria-current={path === planPath ? 'page' : undefined}><CalendarDays size={18}/><span>My Plan</span></a>
        {user ? <>
          <span className="account-name" title={user.username}>{user.username}</span>
          <button className="button secondary account-button" type="button" onClick={onSignOut} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
        </> : sessionLoading ? <span className="account-status" role="status">Checking account…</span>
          : sessionError ? <button className="button secondary account-button" type="button" onClick={onRetry}>Retry account</button>
          : <button className="button secondary account-button" type="button" onClick={onSignIn}>Sign in</button>}
      </div>
    </div>
  </header>
}

function ActivityCard({ activity, saved, onSave, pending }) {
  return <article className="activity-card">
    <a className="card-photo" href={href(activityPath(activity.id))} aria-label={activity.title}><ActivityImage activity={activity}/></a>
    <button className={saved ? 'icon-button card-save saved' : 'icon-button card-save'} aria-pressed={saved} disabled={pending} aria-label={saved ? 'Unsave ' + activity.title : 'Save ' + activity.title} onClick={() => onSave(activity.id)}><Bookmark size={19} fill={saved ? 'currentColor' : 'none'}/></button>
    <div className="card-body">
      <div className="card-meta"><span>{activity.ages.map(age => age.replace('-', '–')).join(' / ')} years</span><span><Clock3 size={15}/> {activity.minutes} min</span></div>
      <h3><a href={href(activityPath(activity.id))}>{activity.title}</a></h3>
      <p>{activity.description}</p>
    </div>
  </article>
}

function ActivityGrid({ items, saved, onSave, savePending }) {
  return <div className="activity-grid">{items.map(activity => <ActivityCard key={activity.id} activity={activity} saved={saved.includes(activity.id)} onSave={onSave} pending={savePending(activity.id)}/>)}</div>
}

function Home({ profile, catalogData, catalogStatus, personalStatus, saved, onSave, savePending, entries, weekLabel }) {
  const guest = profile === 'guest'
  const { activities = [], ages = [] } = catalogData ?? {}
  const featured = activities.slice(0, 3)
  return <>
    <section className="hero wrap">
      <div className="hero-copy">
        <div className="eyebrow"><Sparkles size={16}/> {guest ? 'SCREEN-FREE LEARNING THROUGH PLAY' : profile === 'active' ? 'YOUR THINKPLORE HOME' : 'WELCOME TO THINKPLORE'}</div>
        <h1>{guest ? <>Think. Play.<br/><em>Explore.</em></> : profile === 'active' ? <>Make time<br/> <em>for play.</em></> : <>Small moments.<br/><em>Big discoveries.</em></>}</h1>
        <p>{guest ? 'Simple, hands-on activities for curious kids and the grown-ups who guide them.' : profile === 'active' ? 'Pick up where you left off or find something new to do together.' : 'Find an activity for your child’s age, then save a favorite or add it to your week.'}</p>
        <div className="hero-actions"><a className="button primary" href={href(catalog)}>Explore activities</a>{!guest && <a className="button secondary" href={href(planPath)}>View my plan</a>}</div>
      </div>
      <div className="hero-visual"><img src={imageBase + 'activity-0.webp'} alt="Hands folding colorful paper boats together"/><span className="hero-sticker" aria-hidden="true"><Compass size={31}/></span></div>
    </section>
    {catalogStatus ? <section className="wrap home-section">{catalogStatus}</section> : <>
      <section className="wrap home-section">
        <div className="section-heading"><div><h2>Find their next adventure</h2><p>Start with your child’s age.</p></div></div>
        <div className="age-grid">{ages.map((age, index) => <a className={'age-tile age-' + index} key={age.id} href={href(agePath(age.id))}><div><strong>{age.label}</strong><span>{['Playful first discoveries', 'Build, imagine and explore', 'Creative challenges'][index]}</span></div><ChevronRight size={23}/></a>)}</div>
      </section>
      {profile === 'active' && !personalStatus && <section className="wrap home-section">
        <div className="section-heading"><div><h2>Your weekly plan</h2><p>{weekLabel} · {entries.filter(item => item.done).length} of {entries.length} activities complete</p></div><a className="text-link" href={href(planPath)}>Open my plan <ChevronRight size={17}/></a></div>
      </section>}
      <section className="wrap home-section">
        <div className="section-heading"><div><h2>{guest ? 'A few ideas to get you started' : 'Saved activities'}</h2></div>{guest && <a className="text-link" href={href(catalog)}>View all <ChevronRight size={17}/></a>}</div>
        {personalStatus && !guest ? personalStatus : guest || saved.length ? (
          <ActivityGrid items={guest ? featured : activities.filter(item => saved.includes(item.id))} saved={saved} onSave={onSave} savePending={savePending}/>
        ) : <div className="empty"><Bookmark/><h3>No saved activities yet</h3><p>Save activities you’d like to come back to.</p><a className="button secondary" href={href(catalog)}>Browse activities</a></div>}
      </section>
    </>}
  </>
}

function Catalog({ age, catalogData, saved, onSave, savePending }) {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState({})
  const [open, setOpen] = useState(false)
  const { dimensions, taxonomy, activities } = catalogData
  const { getChips, matches, removeChip } = useMemo(() => createCatalogFilters(catalogData), [catalogData])
  const chips = getChips(applied)
  const items = activities.filter(activity => (!age || activity.ages.includes(age.id)) && matches(activity, applied, query))
  return <>
    <section className={'catalog-banner ' + (age ? 'age-banner' : '')}>
      <div className="wrap">
        <div className="eyebrow"><Compass size={16}/> {age ? 'LEARNING / ' + age.label.toUpperCase() : 'THINKPLORE LEARNING'}</div>
        <h1>{age ? age.title : 'Explore activities'}</h1>
        <p>{age ? age.description : 'Find screen-free games, creative projects and hands-on activities to try with your child.'}</p>
        {age && <a className="text-link" href={href(catalog)}>Browse all ages <ChevronRight size={17}/></a>}
      </div>
    </section>
    <section className="wrap catalog-section" aria-label="Activity catalog">
      <div className="catalog-controls">
        <label className="search-field"><Search size={21}/><input type="search" aria-label="Search activities" placeholder="Search activities, skills or materials" value={query} onChange={event => setQuery(event.target.value)}/></label>
        <button className="button primary filter-trigger" aria-haspopup="dialog" onClick={() => setOpen(true)}><SlidersHorizontal size={18}/> Filters {chips.length > 0 && <span className="filter-count">{chips.length}</span>}</button>
      </div>
      {!!chips.length && <div className="chips" aria-label="Applied filters">{chips.map(chip => <button className="chip" key={chip.group + chip.id} aria-label={'Remove filter ' + chip.label} onClick={() => setApplied(removeChip(applied, chip))}>{chip.label}<X size={15}/></button>)}<button className="plain-link" onClick={() => setApplied({})}>Clear filters</button></div>}
      <div className="results-line" role="status">{items.length} {items.length === 1 ? 'activity' : 'activities'}</div>
      {items.length ? <ActivityGrid items={items} saved={saved} onSave={onSave} savePending={savePending}/> : <div className="empty"><Search/><h2>No activities found</h2><p>Try a different search or clear your filters.</p><button className="button secondary" onClick={() => { setApplied({}); setQuery('') }}>Clear search and filters</button></div>}
    </section>
    {open && <Filters dimensions={dimensions} taxonomy={taxonomy} applied={applied} onApply={draft => { setApplied(draft); setOpen(false) }} onClose={() => setOpen(false)}/>}
  </>
}

function Placeholder({ title, description }) {
  return <section className="wrap placeholder"><div className="eyebrow"><Compass size={16}/> THINKPLORE</div><h1>{title}</h1><p>{description}</p><p>This area is a preview placeholder. Learning is ready to explore.</p><a className="button primary" href={href(catalog)}>Explore Learning</a></section>
}

function errorMessage(error, fallback) {
  return error?.message || (typeof error === 'string' && error) || fallback
}

function LoadState({ loading, error, label, onRetry }) {
  if (error) {
    return <div className="empty load-state">
      <h2>Couldn’t load {label}</h2>
      <p role="alert">{errorMessage(error, 'Try again in a moment.')}</p>
      <button className="button secondary" onClick={onRetry}>Try again</button>
    </div>
  }
  if (loading) return <div className="empty load-state" role="status">Loading {label}…</div>
  return null
}

function initialPlanDay(week) {
  const monday = new Date(week + 'T00:00:00')
  const nextMonday = new Date(monday)
  nextMonday.setDate(monday.getDate() + 7)
  const today = new Date()
  return today >= monday && today < nextMonday ? weekdays[(today.getDay() + 6) % 7] : weekdays[0]
}

function AddToPlanDialog({ action, onClose, onAdd, loading, loadError, scheduledDay, onRetry }) {
  const ref = useRef(null)
  const select = useRef(null)
  const [day, setDay] = useState(() => initialPlanDay(action.week))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement
    dialog.showModal()
    select.current?.focus()
    return () => {
      dialog.close()
      if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({ preventScroll: true })
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    if (submitting || loading || loadError || scheduledDay) return
    setSubmitting(true)
    setError('')
    try {
      await onAdd(day)
    } catch (failure) {
      setError(errorMessage(failure, 'Couldn’t add this activity. Try again.'))
      setSubmitting(false)
    }
  }

  return <dialog className="action-dialog" ref={ref} aria-labelledby="action-title"
    onCancel={event => { event.preventDefault(); if (!submitting) onClose() }}
    onClick={event => { if (!submitting && event.target === event.currentTarget) onClose() }}>
    <form className="action-inner" onSubmit={submit}>
      <button className="icon-button close-action" aria-label="Close" type="button" onClick={onClose} disabled={submitting}><X size={21}/></button>
      <h2 id="action-title">Add to your week</h2>
      <p>{action.title} · {formatWeek(action.week)}</p>
      {(loading || loadError) ? <>
        {loadError ? <p className="action-error" role="alert">{errorMessage(loadError, 'Couldn’t check your plan.')}</p>
          : <p role="status">Checking your plan…</p>}
        {loadError && <button className="button secondary" type="button" onClick={onRetry}>Try again</button>}
      </> : scheduledDay ? <>
        <p>This activity is already on your plan for {scheduledDay}.</p>
        <button className="button primary" type="button" onClick={onClose}>Done</button>
      </> : <>
        <label>Day of the week<select ref={select} value={day} disabled={submitting} onChange={event => setDay(event.target.value)}>
          {weekdays.map(value => <option key={value}>{value}</option>)}
        </select></label>
        {error && <p className="action-error" role="alert">{error}</p>}
        <button className="button primary" disabled={submitting}>{submitting ? 'Adding activity…' : 'Add to plan'}</button>
      </>}
    </form>
  </dialog>
}

function App() {
  const {
    catalog: catalogData, catalogError, catalogLoading, reloadCatalog, user, sessionLoading,
    sessionError, reloadSession, savedIds, entries, week, changeWeek, personalLoading,
    personalError, reloadPersonal, hasScheduledActivities, register, login, logout, setSaved, addToPlan, setPlanDone,
    removeFromPlan,
  } = useThinkplore()
  const [path, setPath] = useState(() => location.hash.slice(1) || '/')
  const [action, setAction] = useState(null)
  const [notice, setNotice] = useState(null)
  const [pending, setPending] = useState(new Set())
  const inFlight = useRef(new Set())
  const currentUser = useRef(user?.id)
  const currentPath = useRef(path)
  currentUser.current = user?.id
  currentPath.current = path

  useEffect(() => {
    const route = () => {
      currentPath.current = location.hash.slice(1) || '/'
      setPath(currentPath.current)
      setNotice(null)
      setAction(null)
      window.scrollTo(0, 0)
      document.getElementById('main')?.focus({ preventScroll: true })
    }
    window.addEventListener('hashchange', route)
    return () => window.removeEventListener('hashchange', route)
  }, [])

  const { ages = [], activities = [] } = catalogData ?? {}
  const activityById = useMemo(() => new Map(activities.map(item => [item.id, item])), [activities])
  const planEntries = entries.map(item => ({ ...item, activity: activityById.get(item.activityId) })).filter(item => item.activity)
  const hasProgress = savedIds.length > 0 || hasScheduledActivities || entries.length > 0
  const profile = user ? (hasProgress ? 'active' : 'new') : 'guest'
  const weekLabel = formatWeek(week)
  const accountBusy = Boolean(sessionLoading || (user && pending.has('logout')))
  const catalogStatus = catalogError || catalogLoading ? <LoadState label="activities" loading={catalogLoading} error={catalogError} onRetry={reloadCatalog}/> : null
  const sessionStatus = sessionError || sessionLoading ? <LoadState label="your account" loading={sessionLoading} error={sessionError} onRetry={reloadSession}/> : null
  const personalStatus = personalError || personalLoading ? <LoadState label="your activity and plan data" loading={personalLoading} error={personalError} onRetry={reloadPersonal}/> : null

  const saveKey = id => 'save:' + (user?.id ?? 'sign-in') + ':' + id
  const entryKey = id => 'plan:' + user?.id + ':' + week + ':' + id
  const savePending = id => accountBusy || Boolean(sessionError) || Boolean(user && personalStatus) || pending.has(saveKey(id)) || pending.has('sign-in-save:' + id)
  const entryPending = id => accountBusy || pending.has(entryKey(id))
  const signIn = () => setAction({ type: 'auth' })
  const browse = () => { location.hash = catalog }

  function showNotice(message, error = false) {
    setNotice({ message, error })
  }

  async function runCommand(key, command, message, fallback, { authTransition = false } = {}) {
    if (inFlight.current.has(key)) return
    inFlight.current.add(key)
    setPending(new Set(inFlight.current))
    const origin = currentPath.current
    const owner = currentUser.current
    setNotice(null)
    try {
      await command()
      if (currentPath.current === origin && (authTransition || currentUser.current === owner)) showNotice(message)
    } catch (failure) {
      if (currentPath.current === origin && (authTransition || currentUser.current === owner)) showNotice(errorMessage(failure, fallback), true)
    } finally {
      inFlight.current.delete(key)
      setPending(new Set(inFlight.current))
    }
  }

  function save(id) {
    if (!user) return setAction({ type: 'auth', next: 'save', id })
    const shouldSave = !savedIds.includes(id)
    return runCommand(saveKey(id), () => setSaved(id, shouldSave),
      shouldSave ? 'Activity saved.' : 'Removed from saved activities.', 'Couldn’t update saved activities. Try again.')
  }

  function openAdd(activity) {
    const planAction = { type: 'add', title: activity.title, id: activity.id, week }
    setAction(user ? planAction : { type: 'auth', next: 'add', planAction })
  }

  async function authenticate(mode, credentials) {
    const requested = action
    const origin = currentPath.current
    await (mode === 'register' ? register(credentials) : login(credentials))
    if (currentPath.current !== origin) return
    setAction(requested.next === 'add' ? requested.planAction : null)
    if (requested.next === 'save') {
      await runCommand('sign-in-save:' + requested.id, () => setSaved(requested.id, true),
        'Activity saved.', 'You’re signed in. Try saving the activity again.', { authTransition: true })
    } else if (requested.next !== 'add') {
      showNotice(mode === 'register' ? 'Your account is ready.' : 'Signed in.')
    }
  }

  async function confirmPlan(day) {
    await addToPlan(action.id, day, action.week)
    if (currentPath.current !== path || currentUser.current !== user.id) return
    setAction(current => current === action ? null : current)
    showNotice('Added to your plan for ' + day + '.')
  }

  const age = ages.find(item => agePath(item.id) === path)
  const activity = activities.find(item => activityPath(item.id) === path)
  const destination = destinations.find(item => item[1] === path)
  let page
  if (path === '/') {
    page = <Home profile={profile} catalogData={catalogData} catalogStatus={catalogStatus} personalStatus={personalStatus}
      saved={savedIds} onSave={save} savePending={savePending} entries={planEntries} weekLabel={weekLabel}/>
  } else if (path === planPath) {
    page = <Plan entries={planEntries} authenticated={Boolean(user)} onAddMore={browse} onSignIn={signIn}
      status={sessionStatus ?? (user ? personalStatus ?? catalogStatus : null)}
      weekLabel={weekLabel} onChangeWeek={changeWeek} entryPending={entryPending}
      onToggle={(id, done) => runCommand(entryKey(id), () => setPlanDone(id, done),
        done ? 'Activity marked complete.' : 'Activity marked incomplete.', 'Couldn’t update your plan. Try again.')}
      onRemove={id => runCommand(entryKey(id), () => removeFromPlan(id),
        'Activity removed from your plan.', 'Couldn’t remove this activity. Try again.')}
      onOpen={id => { location.hash = activityPath(id) }}/>
  } else if (path === catalog || age) {
    page = catalogStatus ? <section className="wrap catalog-section">{catalogStatus}</section>
      : <Catalog key={path} age={age} catalogData={catalogData} saved={savedIds} onSave={save} savePending={savePending}/>
  } else if (activity) {
    page = <Detail activity={activity} catalog={catalogData} saved={savedIds.includes(activity.id)} onSave={() => save(activity.id)}
      savePending={savePending(activity.id)} planPending={accountBusy || Boolean(sessionError) || Boolean(user && personalStatus) || entryPending(activity.id)}
      onAdd={() => openAdd(activity)} planned={entries.some(item => item.activityId === activity.id)} onBrowse={browse}/>
  } else if (path.startsWith('/learning/') && catalogStatus) {
    page = <section className="wrap catalog-section">{catalogStatus}</section>
  } else {
    page = <Placeholder title={destination?.[0] ?? 'Page not found'} description={destination?.[2] ?? 'Find your next activity in Learning.'}/>
  }

  return <>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main').focus() }}>Skip to content</a>
    <Navigation path={path} ages={ages} user={user} sessionError={sessionError} sessionLoading={sessionLoading}
      onSignIn={signIn} onSignOut={() => runCommand('logout', logout, 'Signed out.', 'Couldn’t sign out. Try again.', { authTransition: true })}
      onRetry={reloadSession} signingOut={pending.has('logout')}/>
    <main id="main" tabIndex="-1">
      {user && personalError && path.startsWith('/learning/') && <section className="wrap personal-warning">{personalStatus}</section>}
      {page}
    </main>
    <footer className="site-footer"><div className="wrap footer-inner"><Brand/><span>Think. Play. Explore.</span></div></footer>
    <div role="status" className={notice ? 'toast' + (notice.error ? ' toast-error' : '') : 'visually-hidden'}>
      {notice?.message}{notice && <button className="icon-button" aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={16}/></button>}
    </div>
    {action?.type === 'auth' && <AuthDialog initialMode="login" onClose={() => setAction(null)} onAuthenticate={authenticate}/>}
    {action?.type === 'add' && user && <AddToPlanDialog action={action} onClose={() => setAction(null)} onAdd={confirmPlan}
      loading={personalLoading} loadError={personalError} onRetry={reloadPersonal}
      scheduledDay={action.week === week && entries.find(item => item.activityId === action.id)?.day}/>}
  </>
}

createRoot(document.getElementById('root')).render(<App/>)
