function durationBucket(minutes) {
  if (minutes <= 10) return 'quick'
  if (minutes <= 20) return 'medium'
  return 'long'
}

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[–—]/g, '-')
}

export function createCatalogFilters({ dimensions, taxonomy }) {
  const fieldLabels = Object.fromEntries(
    dimensions.map(({ id, options }) => [id, new Map(options.map(option => [option.id, option.label]))]),
  )
  const goalSearchNames = new Map(taxonomy.flatMap(({ label, children }) =>
    children.map(child => [child.id, `${label} ${child.label}`]),
  ))

  function matches(activity, filters = {}, search = '') {
    const values = {
      ages: activity.ages,
      skills: activity.skills,
      duration: [durationBucket(activity.minutes)],
      materialType: [activity.materialType],
      format: [activity.format],
      goals: activity.goals,
    }
    const passesFilters = Object.entries(values).every(([group, options]) => {
      const selected = filters[group]
      return !selected?.length || selected.some(id => options.includes(id))
    })
    if (!passesFilters) return false

    const terms = normalize(search.trim()).split(/\s+/).filter(Boolean)
    if (!terms.length) return true

    const searchableText = normalize([
      activity.title, activity.description, ...activity.materials, ...activity.skills,
      ...activity.ages.map(id => fieldLabels.ages.get(id)),
      fieldLabels.materialType.get(activity.materialType),
      fieldLabels.format.get(activity.format),
      ...activity.goals.map(id => goalSearchNames.get(id)),
    ].join(' '))
    return terms.every(term => searchableText.includes(term))
  }

  function getChips(filters = {}) {
    const selectedGoals = new Set(filters.goals)
    const goalChips = taxonomy.flatMap(({ id, label, children }) => {
      if (children.every(child => selectedGoals.has(child.id))) {
        return [{ group: 'goals', id, label }]
      }
      return children.filter(child => selectedGoals.has(child.id)).map(child => ({ group: 'goals', ...child }))
    })
    const dimensionChips = dimensions.flatMap(({ id: group, options }) =>
      options.filter(option => filters[group]?.includes(option.id)).map(option => ({ group, ...option })),
    )
    return [...goalChips, ...dimensionChips]
  }

  function removeChip(filters, { group, id }) {
    const parent = group === 'goals' && taxonomy.find(goal => goal.id === id)
    const removed = new Set(parent ? parent.children.map(child => child.id) : [id])
    return { ...filters, [group]: (filters[group] ?? []).filter(value => !removed.has(value)) }
  }

  return { matches, getChips, removeChip }
}
