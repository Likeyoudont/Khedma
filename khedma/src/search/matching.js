const serviceAliases = {
  other: ['other', 'autres', 'autre', 'other work', 'خدمات أخرى', 'مهن أخرى'],
  plumbing: ['plumber', 'plumbers', 'plombier', 'plombiers', 'plomberie'],
  electricity: ['elec', 'electr', 'electric', 'electrical', 'electrician', 'electricians', 'électricité', 'electricite', 'كهرباء', 'كهربائي', 'كهربائيين'],
  painting: ['paint', 'painter', 'peinture', 'صباغة', 'دهان'],
  doors: ['door', 'porte', 'أبواب'],
  walls: ['wall', 'repair', 'home repair', 'home maintenance', 'mur', 'جدران'],
  cleaning: ['cleaner', 'ménage', 'menage', 'nettoyage', 'تنظيف', 'تنضيف'],
  moving: ['mover', 'movers', 'moving house', 'house move', 'furniture transport', 'transport', 'déménagement', 'demenagement', 'déménageur', 'transport meubles', 'نقل', 'نقل الأثاث', 'ترحيل', 'نقل العفش', 'ديموناج'],
  garden: ['gardener', 'gardening', 'jardinage', 'حديقة'],
  metalwork: ["metal door", "steel door", "iron gate", "welding", "welder", "soudure", "soudeur", "ferronnier", "ferronnerie", "porte en métal", "porte métallique", "حداد", "حدادة", "سوداج", "لحام", "باب حديد"],
  air_conditioning: ["clim", "climat", "climatisation", "climatiseur", "air conditioner", "aircon", "ac repair", "كليما", "مكيف", "تكييف", "إصلاح المكيف"],
  appliances: ["washing machine", "washer", "fridge", "refrigerator", "dishwasher", "electric oven", "machine a laver", "électroménager", "frigo", "غسالة", "ثلاجة", "ماكينة الصابون", "تصليح الأجهزة"],
  aluminium: ["aluminium", "aluminum", "fenêtre aluminium", "ألمنيوم", "المنيوم", "ألومنيوم"],
  glass: ["glass", "glazier", "vitrier", "vitrage", "زجاج"],
  butcher: ["butcher", "boucher", "jazar", "جزار", "جزارة"],
  carpentry: ["carpenter", "carpentry", "furniture", "furniture assembly", "menuiserie", "menuisier", "meuble", "montage meubles", "نجار", "نجارة", "أثاث"],
  locksmith: ["locksmith", "lock", "locks", "keys", "serrurier", "serrurerie", "serrure", "clé", "قفل", "أقفال", "مفاتيح", "ساروت"],
  tiling: ["tile", "tiles", "tiling", "zellige", "carrelage", "carreleur", "زليج", "زلايجي", "بلاط"],

}

export function normalize(value) {
  return value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function editDistance(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0]
    row[0] = i

    for (let j = 1; j <= right.length; j += 1) {
      const current = row[j]
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (left[i - 1] === right[j - 1] ? 0 : 1),
      )
      previous = current
    }
  }

  return row[right.length]
}

function serviceCandidates(t) {
  const candidate = (key, label) => ({ key, value: normalize(label), words: queryWords(label) })
  return Object.keys(serviceAliases).flatMap(key => [
    candidate(key, key),
    ...['en', 'fr', 'ar'].map(lng => candidate(key, t(`services.${key}.name`, { lng }))),
    ...serviceAliases[key].map(alias => candidate(key, alias)),
  ]).filter(item => item.value && !item.value.startsWith('services'))
}

function queryWords(value) {
  return value.split(/[^\p{L}\p{N}]+/u).map(normalize).filter(Boolean).join(' ')
}

export function suggestServices(query, t) {
  const value = normalize(query)
  if (value.length < 2) return []
  const ranked = new Map()
  for (const item of serviceCandidates(t)) {
    let score = Infinity
    if (item.value === value) score = 0
    else if (item.value.startsWith(value)) score = 1
    else if (value.length >= 3) {
      const distance = Math.min(editDistance(value, item.value), ...[-1, 0, 1].map(offset => editDistance(value, item.value.slice(0, value.length + offset))))
      if (distance <= Math.max(1, Math.floor(value.length * .25))) score = 2 + distance
    }
    if (score < (ranked.get(item.key) ?? Infinity)) ranked.set(item.key, score)
  }
  const matches = [...ranked].filter(([, score]) => Number.isFinite(score)).sort((a, b) => a[1] - b[1])
  // An exact name must never compete with a loosely similar trade.
  const best = matches[0]?.[1]
  return matches.filter(([, score]) => best <= 1 ? score === best : score <= best + 1).slice(0, 4).map(([key]) => key)
}

