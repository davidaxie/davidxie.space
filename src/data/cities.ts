export interface CityMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
  /**
   * Two-or-three-word tie to the place — "Birthplace", "School", "Moving
   * Sept 2026". The panel and the chips both read it as a glance-level answer
   * to "why is this dot on his globe?", which is the question the old
   * straight-to-gallery flow never answered.
   */
  tie?: string;
  /**
   * Why the place matters, in first person. Required rather than
   * optional: a city with photos but no context is exactly the confusion this
   * redesign removes, so the type makes adding a city without copy a
   * compile error instead of a silently empty panel.
   */
  blurb: string;
}

/**
 * Every city on the globe. lat/lng drive the 3D marker positions in
 * EarthGlobe → CityLabel, so they are coordinates, not layout knobs.
 *
 * Adding a place = one entry here plus its photos in memories.ts. Nothing in
 * the components names a city id, so counts, chips, dots and galleries all
 * follow from this array.
 */
export const cities: CityMarker[] = [
  {
    id: 'boston',
    name: 'Boston',
    lat: 42.3601,
    lng: -71.0589,
    country: 'US',
    tie: 'School',
    blurb:
      'Where I landed after Shanghai and grew up, eleven to nineteen — middle school here, then four years at St. Mark\'s.',
  },
  {
    id: 'new-york',
    name: 'New York',
    lat: 40.7128,
    lng: -74.006,
    country: 'US',
    // NOT "Second home": that would claim a residence. Every other tie here
    // is a fact (birthplace, school, a dated move); this one has to be too.
    tie: 'Always there',
    blurb:
      'No school here, no job here — I\'m just in New York constantly because I love it. The energy, the aesthetics.',
  },
  {
    id: 'san-francisco',
    name: 'San Francisco',
    lat: 37.7749,
    lng: -122.4194,
    country: 'US',
    tie: 'Moving Sept 2026',
    // FUTURE TENSE, on purpose. He does not live here yet; present tense would
    // state something false on a page about a real person.
    blurb:
      'Moving out in September 2026 to build, learn and explore. The energy and the creativity are the whole draw.',
  },
  {
    id: 'dc',
    name: 'Washington DC',
    lat: 38.9072,
    lng: -77.0369,
    country: 'US',
    tie: 'Georgetown',
    blurb: 'Georgetown — where I\'m studying now.',
  },
  {
    id: 'shanghai',
    name: 'Shanghai',
    lat: 31.2304,
    lng: 121.4737,
    country: 'CN',
    tie: 'Birthplace',
    blurb: 'Where I was born, and home until I was eleven.',
  },
];
