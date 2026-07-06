/**
 * Per-town local landing pages for the paving / site-work services, with a
 * `verified` publish gate ported from Hamptons Tree Experts `townships.ts`.
 *
 * The gate is enforced in THREE layers (see each `[town]/page.tsx`):
 *   1. sitemap only lists verified entries
 *   2. generateStaticParams only emits verified slugs + `export const dynamicParams = false`
 *   3. a runtime `notFound()` guard
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * VERIFIED towns (verified: true) have web-sourced localReferences with real
 * source URLs on file (see research notes in commit history). UNVERIFIED
 * towns are gated from production until upgraded.
 *
 * Remaining work:
 *   - Existing original 8 Hamptons/East End towns still need estate-lane and
 *     road-association upgrades (WebSearch was intermittently unavailable
 *     during the research session).
 *   - New South Fork towns (sag-harbor, bridgehampton, water-mill, sagaponack,
 *     wainscott, amagansett, montauk, north-haven, noyack, westhampton-beach,
 *     east-quogue, remsenburg, speonk) have content drafted from well-known,
 *     widely documented public facts but were not live web-verified with
 *     source URLs — flip verified only after a citation pass.
 *   - Cutchogue and blue-point were scoped but skipped (thin / tool outage).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type ServiceTownEntry = {
  serviceSlug: string; // must match a SiteService.slug
  townSlug: string; // must match a town in town-pages
  townName: string;
  /** Publish gate. Flip to true only after content is web-verified. */
  verified: boolean;
  /** Real neighboring hamlets (geographic fact). */
  nearbyTowns: string;
  /** Local intro paragraph. */
  intro: string;
  /** Real roads, neighborhoods, terrain, associations. */
  localReferences: string[];
  /** Common local project types for this service in this town. */
  commonProjects: string[];
};

type TownContent = { name: string; nearby: string; intro: string; localReferences: string[] };

// ── Town-level local content (service-neutral) ──────────────────────────────

