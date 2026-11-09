import { expect, test } from 'claude-code/testing'
import { GROUP_TAGLINE, groupOf, skinTagline, skinsSummary } from './skinslook'

// "The secret shall be a secret": the Skins pane never hints that anything is hidden.
const HINTS = /secret|hidden|locked|unlock|\?\?\?|there's more|ghost|tyger|say my name|what'?s my name|takavic|0\+2=1|hi capri|new suit|season 3|guardians|think,? mark|chicanery|namaste|saul3d|1216/i

test('skins pane: the banner counts only the skins on offer', () => {
  expect(skinsSummary(1)).toEqual(['1 skin'])
  expect(skinsSummary(7)).toEqual(['7 skins'])
})

test('skins pane: no group tagline or visible-skin tagline hints at a secret', () => {
  for (const line of Object.values(GROUP_TAGLINE)) expect(HINTS.test(line)).toBe(false)
  for (const id of ['default', 'crab-classic', 'mentalist', 'breaking-bad', 'better-call-saul', 'cyberpunk-2077', 'arasaka', 'lucy-edgerunners', 'edgerunners-2', 'invincible'])
    expect(HINTS.test(skinTagline(id, ''))).toBe(false)
})

test('skins pane: Invincible sits under TV shows in both eras', () => {
  expect(groupOf('invincible', true)).toBe('tv')
  expect(groupOf('invincible2', true)).toBe('tv')
  expect(groupOf('invincible', false)).toBe('yours')
})

test('skins pane: Caliper is a Classic in both faces, with its own tagline', () => {
  expect(groupOf('caliper', true)).toBe('classics')
  expect(groupOf('caliperlight', true)).toBe('classics')
  expect(skinTagline('caliper', '')).toBe('Graphite and ice: a dial, a ruler, one blue')
})
