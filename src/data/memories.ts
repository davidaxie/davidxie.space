export interface MemoryPhoto {
  src: string;
  /**
   * Alt text, rendered on the <img> that sits directly above `caption` in the
   * same <figure> (CityPanel). It must therefore say something the caption
   * does NOT — an alt byte-identical to its caption makes a screen reader
   * announce the same string twice for one photo, which is noise, not access.
   *
   * If there is nothing honest to add beyond the caption, use `alt: ''`. That
   * is the correct value here, not a cop-out: an empty alt marks the image
   * decorative, the figure is skipped, and the caption — which is real page
   * text either way — carries the meaning for everyone. Never invent framing
   * details ("golden hour", "from below") that nobody has verified against the
   * actual file.
   */
  alt: string;
  caption?: string;
  city: string;
  /**
   * Shown on the face of the city card, above the fold, next to the blurb.
   * One or two per city: these are the shots that *illustrate the sentence*,
   * not the best-looking ones — Boston's copy is about school, so the school
   * squash photos lead and the rest of the roll waits one click deeper.
   *
   * Optional by design. A city added later with no flags still renders (the
   * panel falls back to its first photos), so new places never arrive broken.
   */
  featured?: boolean;
}

/**
 * The full roll, every city. Nothing here is trimmed for the UI — the panel
 * shows `featured` first and keeps the rest behind an explicit "view all",
 * so adding photos to a city is a copy-paste here and nothing else.
 */