const TOWN_CONTENT: Record<string, TownContent> = {
  // ── Home base ──────────────────────────────────────────────────────────────
  "center-moriches": {
    name: "Center Moriches",
    nearby: "East Moriches, Eastport, and Manorville",
    intro:
      "Center Moriches sits on the north shore of Moriches Bay in the Town of Brookhaven, where sandy, low-lying soil and seasonal storm runoff are hard on gravel driveways. Our supply yard is right here on Frowein Road, so local regrading, fresh stone, and drainage fixes are effectively a same-day service.",
    localReferences: [
      "Montauk Highway is the hamlet's main east–west spine",
      "Homes near Moriches Bay and Senix Creek sit on low, sandy ground prone to washout",
      "Our supply yard is in-hamlet on Frowein Road",
    ],
  },
  "east-moriches": {
    name: "East Moriches",
    nearby: "Center Moriches, Eastport, and Manorville",
    intro:
      "East Moriches fronts Moriches Bay just east of Center Moriches. Its waterfront and near-water lots see the same sandy soil and tidal-adjacent drainage that chew up gravel driveways — all minutes from our Frowein Road yard.",
    localReferences: [
      "Bayfront and near-cove lots sit on low, sandy, flood-adjacent ground",
      "Montauk Highway runs through the hamlet as its residential spine",
      "Directly east of Center Moriches, within our core service radius",
    ],
  },

  // ── West corridor (Center Moriches to Patchogue) ──────────────────────────
  moriches: {
    name: "Moriches",
    nearby: "Center Moriches, East Moriches, Brookhaven hamlet, and Eastport",
    intro:
      "Moriches is a small hamlet in the Town of Brookhaven along Moriches Bay, with flat, low-lying terrain typical of the south shore. Montauk Highway (NY-27A) is the main east–west artery, and the hamlet includes private waterfront communities that maintain their own internal roads.",
    localReferences: [
      "Montauk Highway (NY-27A) / Main Street is the principal road through the hamlet",
      "Holiday Beach Property Owners Association is a private waterfront community at Old Neck Road South that manages its own roads and common areas",
      "Flat, water-adjacent terrain typical of south-shore hamlets along Moriches Bay",
    ],
  },
  mastic: {
    name: "Mastic",
    nearby: "Mastic Beach, Shirley, Moriches, and Ridge",
    intro:
      "Mastic is bordered by the Long Island Central Pine Barrens to the north, giving much of the hamlet sandy, well-drained soil that's easy to grade but prone to washout in heavy rain. William Floyd Parkway (County Route 46) runs north–south through the hamlet, and the 613-acre William Floyd Estate (a National Park Service site) anchors the southern end.",
    localReferences: [
      "William Floyd Parkway (Suffolk CR 46) is the main north–south spine from Smith Point County Park to NY-25A",
      "William Floyd Estate is a 613-acre NPS site including the Old Mastic House, part of Fire Island National Seashore",
      "Long Island Central Pine Barrens sandy soil borders the hamlet's north side",
      "Neighborhood Road / Mastic Road form the local business corridor",
    ],
  },
  "mastic-beach": {
    name: "Mastic Beach",
    nearby: "Mastic, Shirley, Moriches, and Smith Point",
    intro:
      "Mastic Beach sits directly on Moriches Bay with a network of residential canals. High groundwater and low elevation mean roads have flooded during storms including Superstorm Sandy, and stormwater drainage is an active local issue — making post-storm gravel driveway repair and private-road resurfacing a recurring need.",
    localReferences: [
      "Mastic Beach Property Owners Association (MBPOA) at 31 Neighborhood Road is the hamlet's oldest and largest civic association",
      "Canal-front streets like Cranberry Drive sit at low elevation with recurring flood exposure",
      "A $1.9M state-funded stormwater and flood-mitigation drainage improvement project addresses chronic road flooding",
      "High groundwater renders many recharge basins ineffective; no sanitary sewers compound drainage issues during storms",
    ],
  },
  shirley: {
    name: "Shirley",
    nearby: "Mastic, Mastic Beach, Moriches, and Ridge",
    intro:
      "Shirley was developed in the 1940s by Walter T. Shirley as an affordable enclave on Mastic Bay, built partly on land acquired from the former Floyd estate. The hamlet borders the Wertheim National Wildlife Refuge along the Carmans River, a low, marshy area with wetlands and drainage-sensitive soil.",
    localReferences: [
      "William Floyd Parkway and Sunrise Highway are Shirley's main transportation routes",
      "Wertheim National Wildlife Refuge borders the hamlet along the Carmans River with four miles of trails",
      "Originally developed on land from the William Floyd estate by developer Walter T. Shirley in the 1930s–40s",
    ],
  },
  brookhaven: {
    name: "Brookhaven",
    nearby: "South Haven, Bellport, East Patchogue, and Yaphank",
    intro:
      "Brookhaven hamlet (not to be confused with the Town of Brookhaven) is a small, historic riverside community bounded by the Great South Bay and the lower Carmans River, adjoining the Wertheim National Wildlife Refuge. It retains a pre-suburban, rural character with country roads that lack sidewalks or streetlights.",
    localReferences: [
      "Beaver Dam Road is a gently meandering country road without sidewalks or streetlights, running from Squassux Landing over South Country Road",
      "Squassux Landing is a historic boat landing on the Carmans River",
      "Wertheim National Wildlife Refuge covers 2,400 acres of woodlands and marsh along the Carmans River bordering the hamlet",
      "Carmans River salt marshes at the hamlet's lower reaches serve as fish spawning and nursery habitat",
    ],
  },
  bellport: {
    name: "Bellport",
    nearby: "East Patchogue, North Bellport, Brookhaven hamlet, and South Country",
    intro:
      "Bellport is an incorporated village in the Town of Brookhaven with a National Register-listed historic district of 19th-century sea-captain homes along tree-lined streets. South Country Road (Suffolk CR 36) is the main east–west route, and private stone drives on landmarked estate properties are common.",
    localReferences: [
      "Bellport Village Historic District is listed on the National Register of Historic Places (1980) with six landmarked historic areas",
      "Bellport Lane is the main north–south road, historically lined with homes built by sea captains",
      "South Country Road (Suffolk CR 36) is the main route running from East Patchogue through to Brookhaven hamlet",
      "Private stone drives serve landmarked estate properties within the historic district",
      "North Bellport is a distinct, less formal neighborhood near the Bellport LIRR station",
    ],
  },
  "east-patchogue": {
    name: "East Patchogue",
    nearby: "Bellport, Patchogue, Brookhaven hamlet, and Medford",
    intro:
      "East Patchogue sits on a flat outwash plain south of the Harbor Hill and Ronkonkoma Moraines, giving it level terrain typical of Long Island's south shore. Montauk Highway, Sunrise Highway, and Medford Avenue are the main routes through the hamlet.",
    localReferences: [
      "Flat outwash-plain terrain south of the Harbor Hill and Ronkonkoma Moraines",
      "Montauk Highway is East Patchogue's main east–west road",
      "Medford Avenue and Sunrise Highway also run through the hamlet",
    ],
  },
  patchogue: {
    name: "Patchogue",
    nearby: "East Patchogue, Blue Point, Medford, and Bellport",
    intro:
      "Patchogue is an incorporated village in the Town of Brookhaven on the same flat outwash plain as its neighboring hamlets. Downtown is anchored by several named municipal parking fields serving Main Street and the Patchogue Theatre, making commercial parking-lot rehab a strong fit alongside residential driveway work.",
    localReferences: [
      "Oak Street Parking Fields (Municipal Lots 1 and 3) are bounded by Main Street, South Ocean Avenue, Oak Street, and Maple Avenue",
      "Terry Street West Municipal Parking Field (Municipal Lot 5) is bounded by Main Street, South Ocean Avenue, Terry Street, and Taylor Lane",
      "Church Street Municipal Parking Field (Municipal Lot 6) is bounded by Main Street, South Ocean Avenue, Church Street, and Railroad Avenue",
      "Downtown parking lots serve visitors to the Patchogue Theatre and Main Street shops",
      "Flat outwash-plain terrain shared with East Patchogue and Medford",
    ],
  },
  medford: {
    name: "Medford",
    nearby: "Patchogue, Coram, Farmingville, and East Patchogue",
    intro:
      "Medford sits at the edge of the Long Island Central Pine Barrens, where native soils are sandy, acidic, and low in organic matter — the product of glacial outwash. The hamlet developed around an 1843 LIRR station built in what was then flat pine wilderness, and its porous, fast-draining soil defines the site-work challenge.",
    localReferences: [
      "Sandy, acidic, low-organic-matter native soils at the Pine Barrens edge",
      "1843 LIRR Medford station was built in flat pine wilderness along the former Patchogue Stage Road",
      "Central Pine Barrens porous glacial outwash soil drains quickly and leaches nutrients",
    ],
  },

  // ── Eastport / West Hamptons corridor ─────────────────────────────────────
  eastport: {
    name: "Eastport",
    nearby: "East Moriches, Speonk, Remsenburg, and Manorville",
    intro:
      "Eastport sits on the Brookhaven–Southampton town line at the western edge of the Hamptons corridor, served by Montauk Highway near Sunrise Highway (NY-27). It's a mix of residential gravel drives and shared lanes.",
    localReferences: [
      "Straddles the Brookhaven / Southampton town boundary",
      "Served by Montauk Highway, near Sunrise Highway (NY-27)",
    ],
  },
  manorville: {
    name: "Manorville",
    nearby: "Eastport, Calverton, Ridge, and Yaphank",
    intro:
      "Manorville is a rural, wooded hamlet in the Long Island Pine Barrens, where sandy, well-drained soil and large lots mean long gravel driveways and shared private access roads are common. Its location near the LIE keeps it in easy reach of our yard.",
    localReferences: [
      "Sits within the Long Island Central Pine Barrens on sandy, well-drained soil",
      "Large rural lots produce long private gravel driveways",
      "Near Long Island Expressway (I-495) exits at the Brookhaven / Riverhead line",
    ],
  },
  westhampton: {
    name: "Westhampton",
    nearby: "Westhampton Beach, Remsenburg, Quiogue, and Speonk",
    intro:
      "Westhampton anchors the western Hamptons in the Town of Southampton. Sandy soil, high water tables, and barrier-beach exposure along Dune Road make gravel driveway and private-lane maintenance a recurring need.",
    localReferences: [
      "Dune Road runs the barrier beach with flood and overwash exposure",
      "Sandy, low-lying soil near Moriches and Quantuck bays",
      "Distinct from the villages of Westhampton Beach and Westhampton Dunes",
    ],
  },
  "westhampton-beach": {
    name: "Westhampton Beach",
    nearby: "Westhampton, Quogue, East Quogue, and Remsenburg",
    intro:
      "Westhampton Beach is an incorporated village in the Town of Southampton, serving as the western gateway to the Hamptons. The village sits on a barrier beach peninsula with oceanfront estates to the south and Moneybogue Bay to the north, and its Main Street commercial district generates parking-lot maintenance demand.",
    localReferences: [
      "Incorporated village distinct from the hamlet of Westhampton and the village of Westhampton Dunes",
      "Dune Road oceanfront estate road along the barrier beach with high-value waterfront properties",
      "Moneybogue Bay waterfront properties on the northern shore",
      "Main Street commercial district with parking areas needing seasonal maintenance",
      "Barrier island sandy soil is extremely well-draining but unstable for gravel surfaces without proper base course",
    ],
  },
  "east-quogue": {
    name: "East Quogue",
    nearby: "Quogue, Hampton Bays, Westhampton Beach, and Southampton",
    intro:
      "East Quogue is an unincorporated hamlet in the Town of Southampton between Quogue and Hampton Bays along the northern shore of Shinnecock Bay. It has a year-round residential character with a mix of homes and larger waterfront properties on sandy glacial outwash terrain.",
    localReferences: [
      "Shinnecock Bay waterfront forms East Quogue's southern border",
      "Unincorporated hamlet — no village government, so private road maintenance falls to property owners",
      "Old Country Road and Lewis Road corridors serve residential areas with private gravel roads",
      "Sandy glacial outwash soil on the broader South Fork outwash plain",
    ],
  },
  remsenburg: {
    name: "Remsenburg",
    nearby: "Speonk, Westhampton, Eastport, and Quogue",
    intro:
      "Remsenburg is an unincorporated hamlet in the Town of Southampton along the northern shore of Moriches Bay. The hamlet has a deliberately quiet, private character — heavily wooded lots, no commercial district, and many properties accessed via private gravel lanes through wooded parcels.",
    localReferences: [
      "Moriches Bay waterfront with estates on private gravel lanes through wooded parcels",
      "South Country Road is the hamlet's main east–west road with private driveways branching south toward the bay",
      "Almost entirely residential with no commercial district, emphasizing privacy and natural landscape",
      "Wooded, sandy terrain with some areas of higher water table near the bay shoreline",
    ],
  },
  speonk: {
    name: "Speonk",
    nearby: "Remsenburg, Eastport, Westhampton, and Center Moriches",
    intro:
      "Speonk is a small hamlet in the Town of Southampton along the LIRR Montauk Branch between Remsenburg and Eastport. It has a modest residential character and is close to our Center Moriches yard, making it an efficient service area.",
    localReferences: [
      "Speonk LIRR station on the Montauk Branch — the hamlet is organized around the rail corridor",
      "Phillips Avenue and surrounding residential streets",
      "Only minutes from Eastern LM's yard at 110 Frowein Road in Center Moriches",
      "Sandy glacial outwash terrain consistent with the broader South Shore plain",
    ],
  },
  quogue: {
    name: "Quogue",
    nearby: "Westhampton Beach, East Quogue, and Quiogue",
    intro:
      "The Village of Quogue is a wooded, affluent enclave in the Town of Southampton, known for large estate lots and oceanfront on Dune Road. Long gravel estate driveways and private lanes here need regular regrading and stone refresh.",
    localReferences: [
      "Incorporated village with large wooded estate lots",
      "Oceanfront frontage along Dune Road",
      "Quogue Wildlife Refuge lies within the village",
      "Sandy soil with long interior estate driveways",
    ],
  },

  // ── Hamptons / East End ───────────────────────────────────────────────────
  "hampton-bays": {
    name: "Hampton Bays",
    nearby: "East Quogue, Southampton, and Flanders",
    intro:
      "Hampton Bays is a year-round, commercially active hamlet between Shinnecock and Peconic bays. Its Montauk Highway business corridor and marina-area lots make gravel and RCA parking-lot rehab as relevant as residential driveway repair.",
    localReferences: [
      "Commercial corridor along Montauk Highway",
      "Located between Shinnecock Bay and Great Peconic Bay",
      "Marina and waterfront commercial lots on sandy fill",
    ],
  },
  southampton: {
    name: "Southampton",
    nearby: "Water Mill, North Sea, Shinnecock Hills, and Tuckahoe",
    intro:
      "The Village of Southampton and its oceanfront estate section are dense with large properties and long gravel or pea-stone driveways. Sandy coastal soil and seasonal use make regrading and stone refresh routine.",
    localReferences: [
      "Incorporated Village of Southampton in the Town of Southampton",
      "Oceanfront estate section on sandy coastal soil",
      "Long estate driveways and private oceanfront lanes",
    ],
  },
  "water-mill": {
    name: "Water Mill",
    nearby: "Bridgehampton, Southampton, Sagaponack, and North Sea",
    intro:
      "Water Mill is a hamlet in the Town of Southampton situated between Mecox Bay and Mill Pond, named for its historic 17th-century water-powered grist mill. The area features some of the Hamptons' most expensive estate properties on large lots, many accessed by long private gravel driveways.",
    localReferences: [
      "Water Mill historic grist mill, one of the oldest operating water mills in New York State, built 1644",
      "Mecox Bay waterfront estates feature extensive private gravel driveways and shared access lanes",
      "Halsey Lane and Deerfield Road corridor is a high-value estate area with multi-acre properties",
      "Flying Point Road runs south to Flying Point Beach with oceanfront estates along private gravel lanes",
      "Sandy glacial outwash soil with high water table near Mecox Bay",
    ],
  },
  bridgehampton: {
    name: "Bridgehampton",
    nearby: "Sagaponack, Water Mill, Sag Harbor, and Wainscott",
    intro:
      "Bridgehampton is a hamlet in the Town of Southampton known for its transformation from historic potato farmland into one of the Hamptons' most exclusive estate corridors. Properties sit on multi-acre lots with long gravel driveways, and many estate roads were originally farm lanes — unpaved and now bearing heavy contractor and delivery traffic.",
    localReferences: [
      "Ocean Road corridor south of Montauk Highway is one of the Hamptons' premier estate lanes",
      "Bridgehampton-Sag Harbor Turnpike (Route 79) connects the hamlet northward to Sag Harbor with estate driveways branching off both sides",
      "Hayground area in northern Bridgehampton features large-lot estate properties on rolling moraine terrain with private access roads",
      "Mecox Bay forms the western boundary with waterfront properties along Jobs Lane and Mecox Road",
      "Sandy loam topsoil over glacial outwash plain — well-draining but gravel migrates easily without proper edging and base course",
    ],
  },
  sagaponack: {
    name: "Sagaponack",
    nearby: "Bridgehampton, Wainscott, and Water Mill",
    intro:
      "Sagaponack is a hamlet and village in the Town of Southampton, frequently cited as having the most expensive zip code in the United States (11962). Vast agricultural fields interspersed with ultra-high-value estate compounds on 5–20+ acre lots produce driveways often 500–2,000 feet long.",
    localReferences: [
      "Zip code 11962 has been repeatedly ranked as the most expensive in America by Forbes",
      "Sagg Main Street is the hamlet's primary road, lined with estate properties and historic farms",
      "Sagg Road corridor runs through the heart of the hamlet connecting to Bridgehampton",
      "Sagaponack Village was incorporated in 2005, one of the newest villages in New York State, with strict large-lot zoning",
      "Flat glacial outwash terrain with sandy loam — excellent drainage but gravel requires periodic replenishment on long, exposed driveways",
    ],
  },
  wainscott: {
    name: "Wainscott",
    nearby: "East Hampton, Sagaponack, Bridgehampton, and Amagansett",
    intro:
      "Wainscott is a hamlet in the Town of East Hampton situated between East Hampton village and Sagaponack. The area features a mix of oceanfront estates along Wainscott Main Street and larger agricultural-lot properties inland, all on flat glacial outwash plain with sandy soil.",
    localReferences: [
      "Wainscott Main Street is the hamlet's central road running south from Montauk Highway toward the ocean with estate properties on both sides",
      "Beach Lane provides beach access and is lined with oceanfront estate properties",
      "Wainscott Northwest Road and Wainscott Stone Road are inland estate corridors with agricultural-lot properties",
      "Wainscott Pond is a coastal pond at the southern end; nearby properties deal with high water table and sandy soil",
    ],
  },
  "east-hampton": {
    name: "East Hampton",
    nearby: "Amagansett, Wainscott, Springs, and Sag Harbor",
    intro:
      "East Hampton's estate section is defined by large, hedged properties served by long gravel driveways and private lanes. Sandy soil and coastal freeze-thaw drive ongoing regrade and stone work.",
    localReferences: [
      "Incorporated Village of East Hampton within the Town of East Hampton",
      "Estate section with long gravel driveways and private lanes",
      "Sandy soil and coastal exposure in the oceanfront zone",
    ],
  },
  amagansett: {
    name: "Amagansett",
    nearby: "East Hampton, Wainscott, Montauk, and Springs",
    intro:
      "Amagansett is a hamlet in the Town of East Hampton known for its oceanfront estates, particularly along Further Lane, which has been ranked among the most expensive streets in the United States. Estate driveways are often 400–1,000+ feet long, running from Montauk Highway south to oceanfront lots on sandy glacial outwash terrain.",
    localReferences: [
      "Further Lane is one of the most expensive residential streets in America, lined with oceanfront estates on multi-acre lots with long gravel driveways",
      "Indian Wells Highway area has estate properties between the village center and Indian Wells Beach with private gravel access roads",
      "Amagansett Dunes is an oceanfront area south of Montauk Highway with sandy soil and exposure to Atlantic storms and salt spray",
      "Atlantic Avenue and Bluff Road are estate corridors with ocean bluff properties",
    ],
  },
  montauk: {
    name: "Montauk",
    nearby: "Amagansett, East Hampton, and Springs",
    intro:
      "Montauk is the easternmost hamlet on the South Fork, situated on a narrow peninsula with ocean on three sides. The terrain includes dramatic bluffs, rolling moraine hills, and exposed headlands subject to severe Atlantic weather, and gravel roads and parking areas face unique challenges from wind exposure and steep grades.",
    localReferences: [
      "Hither Hills area is a residential community between Hither Hills State Park and the ocean with private gravel roads",
      "Ditch Plains is a surf community with private gravel lanes and parking areas serving beachfront properties",
      "Old Montauk Highway is a historic route along the southern bluffs with estate driveways extending to bluff-edge properties",
      "Montauk's glacial moraine terrain creates steeper grades than typical South Fork outwash plain",
      "Montauk village commercial area has seasonal businesses with gravel and semi-improved parking lots",
    ],
  },
  "sag-harbor": {
    name: "Sag Harbor",
    nearby: "North Haven, Noyack, Bridgehampton, and East Hampton",
    intro:
      "Sag Harbor is a historic whaling village that uniquely spans both the Town of Southampton and the Town of East Hampton. The village sits on a harbor of Shelter Island Sound with a mix of historic downtown streets and estate-lined private lanes extending into wooded, sandy-soil uplands.",
    localReferences: [
      "Village spans both the Town of Southampton and Town of East Hampton",
      "Sag Harbor Historic District is listed on the National Register of Historic Places",
      "Division Street and Main Street form the village's commercial spine with estate properties extending along private lanes",
      "Sandy glacial outwash soil typical of South Fork — well-draining but prone to washout and rut formation on unpaved surfaces",
      "Sag Harbor Hills, Azurest, and Ninevah Beach subdivisions (SANS) are historically significant residential communities on the eastern edge of the village",
    ],
  },
  "north-haven": {
    name: "North Haven",
    nearby: "Sag Harbor, Shelter Island, and Noyack",
    intro:
      "North Haven is an incorporated village in the Town of Southampton, occupying a peninsula between Sag Harbor Cove and Shelter Island Sound. The village is almost entirely residential with waterfront estates on wooded, hilly moraine terrain, and many village roads are private, serving small clusters of waterfront homes.",
    localReferences: [
      "Incorporated village (1931) on a peninsula connected to Sag Harbor by a bridge across the cove",
      "Glacial moraine terrain — hillier than the outwash plain to the south, with rocky, clay-mixed soil",
      "Ferry Road is the main road through the village, connecting to the South Ferry to Shelter Island",
      "Waterfront estates along Shelter Island Sound and Sag Harbor Cove have private gravel lanes descending from the moraine ridge",
      "Small population (~700) and limited road budget means many private roads are maintained by property owner agreements",
    ],
  },
  noyack: {
    name: "Noyack",
    nearby: "Sag Harbor, North Haven, Bridgehampton, and North Sea",
    intro:
      "Noyack is an unincorporated hamlet in the Town of Southampton along the northern shore of Noyack Bay, extending into wooded moraine hills north of Bridgehampton. The terrain is notably hillier than the flat outwash plain of the South Fork's southern coast, with glacial moraine soil that mixes clay, sand, and rock.",
    localReferences: [
      "Noyack Bay waterfront estates with private gravel roads descending from wooded uplands to the waterline",
      "Noyack Road (County Road 38) is the hamlet's main east–west road connecting to Sag Harbor",
      "Long Beach area is a narrow spit extending into Noyack Bay with seasonal properties and gravel access roads",
      "Glacial moraine terrain with mixed clay-sand-rock soil — different gravel specifications than the sandy outwash plain towns to the south",
      "Unincorporated hamlet — road maintenance on private lanes falls entirely to property owners with no village-level road crew",
    ],
  },

  // ── North Shore (Mount Sinai to Wading River) ─────────────────────────────
  "mount-sinai": {
    name: "Mount Sinai",
    nearby: "Miller Place, Port Jefferson, Coram, and Rocky Point",
    intro:
      "Mount Sinai is a hamlet in the Town of Brookhaven on Long Island's North Shore, centered on Mount Sinai Harbor and Cedar Beach along the Sound. The hamlet includes some of the North Shore's oldest private residential communities, several of which maintain their own internal roadways.",
    localReferences: [
      "Crystal Brook Park Association is Mount Sinai's oldest private community, established 1892",
      "The Hamlet at Willow Creek is a covenant-controlled gated community with 177 single-family Golf Villa and Estate homes",
      "Mount Sinai Harbor and Cedar Beach are the hamlet's public shoreline on Long Island Sound",
      "Mount Sinai Harbor Association has been active on harbor and civic issues since the early 1900s",
    ],
  },
  "port-jefferson": {
    name: "Port Jefferson",
    nearby: "Port Jefferson Station, Belle Terre, Mount Sinai, and Setauket",
    intro:
      "Port Jefferson is an incorporated village built around a working harbor that historically served as a depot for the oil-transportation and gravel industries. Its steep, harbor-facing downtown depends on a network of village-owned municipal parking lots to serve shops, restaurants, and the ferry terminal.",
    localReferences: [
      "Village-owned municipal parking lots operate on pay-to-park from April 1 through November 25",
      "Harbor Front Park and Village Center is the downtown pedestrian and parking hub",
      "Historic role as a depot for the oil-transportation and gravel industries",
      "Village shopping-center parking-lot regulations are codified in the bulk and parking code",
    ],
  },
  "miller-place": {
    name: "Miller Place",
    nearby: "Mount Sinai, Rocky Point, Sound Beach, and Port Jefferson",
    intro:
      "Miller Place is a historic hamlet in the Town of Brookhaven, home to one of the North Shore's oldest civic associations (established 1972). The Miller Place Park Homeowners Association works alongside the civic association on road repair, gabion construction, and traffic safety in its residential section.",
    localReferences: [
      "Miller Place Civic Association has served the hamlet since 1972",
      "Miller Place Park Homeowners Association liaises with Brookhaven Town on gabions and road repair",
    ],
  },
  "sound-beach": {
    name: "Sound Beach",
    nearby: "Miller Place, Rocky Point, and Mount Sinai",
    intro:
      "Sound Beach is a hamlet in the Town of Brookhaven built around the Sound Beach Property Owners Association (SBPOA), a dues-funded private community organization founded in 1929. Members pay annual fees for beach tags and access to private beach staircases along Shore Drive.",
    localReferences: [
      "Sound Beach Property Owners Association (SBPOA), founded 1929, provides member-funded beach and parkland stewardship",
      "Shore Drive is the location of SBPOA's private East and West Beach staircases to Long Island Sound",
      "$325 annual SBPOA membership fee for beach access",
      "Sound Beach Civic Association is the hamlet's separate civic organization",
    ],
  },
  "rocky-point": {
    name: "Rocky Point",
    nearby: "Sound Beach, Miller Place, and Shoreham",
    intro:
      "Rocky Point is a hamlet in the Town of Brookhaven whose North Shore Beach community is governed by the North Shore Beach Property Owners Association (NSBPOA), controlling roughly a mile of Long Island Sound shoreline. Soundview Drive, the association's private road, is used by buses, garbage trucks, and town plows but is privately funded.",
    localReferences: [
      "Soundview Drive is NSBPOA's private road, used by public services but ineligible for town-funded repair",
      "North Shore Beach Property Owners Association controls roughly one mile of Sound shoreline via Beech Beach, Broadway Beach, Nimbus Beach, and Friendship Beach access points",
      "$475 annual NSBPOA membership dues for beach and road-adjacent access",
      "Town of Brookhaven agreement with NSBPOA for stone revetment and bulkheading to halt erosion",
    ],
  },
  shoreham: {
    name: "Shoreham",
    nearby: "Wading River, Rocky Point, and Miller Place",
    intro:
      "Shoreham is an incorporated village in the Town of Brookhaven on Long Island Sound, home to the Shoreham Shore Club — a private, not-for-profit beach club serving member families and deeded beach-right holders in East Shoreham. The village's zoning code notes specific restrictions along its northern bluff.",
    localReferences: [
      "Shoreham Shore Club is a private beach club for deeded beach-right holders in East Shoreham with 150+ member families",
      "Sills Gully Path is the access route residents use to reach the Shore Club beach",
      "Village of Shoreham zoning includes restrictions along the northern bluff",
    ],
  },
  "wading-river": {
    name: "Wading River",
    nearby: "Shoreham, Baiting Hollow, and Riverhead",
    intro:
      "Wading River is a hamlet spanning the Towns of Brookhaven and Riverhead, known for its rural character and North Shore bluff-front beach communities. The Beach Club Civic Association (BCCA), established in the late 1950s, is a 48-home association with deeded beach rights that collects dues specifically to maintain its private roads.",
    localReferences: [
      "Beach Club Civic Association (BCCA) is a 48-home association with deeded beach rights, established in the late 1950s",
      "BCCA dues fund maintenance of common areas, beach deck, stairs, and private roads",
      "Wading River Civic Association has served the hamlet since 1935, focused on rural character and safer roads",
    ],
  },

  // ── North Fork ────────────────────────────────────────────────────────────
  riverhead: {
    name: "Riverhead",
    nearby: "Calverton, Aquebogue, Wading River, and Flanders",
    intro:
      "Riverhead is the commercial and governmental hub of eastern Suffolk, with the Route 58 retail corridor and extensive farmland. That mix makes gravel and RCA commercial parking-lot and farm/yard-access rehab the strongest fit.",
    localReferences: [
      "Route 58 (Old Country Road) commercial retail corridor",
      "Downtown Main Street along the Peconic River",
      "County seat of Suffolk County",
      "Agricultural land with gravel farm access roads",
    ],
  },
  calverton: {
    name: "Calverton",
    nearby: "Riverhead, Wading River, Manorville, and Baiting Hollow",
    intro:
      "Calverton is known for EPCAL — the Enterprise Park at Calverton on the former Grumman / Navy site — a large industrial-commercial zone. Combined with Pine Barrens sandy soil, it fits commercial gravel and RCA parking-lot and access-road rehab.",
    localReferences: [
      "Enterprise Park at Calverton (EPCAL), the former Grumman / Navy plant",
      "Sits in the Long Island Pine Barrens on sandy, well-drained soil",
      "Along NY-25 (Middle Country Road)",
    ],
  },
  aquebogue: {
    name: "Aquebogue",
    nearby: "Jamesport, Riverhead, Baiting Hollow, and Laurel",
    intro:
      "Aquebogue is a hamlet in the Town of Riverhead, settled in 1758 and named for an Indigenous word meaning 'head of the bay.' It sits along Sound Avenue and Main Road (Route 25), a historically agricultural corridor lined with farm stands, wineries, and converted barns, and includes several private-road residential communities.",
    localReferences: [
      "Sound Avenue's corridor of farm stands and agricultural attractions runs through the hamlet",
      "Paumanok Vineyards and Palmer Vineyards are family-owned wineries with gravel parking areas",
      "Bay View Farm Market on Sound Avenue is one of several farm stands along the corridor",
      "Ock-A-Bock Terrace and Bay Woods are private-road residential communities discussed at a 2014 Town of Riverhead private-roads hearing",
      "Greater Jamesport Civic Association represents Aquebogue along with Jamesport, South Jamesport, and Laurel",
    ],
  },
  jamesport: {
    name: "Jamesport",
    nearby: "South Jamesport, Aquebogue, Laurel, and Riverhead",
    intro:
      "Jamesport is a hamlet in the Town of Riverhead centered on a small downtown along Main Road (Route 25), part of a nearly five-mile stretch documented in the Main Road Historic Resource Survey as one of the longest-settled agricultural landscapes in the town. Old barns along this corridor have been converted into wineries and farm businesses.",
    localReferences: [
      "Jamesport Vineyards is a working winery since 1986 at 1216 Main Road (Route 25)",
      "Main Road Historic Resource Survey covers roughly five miles of Route 25 through Aquebogue, Jamesport, and part of Laurel",
      "Greater Jamesport Civic Association, established 1948, covers the area between Route 105 and Laurel Lane",
      "South Jamesport Beach on Town Beach Drive has parking, courts, and a playground",
    ],
  },
  laurel: {
    name: "Laurel",
    nearby: "Mattituck, Jamesport, Cutchogue, and Peconic",
    intro:
      "Laurel is a small hamlet straddling the Town of Riverhead and the Town of Southold, with frontage on Peconic Bay. Main Road (Route 25) runs through Laurel as one of the North Fork's three primary east–west roads, and the area mixes vineyards, fields, and preserved wooded land along quieter local roads.",
    localReferences: [
      "Laurel Lake Vineyards at 3165 Main Road (Route 25) is a winery along the North Fork wine trail",
      "Route 25 / Main Road is Laurel's primary corridor connecting Mattituck, Jamesport, and Riverhead",
      "Mattituck-Laurel Civic Association meets monthly at Veterans Beach Park on Peconic Bay Boulevard",
      "Frontage on Peconic Bay amid vineyards, fields, and wooded areas",
    ],
  },
  mattituck: {
    name: "Mattituck",
    nearby: "Laurel, Cutchogue, Peconic, and Aquebogue",
    intro:
      "Mattituck is a hamlet in the Town of Southold whose name derives from a Native American word for 'Great Creek,' referencing Mattituck Creek. Its commercial heart is Love Lane, a compact walkable strip of shops and eateries just off Main Road, surrounded by vineyards and working farmland typical of the North Fork.",
    localReferences: [
      "Love Lane is Mattituck's pedestrian-friendly main commercial street just off Main Road",
      "Roanoke Vineyards has a wine shop and tasting room at 165 Love Lane",
      "Macari Vineyards, Lieb Cellars, and Raphael are wineries in the Mattituck area",
      "Mattituck Creek has been dredged for pleasure craft, with the hamlet name meaning 'Great Creek'",
      "Mattituck Park District properties include a lot with a Little League field, parking area, tennis courts, and wetlands along James Creek",
      "Mattituck-Laurel Civic Association meets at Veterans Beach Park on Peconic Bay Boulevard",
    ],
  },
};

