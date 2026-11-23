import { useCallback, useEffect, useRef, useState } from 'react'
import { request } from './api.js'

const weekdaysPerWeek = 7
const savedKey = 'saved'
const emptyItems = []
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })

function parseWeek(week) {
  return new Date(week + 'T00:00:00Z')
}

function changeDate(date, days) {
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function currentWeek() {
  const now = new Date()
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  return changeDate(today, -((today.getUTCDay() + 6) % weekdaysPerWeek))
}

export function shiftWeek(week, offset) {
  return changeDate(parseWeek(week), offset * weekdaysPerWeek)
}

export function formatWeek(week) {
  const start = parseWeek(week)
  const end = parseWeek(changeDate(parseWeek(week), weekdaysPerWeek - 1))
  const startDay = monthFormat.format(start) + ' ' + start.getUTCDate()
  const endDay = monthFormat.format(end) + ' ' + end.getUTCDate()
  const year = end.getUTCFullYear()

  if (start.getUTCFullYear() !== year) return `${startDay}, ${start.getUTCFullYear()}–${endDay}, ${year}`
  if (start.getUTCMonth() !== end.getUTCMonth()) return `${startDay}–${endDay}, ${year}`
  return `${startDay}–${end.getUTCDate()}, ${year}`
}

function personalPath(key, slug) {
  const segment = slug === undefined ? '' : encodeURIComponent(slug) + '/'
  if (key === savedKey) return '/saved/' + segment
  return '/plan/' + segment + '?week=' + encodeURIComponent(key)
}

function personalItems(key, response) {
  return key === savedKey ? response.activityIds : response.entries
}

function getResource(scope, key) {
  if (!scope.resources.has(key)) scope.resources.set(key, { version: 0, writes: null, hasItems: false })
  return scope.resources.get(key)
}

function createScope(user) {
  return { user, resources: new Map(), plan: { writes: null, version: 0 } }
}

export function useThinkplore() {
  const [catalog, setCatalog] = useState(null)
  const [catalogError, setCatalogError] = useState(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const catalogVersion = useRef(0)
  const [scope, setScope] = useState(() => createScope(null))
  const activeScope = useRef(scope)
  const csrf = useRef(null)
  const authWrites = useRef(null)
  const sessionVersion = useRef(0)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionError, setSessionError] = useState(null)
  const [week, setWeek] = useState(currentWeek)
  const [personal, setPersonal] = useState({})
  const [hasScheduledActivities, setHasScheduledActivities] = useState(false)

  const reloadCatalog = useCallback(async () => {
    const version = ++catalogVersion.current
    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const data = await request('/catalog/')
      if (version === catalogVersion.current) setCatalog(data)
    } catch (error) {
      if (version === catalogVersion.current) setCatalogError(error.message)
    } finally {
      if (version === catalogVersion.current) setCatalogLoading(false)
    }
  }, [])

  const applySession = useCallback(data => {
    csrf.current = data.csrfToken
    if (data.user?.id !== activeScope.current.user?.id) {
      const nextScope = createScope(data.user)
      // A guest action can resume as soon as its authentication promise resolves.
      activeScope.current = nextScope
      setPersonal({})
      setHasScheduledActivities(false)
      setScope(nextScope)
    }
    setSessionError(null)
    setSessionLoading(false)
  }, [])

  const reloadSession = useCallback(async () => {
    if (authWrites.current) return
    const version = ++sessionVersion.current
    setSessionError(null)
    setSessionLoading(true)
    try {
      const data = await request('/auth/session/')
      if (version === sessionVersion.current) applySession(data)
    } catch (error) {
      if (version !== sessionVersion.current) return
      setSessionError(error.message)
      setSessionLoading(false)
    }
  }, [applySession])

  const authenticate = useCallback((action, body) => {
    ++sessionVersion.current
    const pending = (authWrites.current ?? Promise.resolve()).then(async () => {
      try {
        if (!csrf.current) applySession(await request('/auth/session/'))
        const data = await request('/auth/' + action + '/', { method: 'POST', body, csrfToken: csrf.current })
        applySession(data)
        return data.user
      } finally {
        setSessionLoading(false)
      }
    })
    const drained = pending.then(() => {}, () => {})
    authWrites.current = drained
    drained.then(() => {
      if (authWrites.current === drained) authWrites.current = null
    })
    return pending
  }, [applySession])

  const reportPersonal = useCallback((owner, key, update) => {
    setPersonal(current => {
      if (owner !== activeScope.current) return current
      return { ...current, [key]: { ...current[key], ...update } }
    })
  }, [])

  const readPersonal = useCallback(async (owner, key) => {
    if (owner !== activeScope.current || !owner.user) return
    const resource = getResource(owner, key)
    const plan = key === savedKey ? null : owner.plan
    const queue = plan ?? resource
    while (queue.writes) await queue.writes
    if (owner !== activeScope.current) return

    const version = ++resource.version
    const planVersion = plan ? ++plan.version : null
    reportPersonal(owner, key, { loading: true, error: null })

    try {
      const data = await request(personalPath(key))
      if (version !== resource.version || owner !== activeScope.current) return
      if (plan && planVersion === plan.version) setHasScheduledActivities(data.hasScheduledActivities)
      resource.hasItems = true
      reportPersonal(owner, key, { items: personalItems(key, data), loading: false, error: null })
    } catch (error) {
      if (version !== resource.version || owner !== activeScope.current) return
      reportPersonal(owner, key, { loading: false, error: error.message })
    }
  }, [reportPersonal])

  const writePersonal = useCallback((key, slug, method, body) => {
    const owner = activeScope.current
    if (!owner.user) return Promise.reject(new Error('Sign in to continue.'))
    const resource = getResource(owner, key)
    const plan = key === savedKey ? null : owner.plan
    // Plan writes return account-wide status, so queue them across weeks.
    const queue = plan ?? resource
    ++resource.version
    if (plan) ++plan.version
    const pending = (queue.writes ?? Promise.resolve()).then(async () => {
      if (owner !== activeScope.current) throw new Error('Your session changed. Please try again.')
      const data = await request(personalPath(key, slug), { method, body, csrfToken: csrf.current })
      if (owner !== activeScope.current) return
      if (plan) setHasScheduledActivities(data.hasScheduledActivities)
      resource.hasItems = true
      reportPersonal(owner, key, { items: personalItems(key, data), loading: false, error: null })
    })
    const drained = pending.then(
      () => {
        if (queue.writes === drained) queue.writes = null
      },
      () => {
        if (queue.writes === drained) queue.writes = null
        if (!resource.hasItems) void readPersonal(owner, key)
        else reportPersonal(owner, key, { loading: false })
      },
    )
    queue.writes = drained
    return pending
  }, [readPersonal, reportPersonal])

  useEffect(() => { void reloadCatalog() }, [reloadCatalog])
  useEffect(() => { void reloadSession() }, [reloadSession])
  useEffect(() => { void readPersonal(scope, savedKey) }, [readPersonal, scope])
  useEffect(() => { void readPersonal(scope, week) }, [readPersonal, scope, week])

  const reloadPersonal = () => Promise.all([readPersonal(scope, savedKey), readPersonal(scope, week)])
  const saved = personal[savedKey]
  const plan = personal[week]

  return {
    catalog,
    catalogError,
    catalogLoading,
    reloadCatalog,
    user: scope.user,
    sessionLoading,
    sessionError,
    reloadSession,
    savedIds: saved?.items ?? emptyItems,
    entries: plan?.items ?? emptyItems,
    hasScheduledActivities,
    week,
    changeWeek: offset => setWeek(current => shiftWeek(current, offset)),
    personalLoading: Boolean(scope.user && ((saved?.loading ?? true) || (plan?.loading ?? true))),
    personalError: saved?.error ?? plan?.error ?? null,
    reloadPersonal,
    register: data => authenticate('register', data),
    login: data => authenticate('login', data),
    logout: () => authenticate('logout', {}),
    setSaved: (slug, shouldSave) => writePersonal(savedKey, slug, shouldSave ? 'PUT' : 'DELETE'),
    addToPlan: (slug, day, targetWeek = week) => writePersonal(targetWeek, slug, 'PUT', { day }),
    setPlanDone: (slug, done, targetWeek = week) => writePersonal(targetWeek, slug, 'PATCH', { done }),
    removeFromPlan: (slug, targetWeek = week) => writePersonal(targetWeek, slug, 'DELETE'),
  }
}