export const memories: MemoryPhoto[] = [
  // Boston
  {
    src: '/memories/boston/squash-match.jpg',
    alt: 'A St. Mark\'s player in eye guards, racquet down, ball at his feet',
    caption: 'Squash Match',
    city: 'boston',
    featured: true,
  },
  {
    src: '/memories/boston/squash-court.jpg',
    alt: 'Utility lines and a guardrail above still water after sunset',
    caption: 'Water At Dusk',
    city: 'boston',
  },
  {
    src: '/memories/boston/squash-outdoor.jpg',
    alt: 'A dozen friends in summer clothes outside brick buildings',
    caption: 'Group Photo',
    city: 'boston',
  },
  {
    src: '/memories/boston/squash-team-trophy.jpg',
    alt: 'The team and coach on court with the Massachusetts-shaped NEPSAC plaque',
    caption: 'Team Champions',
    city: 'boston',
    featured: true,
  },
  {
    src: '/memories/boston/squash-nepsac-trophy.jpg',
    alt: 'Two players with the 2025 Class C boys squash plaque, banners behind',
    caption: 'NEPSAC Champions',
    city: 'boston',
  },
  // New York
  {
    src: '/memories/new-york/midtown-skyline.jpg',
    alt: 'Two friends in the Main Concourse, the brass four-faced clock behind them',
    caption: 'Grand Central',
    city: 'new-york',
    featured: true,
  },
  {
    src: '/memories/new-york/edge-bw.jpg',
    alt: 'Standing on the glass sky deck, the Empire State Building far below',
    caption: 'Above Manhattan',
    city: 'new-york',
    featured: true,
  },
  {
    src: '/memories/new-york/chelsea-market.jpg',
    alt: 'Framed between two Midtown towers from the sidewalk in winter',
    caption: 'Empire State Building',
    city: 'new-york',
  },
  {
    src: '/memories/new-york/greenwich-village.jpg',
    alt: 'Cast-iron lofts and fire escapes above a snow-lined street',
    caption: 'SoHo',
    city: 'new-york',
  },
  {
    src: '/memories/new-york/one-wtc.jpg',
    alt: 'Looking up past bare winter trees at the tower\'s spire',
    caption: 'One World Trade Center',
    city: 'new-york',
  },
  {
    src: '/memories/new-york/battery-park.jpg',
    alt: 'Riveted steel columns and exposed brick around a long shared table',
    caption: 'Loft Office',
    city: 'new-york',
  },
  {
    src: '/memories/new-york/east-village.jpg',
    alt: 'Tenement stoops and fire escapes on a snowy block',
    caption: 'East Village',
    city: 'new-york',
  },
  // San Francisco
  {
    src: '/memories/san-francisco/golden-gate-portrait.jpg',
    alt: 'A person on a windy overlook, the bridge tower and roadway traffic behind',
    caption: 'Golden Gate Bridge',
    city: 'san-francisco',
    featured: true,
  },
  {
    src: '/memories/san-francisco/golden-gate-view.jpg',
    alt: 'Two friends on a coastal trail, the bridge tower small in the distance',
    caption: 'Golden Gate Vista',
    city: 'san-francisco',
  },
  {
    src: '/memories/san-francisco/golden-gate-selfie.jpg',
    alt: 'Two friends beside a coin-operated tower viewer above the water',
    caption: 'Bay Overlook',
    city: 'san-francisco',
  },
  {
    src: '/memories/san-francisco/golden-gate-bridge.jpg',
    alt: 'Posing against a stone wall with the bridge tower behind',
    caption: 'Golden Gate Lookout',
    city: 'san-francisco',
  },
  {
    src: '/memories/san-francisco/fishermans-wharf.jpg',
    alt: 'Four friends on a lit waterfront promenade with blue railings',
    caption: 'Ferris Wheel At Night',
    city: 'san-francisco',
  },
  {
    src: '/memories/san-francisco/sf-streets.jpg',
    alt: 'Four teammates behind an open laptop showing the project they built',
    caption: 'CalHacks Demo Table',
    city: 'san-francisco',
  },
  {
    src: '/memories/san-francisco/sf-park.jpg',
    alt: 'A laptop open on the passenger seat, a Muni bus and city street outside',
    caption: 'Coding In The Car',
    city: 'san-francisco',
  },
  {
    src: '/memories/san-francisco/berkeley-hills.jpg',
    alt: 'Four friends at night under the floodlit clock tower',
    caption: 'Sather Tower',
    city: 'san-francisco',
  },
  {
    src: '/memories/san-francisco/berkeley-view.jpg',
    alt: 'Three people working above a valley of city lights',
    caption: 'Laptops On The Hill',
    city: 'san-francisco',
  },
  {
    src: '/memories/san-francisco/berkeley-group.jpg',
    alt: 'One person, arm raised over the city lights at night',
    caption: 'Laptop Held High',
    city: 'san-francisco',
  },
  {
    src: '/memories/san-francisco/berkeley-sather.jpg',
    alt: 'Three friends in the sun beside the green ironwork',
    caption: 'Sather Gate',
    city: 'san-francisco',
    featured: true,
  },
  {
    src: '/memories/san-francisco/berkeley-overlook.jpg',
    alt: 'Three friends sitting on a ledge outside a lit building after dark',
    caption: 'On The Wall',
    city: 'san-francisco',
  },
  {
    src: '/memories/san-francisco/bay-area-south.jpg',
    alt: 'Four friends in branded aprons around a divided pot',
    caption: 'Hotpot Night',
    city: 'san-francisco',
  },
  {
    src: '/memories/san-francisco/silicon-valley.jpg',
    alt: 'Two people at a long table, one pointing at the camera',
    caption: 'Study Session',
    city: 'san-francisco',
  },
  {
    src: '/memories/san-francisco/palo-alto.jpg',
    alt: 'Two friends on the Quad below the mosaic facade',
    caption: 'Stanford Memorial Church',
    city: 'san-francisco',
  },
  // Washington DC
  {
    src: '/memories/dc/georgetown-campus.jpg',
    alt: 'The clock tower and arched stone facade from below, lit by evening sun',
    caption: 'Healy Hall',
    city: 'dc',
    featured: true,
  },
  {
    src: '/memories/dc/georgetown-healy.jpg',
    alt: 'Xcode and an iPhone simulator on one screen, a second laptop beside it',
    caption: 'Building the App',
    city: 'dc',
  },
  {
    src: '/memories/dc/georgetown-street.jpg',
    alt: 'Three friends at a table under model biplanes and aviation posters',
    caption: 'Brunch at Clyde\'s',
    city: 'dc',
  },
  {
    src: '/memories/dc/washington-monument.jpg',
    alt: 'The obelisk over snow-covered ground, streaked by motion blur',
    caption: 'Washington Monument',
    city: 'dc',
  },
  {
    src: '/memories/dc/capitol.jpg',
    alt: 'The dome at the end of an empty avenue, bare winter trees on both sides',
    caption: 'US Capitol',
    city: 'dc',
  },
  {
    src: '/memories/dc/national-mall.jpg',
    alt: 'A portrait on a tree-lined walk, the dome centred behind',
    caption: 'At the Capitol',
    city: 'dc',
  },
  {
    src: '/memories/dc/georgetown-selfie.jpg',
    alt: 'A neon vertical marquee above a corner coffee shop, snow at the curb',
    caption: 'The Georgetown Sign',
    city: 'dc',
    featured: true,
  },
  {
    src: '/memories/dc/georgetown-friends.jpg',
    alt: 'Croissants and danishes behind glass, a chalkboard pricing beignets',
    caption: 'Pastry Case',
    city: 'dc',
  },
  {
    src: '/memories/dc/georgetown-quad.jpg',
    alt: 'Black-and-white view of the spire framed by leafy branches',
    caption: 'Healy Through Trees',
    city: 'dc',
  },
  {
    src: '/memories/dc/georgetown-summer.jpg',
    alt: 'Two friends on a sidewalk in sleeveless shirts, a flower basket behind',
    caption: 'Summer Selfie',
    city: 'dc',
  },
  {
    src: '/memories/dc/dca-takeoff.jpg',
    alt: 'The obelisk, the Mall and the dome seen through broken cloud',
    caption: 'DC From Above',
    city: 'dc',
  },
  {
    src: '/memories/dc/airplane-window.jpg',
    alt: 'A wing and its flap fairings over cloud, framed by the cabin window',
    caption: 'Above the Clouds',
    city: 'dc',
  },
  {
    src: '/memories/dc/group-retreat.jpg',
    alt: 'A large group on a wooden deck under heavy cloud, wooded hills behind',
    caption: 'Group Retreat',
    city: 'dc',
  },
  {
    src: '/memories/dc/friends-hangout.jpg',
    alt: 'Friends piled onto a couch and coffee table, shot in black and white',
    caption: 'The Living Room',
    city: 'dc',
  },
  // Shanghai
  {
    src: '/memories/shanghai/bund-jumping.jpg',
    alt: 'Two figures mid-jump on the promenade, crowds at the railing behind',
    caption: 'The Bund at Night',
    city: 'shanghai',
    featured: true,
  },
  {
    src: '/memories/shanghai/the-bund.jpg',
    alt: 'Lit towers mirrored in still water, the Oriental Pearl Tower at the edge',
    caption: 'Pudong Skyline',
    city: 'shanghai',
    featured: true,
  },
  {
    src: '/memories/shanghai/pudong-skyline.jpg',
    alt: 'Crowds crossing a plaza between a monogrammed flagship and a metro entrance',
    caption: 'Reserve Roastery',
    city: 'shanghai',
  },
  {
    src: '/memories/shanghai/lujiazui.jpg',
    alt: 'A dark hall lined with framed car photographs on a decade timeline',
    caption: 'Porsche Exhibition',
    city: 'shanghai',
  },
  {
    src: '/memories/shanghai/lujiazui-towers.jpg',
    alt: 'A number 92 endurance car on a plinth, the street visible through glass',
    caption: 'Porsche Race Car',
    city: 'shanghai',
  },
  {
    src: '/memories/shanghai/nanjing-road.jpg',
    alt: 'A blurred selfie on a moving escalator, other riders ahead',
    caption: 'On the Escalator',
    city: 'shanghai',
  },
  {
    src: '/memories/shanghai/downtown.jpg',
    alt: 'Two people pointing up at the World Financial Center and Shanghai Tower',
    caption: 'Lujiazui at Night',
    city: 'shanghai',
  },
  {
    src: '/memories/shanghai/car-museum.jpg',
    alt: 'Sashimi on ice, a claypot and grilled eel across a wooden table',
    caption: 'Sushi Dinner',
    city: 'shanghai',
  },
];