// ── Per-town verified slugs ─────────────────────────────────────────────────
// Only towns with web-sourced, verified localReferences get flipped to true.
const VERIFIED_TOWN_SLUGS = new Set([
  // Web-verified West corridor
  "center-moriches",
  "mastic",
  "mastic-beach",
  "brookhaven",
  "bellport",
  "patchogue",
  "medford",
  // Web-verified North Shore
  "mount-sinai",
  "sound-beach",
  "rocky-point",
  "shoreham",
  "wading-river",
  "port-jefferson",
  "miller-place",
  // Web-verified North Fork
  "aquebogue",
  "jamesport",
  "laurel",
  "mattituck",
]);

// ── commonProjects per (service, town) ──────────────────────────────────────

const SERVICE_DEFAULT_PROJECTS: Record<string, string[]> = {
  "gravel-driveway-repair": [
    "Regrade and re-stone rutted or washed-out gravel driveways",
    "Add crown and drainage to drives that puddle on sandy soil",
  ],
  "private-road-maintenance": [
    "Grade, re-stone, and drain shared private access roads",
    "Recurring maintenance for private community and association lanes",
  ],
  "gravel-parking-lot-rehab": [
    "Rehab and re-base commercial gravel and RCA parking lots",
    "Regrade and drain lots that pond on sandy fill",
  ],
  "driveway-seal-coating-crack-repair": [
    "Two-coat sealcoat on residential asphalt driveways",
    "Crack repair and hot-patch before sealcoating",
  ],
  "tree-removal-trimming": [
    "Hazardous and dead tree removal on residential properties",
    "Crown reduction, pruning, and storm damage cleanup",
  ],
  "stump-grinding": [
    "Below-grade stump grinding with topsoil backfill",
    "Multi-stump grinding after tree removal or lot clearing",
  ],
  "plantings": [
    "Foundation plantings and curb appeal upgrades with local nursery stock",
    "Privacy hedge and screening installation with topsoil and mulch from our yard",
  ],
  "new-gravel-driveway": [
    "Full gravel driveway construction with excavation, RCA base, and surface stone",
    "Belgian block edging and drainage grading for new driveways",
  ],
};