// Fuzzy matches are choices for the user, never an implicit change of service.
export function chosenService(query, t) {
  const value = normalize(query)
  if (!value) return ''
  const candidates = serviceCandidates(t)
  const exact = candidates.find(candidate => candidate.value === value)
  if (exact) return exact.key
  const words = ` ${queryWords(query)} `
  return candidates.filter(candidate => candidate.value !== 'repair' && words.includes(` ${candidate.words} `))
    .sort((a, b) => b.value.length - a.value.length)[0]?.key || ''
}

export function resolveService(query, t) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return { key: '', suggested: false }

  const candidates = serviceCandidates(t)
  const exact = candidates.find((candidate) => candidate.value === normalizedQuery)
  if (exact) return { key: exact.key, suggested: false }

  const queryWords = query.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^\p{L}\p{N}]+/u)
  const phraseMatch = candidates.filter(candidate => candidate.value !== 'repair' && (queryWords.includes(candidate.value) || (candidate.value.length > 3 && normalizedQuery.includes(candidate.value)))).sort((a, b) => b.value.length - a.value.length)[0]
  if (phraseMatch && normalizedQuery.length > 2) {
    return { key: phraseMatch.key, suggested: false }
  }

  const nearest = candidates
    .map((candidate) => ({ ...candidate, distance: editDistance(normalizedQuery, candidate.value) }))
    .filter((candidate) => candidate.value.length > 3)
    .sort((a, b) => a.distance - b.distance)[0]

  const runnerUp = candidates.filter(candidate => candidate.key !== nearest?.key).map(candidate => editDistance(normalizedQuery, candidate.value)).sort((a, b) => a - b)[0]
  if (nearest && normalizedQuery.length >= 4 && nearest.distance < runnerUp && nearest.distance <= Math.max(1, Math.floor(normalizedQuery.length * 0.3))) {
    return { key: nearest.key, suggested: true }
  }

  const suggestions = suggestServices(query, t)
  if (normalizedQuery.length >= 3 && suggestions.length === 1) return { key: suggestions[0], suggested: true }
  return { key: '', suggested: false }
}


const cityGroups = [
 ['Rabat', 'رباط', 'الرباط'], ['Salé', 'sale', 'سلا'], ['Fès', 'fes', 'fez', 'فاس'],
 ['Oujda', 'وجدة'], ['Casablanca', 'casa', 'الدار البيضاء'], ['Marrakech', 'marrakesh', 'مراكش'],
 ['Tangier', 'tanger', 'طنجة'], ['Agadir', 'أكادير', 'اكادير'], ['Meknès', 'meknes', 'مكناس'],
 ['Tétouan', 'tetouan', 'تطوان'], ['Kenitra', 'kénitra', 'القنيطرة'],
 ['Figuig', 'figuig', 'fguig', 'فكيك', 'فجيج'],
]
export function resolveCity(query, cities = []) {
 const value = normalize(query)
 if (!value) return { key: '', label: '', suggested: false }
 const groups = [...cityGroups, ...cities.filter(city => !cityGroups.some(group => group.some(alias => normalize(alias) === normalize(city)))).map(city => [city])]
 const exact = groups.find(group => group.some(alias => normalize(alias) === value))
 if (exact) return { key: normalize(exact[0]), label: exact[0], suggested: false }
 const ranked = groups.map(group => ({ group, distance: Math.min(...group.map(alias => editDistance(value, normalize(alias)))) })).sort((a, b) => a.distance - b.distance)
 if (value.length >= 4 && ranked[0]?.distance <= Math.max(1, Math.floor(value.length * .25)) && ranked[0].distance < (ranked[1]?.distance ?? Infinity)) return { key: normalize(ranked[0].group[0]), label: ranked[0].group[0], suggested: true }
 return { key: value, label: query.trim(), suggested: false }
}
export function chosenCity(query, cities = []) {
 const match = resolveCity(query, cities)
 return match.suggested ? query.trim() : match.label
}
export function cityMatches(city, query) {
 if (!query) return true
 return normalize(chosenCity(city)) === normalize(chosenCity(query)) || normalize(city).includes(normalize(query))
}
