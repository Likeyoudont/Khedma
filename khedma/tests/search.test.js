import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveService, resolveCity, cityMatches, chosenService, chosenCity, suggestServices } from '../src/search/matching.js'
import { workerAlternatives } from '../src/search/alternatives.js'
import { readFileSync } from 'node:fs'
const t = key => key

test('service search accepts aliases and corrects unambiguous typos', () => {
  assert.equal(resolveService('paint', t).key, 'painting')
  assert.equal(resolveService('electirici', t).key, 'electricity')
  assert.equal(resolveService('plumbr', t).key, 'plumbing')
  assert.equal(resolveService('كهرباء', t).key, 'electricity')
  assert.equal(resolveService('spaceship repair', t).key, '')
  assert.equal(resolveService('pa', t).key, '')
})

test('real translations preserve Plombier and fuzzy matches require an explicit choice', () => {
  const locales = Object.fromEntries(['en', 'fr', 'ar'].map(language => [language, JSON.parse(readFileSync(new URL(`../src/i18n/locales/${language}.json`, import.meta.url)))]))
  for (const language of ['en', 'fr', 'ar']) {
    const translate = (key, options = {}) => key.split('.').reduce((value, part) => value?.[part], locales[options.lng || language]) || key
    assert.deepEqual(suggestServices('plombier', translate), ['plumbing'])
    assert.deepEqual(suggestServices('plombi', translate), ['plumbing'])
    assert.equal(chosenService('plombier', translate), 'plumbing')
    assert.equal(chosenService('elecrtr', translate), '')
    assert.equal(suggestServices('elecrtr', translate)[0], 'electricity')
    assert.equal(chosenService(translate('services.electricity.name'), translate), 'electricity')
  }
  assert.equal(chosenCity('figuig'), 'Figuig')
  assert.equal(chosenCity('rabaat'), 'rabaat')
  assert.equal(cityMatches('Rabat', 'rabaat'), false)
})

test('an empty city offers available matching workers elsewhere without claiming travel coverage', () => {
  const workers = [
    { id: 1, location: 'Rabat', specialties: ['plumbing'], available: true, rating: 4 },
    { id: 2, location: 'Salé', specialties: ['electricity'], available: true, rating: 5 },
    { id: 3, location: 'Casablanca', specialties: ['plumbing'], available: false, rating: 5 },
  ]
  const alternatives = workerAlternatives(workers, { service: 'plumbing', location: 'Figuig' })
  assert.deepEqual(alternatives.localServices, [])
  assert.deepEqual(alternatives.otherWorkers.map(worker => worker.id), [1])
  assert.deepEqual(workerAlternatives(workers, { location: 'Figuig' }).otherWorkers.map(worker => worker.id), [2, 1])
  assert.deepEqual(workerAlternatives(workers, { service: 'plumbing', location: 'Salé' }).localServices, ['electricity'])
  assert.deepEqual(workerAlternatives(workers, { service: 'painting', location: 'Figuig' }).elsewhereServices, ['plumbing', 'electricity'])
})
test('city matching supports accents, Arabic aliases and conservative typo correction', () => {
  assert.equal(cityMatches('Salé', 'sale'), true)
  assert.equal(cityMatches('Rabat', 'الرباط'), true)
  assert.equal(cityMatches('Fès', 'فاس'), true)
  assert.equal(cityMatches('Oujda', 'Rabat'), false)
  assert.equal(resolveCity('rabaat').label, 'Rabat')
  assert.equal(resolveCity('Unknown city').label, 'Unknown city')
})

test('expanded trades match Moroccan search terms and specific materials', () => {
  for (const [query, key] of [
    ['fix metal door', 'metalwork'], ['porte métallique', 'metalwork'], ['حداد', 'metalwork'],
    ['fix climat', 'air_conditioning'], ['كليما', 'air_conditioning'], ['washing machine', 'appliances'],
    ['machine a laver', 'appliances'], ['غسالة', 'appliances'], ['aluminium', 'aluminium'], ['glass', 'glass'], ['جزار', 'butcher'],
    ['نجار', 'carpentry'], ['serrurier', 'locksmith'], ['زلايجي', 'tiling'],
  ]) assert.equal(resolveService(query, t).key, key, query)
})

test('partial and misspelled service names work across languages', () => {
  for (const [query, key] of [['elecrtr', 'electricity'], ['plombi', 'plumbing'], ['demen', 'moving'], ['كهربا', 'electricity'], ['كهرباي', 'electricity'], ['تنضيف', 'cleaning'], ['تنضف', 'cleaning'], ['نقل العفش', 'moving']]) {
    assert.equal(resolveService(query, t).key, key, query)
  }
})