const SERVICE_TOWN_PROJECTS: Record<string, string[]> = {
  // ── Center Moriches ─────────────────────────────────────────────────────
  "gravel-driveway-repair|center-moriches": [
    "Regrade and re-stone bayfront gravel driveways rutted by storm runoff",
    "Add crown and drainage to flat drives that puddle on sandy soil",
  ],
  // ── West corridor ──────────────────────────────────────────────────────
  "private-road-maintenance|moriches": [
    "Private-community road grading and pothole repair for HOA-maintained lanes",
    "Seasonal gravel top-dressing after winter freeze-thaw on unpaved lanes",
  ],
  "gravel-driveway-repair|mastic": [
    "Regrading sandy Pine Barrens-adjacent driveways prone to erosion after rain",
    "Private lane maintenance near William Floyd Estate residential pockets",
  ],
  "gravel-driveway-repair|mastic-beach": [
    "Post-storm gravel driveway repair and regrading on canal-front properties",
    "Drainage-aware driveway work on low-elevation lots near Moriches Bay",
  ],
  "private-road-maintenance|mastic-beach": [
    "Private road resurfacing coordinated with Mastic Beach Property Owners Association members",
    "Canal-front lane regrading after storm flooding and washout",
  ],
  "private-road-maintenance|brookhaven": [
    "Country-road-style gravel and dirt lane maintenance preserving rural character",
    "Driveway repair for riverside and marsh-adjacent properties with drainage sensitivity",
  ],
  "gravel-driveway-repair|bellport": [
    "Historic-district-sensitive stone and gravel driveway restoration on landmarked estate lots",
    "Driveway regrading for homes along Bellport Lane and South Country Road",
  ],
  "private-road-maintenance|bellport": [
    "Private lane grading for residential streets in and around the village",
    "Stone drive maintenance for historic district properties",
  ],
  "gravel-parking-lot-rehab|patchogue": [
    "Municipal and commercial gravel parking lot regrading and pothole repair for village lots",
    "Residential driveway repair on flat outwash-plain side streets",
  ],
  "gravel-driveway-repair|medford": [
    "Sandy Pine Barrens-soil driveway stabilization and regrading",
    "Drainage-aware driveway work on porous glacial outwash soil",
  ],
  // ── Manorville / Pine Barrens ──────────────────────────────────────────
  "gravel-driveway-repair|manorville": [
    "Full rebuild of long rural gravel driveways with RCA base and millings",
    "Grade and re-stone driveways lengthened by large Pine Barrens lots",
  ],
  // ── Hamptons / East End ────────────────────────────────────────────────
  "gravel-driveway-repair|quogue": ["Regrade and re-stone long estate gravel driveways"],
  "gravel-driveway-repair|southampton": [
    "Re-stone and regrade long estate gravel and pea-stone drives",
  ],
  "gravel-driveway-repair|east-hampton": ["Rebuild and regrade long estate gravel driveways"],
  "gravel-driveway-repair|amagansett": [
    "Oceanfront estate driveway reconstruction with stabilized gravel base to resist wind erosion",
    "Post-storm driveway repair and regrading following nor'easters and Atlantic storm surge",
  ],
  "gravel-driveway-repair|bridgehampton": [
    "Long estate driveway reconstruction with proper base course, crown, and drainage ditching",
    "Seasonal gravel driveway refresh for summer estate openings",
  ],
  "gravel-driveway-repair|sagaponack": [
    "Ultra-long estate driveway maintenance with premium gravel and defined edging",
    "Private farm lane conversion to estate driveway with proper base, crown, and turnaround",
  ],
  "gravel-driveway-repair|water-mill": [
    "Estate driveway construction with deep gravel base over geotextile fabric on sandy soil",
    "Drainage improvement for low-lying driveways near Mill Pond and Mecox Bay",
  ],
  "gravel-driveway-repair|sag-harbor": [
    "Estate driveway regrading and fresh gravel overlay after winter freeze-thaw damage",
    "Drainage swale installation alongside gravel driveways to prevent washout on sloped lots",
  ],
  "gravel-driveway-repair|montauk": [
    "Bluff-top estate driveway stabilization with erosion control and heavy base course on steep moraine grades",
    "Post-storm driveway repair for beachfront and bluff-edge properties",
  ],
  "private-road-maintenance|quogue": ["Maintain private lanes serving estate parcels"],
  "private-road-maintenance|east-hampton": [
    "Maintain private lanes serving multiple estate parcels",
  ],
  "private-road-maintenance|amagansett": [
    "Private lane maintenance for shared access roads serving Further Lane and ocean-side estate properties",
  ],
  "private-road-maintenance|bridgehampton": [
    "Shared private road maintenance for estate owners on former farm lanes",
    "Hayground area private access road grading on rolling moraine terrain",
  ],
  "private-road-maintenance|sagaponack": [
    "Shared estate lane maintenance on former agricultural roads",
  ],
  "private-road-maintenance|water-mill": [
    "Private road maintenance for shared estate lanes serving Mecox Bay waterfront properties",
  ],
  "private-road-maintenance|sag-harbor": [
    "Private lane maintenance for shared-access roads serving waterfront homes",
  ],
  "private-road-maintenance|north-haven": [
    "Private waterfront lane regrading on moraine slopes with drainage to prevent erosion toward the harbor",
    "Shared road maintenance for small clusters of waterfront estates on private peninsula lanes",
  ],
  "private-road-maintenance|noyack": [
    "Bayfront estate driveway regrading on hilly moraine terrain with drainage for clay-soil mud issues",
    "Private road maintenance for shared access lanes serving Noyack Bay waterfront estate clusters",
  ],
  "private-road-maintenance|montauk": [
    "Private community road maintenance for Hither Hills and Ditch Plains area residents",
  ],
  "gravel-parking-lot-rehab|hampton-bays": [
    "Rehab gravel and RCA commercial and marina parking lots",
  ],
  "gravel-parking-lot-rehab|montauk": [
    "Seasonal parking lot rehab for tourism businesses — regrading, fresh gravel, and drainage after winter damage",
  ],
  // ── North Shore ────────────────────────────────────────────────────────
  "private-road-maintenance|mount-sinai": [
    "Private-road resurfacing for gated and covenant communities",
    "Gravel driveway repair for older homes in legacy private-community neighborhoods",
  ],
  "gravel-parking-lot-rehab|port-jefferson": [
    "Municipal and shopping-center parking lot regrading and rehab",
    "Drainage correction for harbor-adjacent gravel and paved lots",
  ],
  "private-road-maintenance|sound-beach": [
    "Private-road and access-way maintenance for SBPOA member areas along Shore Drive",
    "Gravel driveway repair near beach access points",
  ],
  "private-road-maintenance|rocky-point": [
    "Private road repair and regrading after storm and flood damage",
    "Gravel driveway repair for NSBPOA-area residential properties",
  ],
  "private-road-maintenance|shoreham": [
    "Private access-road maintenance for Shore Club members along Sills Gully Path area",
    "Gravel driveway repair on bluff-adjacent residential lots",
  ],
  "private-road-maintenance|wading-river": [
    "Private road resurfacing and regrading for BCCA member roads",
    "Gravel driveway repair for rural and bluff-front residential lots",
  ],
  "private-road-maintenance|miller-place": [
    "Road-base repair and regrading for Miller Place Park HOA-area streets",
    "Gravel driveway repair for historic-hamlet residential properties",
  ],
  // ── Riverhead / Calverton ──────────────────────────────────────────────
  "gravel-parking-lot-rehab|riverhead": [
    "Rehab commercial gravel and RCA parking lots along the Route 58 corridor",
    "Grade and stone agricultural yard and access roads",
  ],
  "gravel-parking-lot-rehab|calverton": [
    "Rehab and re-base large commercial gravel parking lots",
    "Grade and stone industrial access roads at EPCAL",
  ],
  // ── North Fork ─────────────────────────────────────────────────────────
  "gravel-parking-lot-rehab|aquebogue": [
    "Winery and farm-stand gravel parking lot regrading along Sound Avenue",
    "Seasonal pothole and washboard repair on farm access lanes off Sound Avenue",
  ],
  "private-road-maintenance|aquebogue": [
    "Private-road driveway and access-lane resurfacing for communities like Ock-A-Bock Terrace",
    "Shared-lane grading for private-road residential neighborhoods",
  ],
  "gravel-parking-lot-rehab|jamesport": [
    "Vineyard tasting-room parking lot rehab along the Route 25 winery corridor",
    "Farm access-road grading for historic agricultural parcels along Main Road",
  ],
  "private-road-maintenance|jamesport": [
    "Municipal and park gravel lot maintenance near Town Beach Drive",
    "Farm access-road grading along the Main Road Historic Resource Survey corridor",
  ],
  "gravel-driveway-repair|laurel": [
    "Vineyard access-lane and parking-area repair along the Laurel Lake Vineyards corridor",
    "Rural driveway grading along Route 25 farm parcels",
  ],
  "gravel-parking-lot-rehab|mattituck": [
    "Park district and Little League lot gravel regrading near James Creek",
    "Winery tasting-room parking rehab along the Love Lane and Main Road corridor",
  ],
  "gravel-driveway-repair|mattituck": [
    "Residential driveway repair for homes off Peconic Bay Boulevard",
    "Stone drive regrading for properties near Mattituck Creek",
  ],

  // ── Sealcoating ────────────────────────────────────────────────────────────
  "driveway-seal-coating-crack-repair|center-moriches": [
    "Two-coat sealcoat on bayfront residential driveways along Frowein Road and Montauk Highway",
    "Crack repair on aging asphalt driveways exposed to salt air and freeze-thaw",
  ],
  "driveway-seal-coating-crack-repair|mastic": [
    "Sealcoating residential driveways in Mastic's Pine Barrens-edge neighborhoods",
    "Crack repair on sun-damaged asphalt along Mastic Road and Neighborhood Road",
  ],
  "driveway-seal-coating-crack-repair|mastic-beach": [
    "Sealcoating asphalt driveways on flood-prone canal-front lots near Moriches Bay",
    "Post-storm crack repair on low-elevation driveways",
  ],
  "driveway-seal-coating-crack-repair|patchogue": [
    "Sealcoating village residential driveways in Patchogue's older neighborhoods",
    "Crack repair and hot-patch on aging asphalt along East Main Street and side streets",
  ],
  "driveway-seal-coating-crack-repair|medford": [
    "Sealcoating driveways on sandy Pine Barrens outwash soil",
    "Crack repair on UV-damaged asphalt in open, sun-exposed subdivisions",
  ],
  "driveway-seal-coating-crack-repair|port-jefferson": [
    "Sealcoating steep harbor-facing residential driveways",
    "Crack repair on hilly North Shore asphalt driveways with freeze-thaw stress",
  ],
  "driveway-seal-coating-crack-repair|riverhead": [
    "Sealcoating residential and small-commercial driveways along the Route 58 corridor",
    "Crack repair on agricultural-area asphalt with heavy vehicle traffic",
  ],

  // ── Tree Removal & Trimming ────────────────────────────────────────────────
  "tree-removal-trimming|center-moriches": [
    "Storm-damaged tree removal on bayfront residential lots near Senix Creek",
    "Crown reduction and trimming on mature oaks along Montauk Highway residential properties",
  ],
  "tree-removal-trimming|mastic": [
    "Lot clearing and overgrown tree removal in Pine Barrens-edge residential areas",
    "Storm damage cleanup near William Floyd Parkway",
  ],
  "tree-removal-trimming|mastic-beach": [
    "Post-storm hazardous tree removal on flood-damaged canal-front properties",
    "Salt-damaged tree removal on low-lying lots near Moriches Bay",
  ],
  "tree-removal-trimming|brookhaven": [
    "Dead tree and widow-maker removal on wooded rural lots near the Carmans River",
    "Canopy thinning for light and airflow on shaded riverside properties",
  ],
  "tree-removal-trimming|bellport": [
    "Historic-district-sensitive tree trimming preserving street canopy along Bellport Lane",
    "Storm-damaged tree removal on South Country Road estate properties",
  ],
  "tree-removal-trimming|manorville": [
    "Lot clearing for new construction on large wooded Pine Barrens parcels",
    "Hazardous dead-pine removal on rural residential properties",
  ],
  "tree-removal-trimming|mount-sinai": [
    "Hazardous tree removal near structures in private gated communities",
    "Storm damage cleanup in North Shore beach communities along the Sound",
  ],
  "tree-removal-trimming|rocky-point": [
    "Storm-damaged tree removal in NSBPOA beach community neighborhoods",
    "Dead tree removal near structures on wooded North Shore lots",
  ],
  "tree-removal-trimming|wading-river": [
    "Hazardous tree removal on bluff-front properties overlooking Long Island Sound",
    "Overgrown tree trimming for BCCA community road clearance",
  ],
  "tree-removal-trimming|riverhead": [
    "Farm and vineyard wind-damaged tree removal along Sound Avenue",
    "Lot clearing for agricultural and commercial development near Route 58",
  ],
  "tree-removal-trimming|mattituck": [
    "Ornamental and shade tree pruning on residential streets near Love Lane",
    "Storm-damaged tree removal on vineyard and farmstead properties",
  ],

  // ── Stump Grinding ─────────────────────────────────────────────────────────
  "stump-grinding|center-moriches": [
    "Stump grinding after storm-damaged tree removal on bayfront residential lots",
    "Multi-stump grinding on cleared lots with topsoil backfill from our Frowein Road yard",
  ],
  "stump-grinding|mastic": [
    "Stump grinding on sandy Pine Barrens soil — grindings spread easily as mulch",
    "Post-lot-clearing stump grinding for new construction prep",
  ],
  "stump-grinding|manorville": [
    "Multi-stump lot-clearing grinding on large rural Pine Barrens parcels",
    "Stump grinding for driveway expansion on wooded residential properties",
  ],
  "stump-grinding|brookhaven": [
    "Stump grinding on riverside properties with root systems near marsh and wetlands",
    "Topsoil backfill and seeding prep after stump removal on country lots",
  ],
  "stump-grinding|mount-sinai": [
    "Stump grinding in tight-access gated community properties",
    "Post-storm stump removal in North Shore beach neighborhoods",
  ],
  "stump-grinding|riverhead": [
    "Farm and vineyard stump grinding for replanting or land clearing",
    "Commercial property stump removal along the Route 58 corridor",
  ],

  // ── Plantings ──────────────────────────────────────────────────────────────
  "plantings|center-moriches": [
    "Foundation plantings and curb appeal upgrades on Montauk Highway residential lots",
    "Deer-resistant privacy screening along bayfront property lines near Senix Creek",
  ],
  "plantings|mastic": [
    "Native and drought-tolerant plantings suited to sandy Pine Barrens-edge soil",
    "Privacy screening for residential lots along William Floyd Parkway",
  ],
  "plantings|bellport": [
    "Historic-district-sensitive foundation plantings on estate properties along Bellport Lane",
    "Garden bed installation with period-appropriate native and ornamental species",
  ],
  "plantings|patchogue": [
    "Foundation plantings and curb appeal for older village homes near downtown",
    "Seasonal color and garden bed installation on flat outwash-plain residential lots",
  ],
  "plantings|medford": [
    "Soil-amended plantings for sandy, acidic Pine Barrens-edge ground",
    "Arborvitae and green giant screening for subdivision privacy",
  ],
  "plantings|mount-sinai": [
    "Foundation plantings for gated community and covenant-controlled homes",
    "Deer-resistant native garden beds for North Shore residential properties",
  ],
  "plantings|port-jefferson": [
    "Curb appeal plantings for harbor village residential streets",
    "Slope-stabilizing ground cover and shrub installation on hilly North Shore lots",
  ],
  "plantings|wading-river": [
    "Wind-tolerant bluff-top plantings for Sound-facing residential lots",
    "Native plantings integrated with BCCA community landscape",
  ],
  "plantings|riverhead": [
    "Commercial and residential foundation plantings along the Route 58 corridor",
    "Farm-edge ornamental plantings with soil amendment for vineyard-area homes",
  ],
  "plantings|mattituck": [
    "Garden bed and ornamental tree installation on North Fork vineyard-area properties",
    "Seasonal color plantings for residential streets near Love Lane",
  ],
  "plantings|southampton": [
    "Estate-scale privacy screening and ornamental tree planting",
    "Deer-resistant foundation plantings for oceanfront and estate properties",
  ],
  "plantings|east-hampton": [
    "Estate-scale ornamental and shade tree planting on large hedged lots",
    "Deer-resistant garden bed installation for oceanfront estate properties",
  ],

  // ── New Gravel Driveway ────────────────────────────────────────────────────
  "new-gravel-driveway|center-moriches": [
    "New gravel driveway construction on bayfront lots with drainage grading for sandy soil",
    "Belgian block edging installation on residential driveways near Montauk Highway",
  ],
  "new-gravel-driveway|manorville": [
    "Long rural gravel driveway installation on large Pine Barrens lots with deep RCA base",
    "New driveway construction with geotextile on soft, sandy wooded-lot subgrade",
  ],
  "new-gravel-driveway|brookhaven": [
    "Country-style gravel driveway installation preserving rural hamlet character",
    "New driveway construction on riverside lots with moisture-sensitive subgrade",
  ],
  "new-gravel-driveway|bellport": [
    "Historic-district-sensitive gravel driveway construction on estate properties",
    "New stone driveway installation along Bellport Lane and South Country Road",
  ],
  "new-gravel-driveway|southampton": [
    "Estate gravel driveway construction with deep base and premium surface stone",
    "New driveway with turnaround pad on large oceanfront estate lots",
  ],
  "new-gravel-driveway|east-hampton": [
    "Full estate driveway construction with engineered base on sandy coastal soil",
    "New gravel driveway with Belgian block edging on hedged estate lots",
  ],
  "new-gravel-driveway|bridgehampton": [
    "New estate driveway construction on former farm lanes with proper base and crown",
    "Long driveway installation with turnaround on multi-acre Hayground area properties",
  ],
  "new-gravel-driveway|water-mill": [
    "Estate driveway construction with deep base over geotextile on sandy soil near Mecox Bay",
    "New driveway with drainage improvement for low-lying properties near Mill Pond",
  ],
  "new-gravel-driveway|wading-river": [
    "New gravel driveway on rural residential lots in the Brookhaven–Riverhead hamlet",
    "Driveway construction for bluff-front properties with erosion-resistant base",
  ],
  "new-gravel-driveway|mattituck": [
    "Residential gravel driveway installation on vineyard-area properties near Love Lane",
    "New driveway construction for North Fork homes along Peconic Bay Boulevard",
  ],
};

// ── Service → town targeting ────────────────────────────────────────────────

const SERVICE_TOWN_TARGETS: Record<string, string[]> = {
  "gravel-driveway-repair": [
    // Home base
    "center-moriches",
    "east-moriches",
    // West corridor
    "moriches",
    "mastic",
    "mastic-beach",
    "shirley",
    "brookhaven",
    "bellport",
    "east-patchogue",
    "patchogue",
    "medford",
    // Eastport / West Hamptons
    "eastport",
    "manorville",
    "westhampton",
    "westhampton-beach",
    "quogue",
    // Hamptons / East End
    "southampton",
    "water-mill",
    "bridgehampton",
    "sagaponack",
    "wainscott",
    "east-hampton",
    "amagansett",
    "montauk",
    "sag-harbor",
    // North Shore
    "mount-sinai",
    "miller-place",
    "sound-beach",
    "rocky-point",
    "shoreham",
    "wading-river",
    // North Fork
    "aquebogue",
    "laurel",
    "mattituck",
  ],
  "private-road-maintenance": [
    // West corridor
    "moriches",
    "mastic",
    "mastic-beach",
    "brookhaven",
    "bellport",
    "medford",
    // Eastport / West Hamptons
    "manorville",
    "westhampton",
    "quogue",
    "east-quogue",
    "remsenburg",
    // Hamptons / East End
    "southampton",
    "water-mill",
    "bridgehampton",
    "sagaponack",
    "east-hampton",
    "amagansett",
    "montauk",
    "sag-harbor",
    "north-haven",
    "noyack",
    // North Shore
    "mount-sinai",
    "miller-place",
    "sound-beach",
    "rocky-point",
    "shoreham",
    "wading-river",
    // North Fork
    "aquebogue",
    "jamesport",
    "laurel",
    "mattituck",
  ],
  "gravel-parking-lot-rehab": [
    // Home base
    "center-moriches",
    // West corridor
    "patchogue",
    // Hamptons
    "hampton-bays",
    "montauk",
    "westhampton-beach",
    // Riverhead / Calverton
    "riverhead",
    "calverton",
    // North Shore
    "port-jefferson",
    // North Fork
    "aquebogue",
    "jamesport",
    "mattituck",
  ],

  // ── Sealcoating ────────────────────────────────────────────────────────────
  "driveway-seal-coating-crack-repair": [
    "center-moriches",
    "east-moriches",
    "moriches",
    "mastic",
    "mastic-beach",
    "shirley",
    "brookhaven",
    "bellport",
    "east-patchogue",
    "patchogue",
    "medford",
    "eastport",
    "manorville",
    // North Shore
    "mount-sinai",
    "port-jefferson",
    "miller-place",
    "sound-beach",
    "rocky-point",
    "shoreham",
    "wading-river",
    // Riverhead corridor
    "riverhead",
    "calverton",
    // North Fork
    "aquebogue",
    "jamesport",
    "laurel",
    "mattituck",
  ],

  // ── Tree Removal & Trimming ────────────────────────────────────────────────
  "tree-removal-trimming": [
    "center-moriches",
    "east-moriches",
    "moriches",
    "mastic",
    "mastic-beach",
    "shirley",
    "brookhaven",
    "bellport",
    "east-patchogue",
    "patchogue",
    "medford",
    "eastport",
    "manorville",
    "westhampton",
    "quogue",
    "southampton",
    "east-hampton",
    // North Shore
    "mount-sinai",
    "port-jefferson",
    "miller-place",
    "sound-beach",
    "rocky-point",
    "shoreham",
    "wading-river",
    // Riverhead corridor
    "riverhead",
    "calverton",
    // North Fork
    "aquebogue",
    "jamesport",
    "laurel",
    "mattituck",
  ],

  // ── Stump Grinding ─────────────────────────────────────────────────────────
  "stump-grinding": [
    "center-moriches",
    "east-moriches",
    "moriches",
    "mastic",
    "mastic-beach",
    "shirley",
    "brookhaven",
    "bellport",
    "east-patchogue",
    "patchogue",
    "medford",
    "eastport",
    "manorville",
    "westhampton",
    "quogue",
    "southampton",
    "east-hampton",
    // North Shore
    "mount-sinai",
    "port-jefferson",
    "miller-place",
    "sound-beach",
    "rocky-point",
    "shoreham",
    "wading-river",
    // Riverhead corridor
    "riverhead",
    "calverton",
    // North Fork
    "aquebogue",
    "jamesport",
    "laurel",
    "mattituck",
  ],

  // ── Plantings ──────────────────────────────────────────────────────────────
  "plantings": [
    "center-moriches",
    "east-moriches",
    "moriches",
    "mastic",
    "mastic-beach",
    "shirley",
    "brookhaven",
    "bellport",
    "east-patchogue",
    "patchogue",
    "medford",
    "eastport",
    "manorville",
    "westhampton",
    "quogue",
    "southampton",
    "east-hampton",
    // North Shore
    "mount-sinai",
    "port-jefferson",
    "miller-place",
    "sound-beach",
    "rocky-point",
    "shoreham",
    "wading-river",
    // Riverhead corridor
    "riverhead",
    "calverton",
    // North Fork
    "aquebogue",
    "jamesport",
    "laurel",
    "mattituck",
  ],

  // ── New Gravel Driveway Installation ───────────────────────────────────────
  "new-gravel-driveway": [
    "center-moriches",
    "east-moriches",
    "moriches",
    "mastic",
    "mastic-beach",
    "shirley",
    "brookhaven",
    "bellport",
    "east-patchogue",
    "patchogue",
    "medford",
    "eastport",
    "manorville",
    "westhampton",
    "westhampton-beach",
    "quogue",
    "southampton",
    "water-mill",
    "bridgehampton",
    "east-hampton",
    "amagansett",
    "sag-harbor",
    // North Shore
    "mount-sinai",
    "miller-place",
    "sound-beach",
    "rocky-point",
    "shoreham",
    "wading-river",
    // North Fork
    "aquebogue",
    "laurel",
    "mattituck",
  ],
};

// ── Entry generation ────────────────────────────────────────────────────────

const entries: ServiceTownEntry[] = Object.entries(SERVICE_TOWN_TARGETS).flatMap(
  ([serviceSlug, townSlugs]) =>
    townSlugs.map((townSlug) => {
      const c = TOWN_CONTENT[townSlug];
      return {
        serviceSlug,
        townSlug,
        townName: c.name,
        verified: VERIFIED_TOWN_SLUGS.has(townSlug),
        nearbyTowns: c.nearby,
        intro: c.intro,
        localReferences: c.localReferences,
        commonProjects:
          SERVICE_TOWN_PROJECTS[`${serviceSlug}|${townSlug}`] ??
          SERVICE_DEFAULT_PROJECTS[serviceSlug] ??
          [],
      } satisfies ServiceTownEntry;
    })
);

export function getServiceTownEntry(
  serviceSlug: string,
  townSlug: string,
): ServiceTownEntry | undefined {
  return entries.find((e) => e.serviceSlug === serviceSlug && e.townSlug === townSlug);
}

/** Verified town entries for one service (drives that service's [town] params). */
export function getVerifiedServiceTowns(serviceSlug: string): ServiceTownEntry[] {
  return entries.filter((e) => e.serviceSlug === serviceSlug && e.verified);
}

/** All verified entries across every service (drives the sitemap). */
export function getAllVerifiedServiceTowns(): ServiceTownEntry[] {
  return entries.filter((e) => e.verified);
}
