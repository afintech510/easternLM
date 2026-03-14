import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "..", ".env.local") });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const towns = [
  { slug: "remsenburg", name: "Remsenburg", zip: ["11960"], miles: 5.3, minutes: 10, fee: 4500, tier: "A", desc: "Remsenburg is a quiet residential hamlet just east of our yard with quick delivery access." },
  { slug: "speonk", name: "Speonk", zip: ["11972"], miles: 5.0, minutes: 9, fee: 4500, tier: "A", desc: "Speonk is one of our closest delivery areas, with fast turnaround on bulk material orders." },
  { slug: "westhampton-beach", name: "Westhampton Beach", zip: ["11978"], miles: 8.9, minutes: 17, fee: 7500, tier: "A", desc: "Westhampton Beach properties often order premium stone and decorative materials for upscale landscaping." },
  { slug: "east-quogue", name: "East Quogue", zip: ["11942"], miles: 12.4, minutes: 14, fee: 8000, tier: "B", desc: "East Quogue is a short drive east, popular for beach property landscaping and driveway work." },
  { slug: "middle-island", name: "Middle Island", zip: ["11953"], miles: 11.7, minutes: 22, fee: 9500, tier: "B", desc: "Middle Island sits in the central pine barrens with large wooded lots needing grading and driveway work." },
  { slug: "sound-beach", name: "Sound Beach", zip: ["11789"], miles: 19.7, minutes: 32, fee: 14000, tier: "B", desc: "Sound Beach is a North Shore community where drainage and retaining wall projects are common." },
  { slug: "rocky-point", name: "Rocky Point", zip: ["11778"], miles: 17.3, minutes: 27, fee: 12500, tier: "B", desc: "Rocky Point has hilly terrain that often requires retaining walls and proper drainage stone." },
  { slug: "flanders", name: "Flanders", zip: ["11901"], miles: 14.2, minutes: 17, fee: 9000, tier: "B", desc: "Flanders sits at the Peconic River crossing with a mix of residential and agricultural properties." },
  { slug: "centereach", name: "Centereach", zip: ["11720"], miles: 21.3, minutes: 29, fee: 14000, tier: "B", desc: "Centereach is a suburban community where mulch, topsoil, and driveway maintenance are the top orders." },
  { slug: "sayville", name: "Sayville", zip: ["11782"], miles: 18.7, minutes: 25, fee: 12500, tier: "B", desc: "Sayville is a waterfront community with established gardens and drainage needs." },
  { slug: "oakdale", name: "Oakdale", zip: ["11769"], miles: 20.7, minutes: 27, fee: 13500, tier: "B", desc: "Oakdale sits along the Connetquot River where waterfront properties need drainage-friendly materials." },
  { slug: "bohemia", name: "Bohemia", zip: ["11716"], miles: 19.5, minutes: 23, fee: 12000, tier: "B", desc: "Bohemia is a suburban community with standard residential landscaping and driveway projects." },
  { slug: "bay-shore", name: "Bay Shore", zip: ["11706"], miles: 27.0, minutes: 33, fee: 16500, tier: "B", desc: "Bay Shore is a south shore village with a mix of waterfront and downtown properties." },
  { slug: "holbrook", name: "Holbrook", zip: ["11741"], miles: 18.0, minutes: 24, fee: 12000, tier: "B", desc: "Holbrook is a residential community between the LIE and Sunrise Highway with easy truck access." },
  { slug: "holtsville", name: "Holtsville", zip: ["11742"], miles: 16.5, minutes: 23, fee: 11000, tier: "B", desc: "Holtsville is a quiet residential area with standard landscaping and driveway maintenance needs." },
  { slug: "ronkonkoma", name: "Ronkonkoma", zip: ["11779"], miles: 21.6, minutes: 27, fee: 13500, tier: "B", desc: "Ronkonkoma sits near the lake with a mix of residential and commercial properties." },
  { slug: "farmingville", name: "Farmingville", zip: ["11738"], miles: 17.8, minutes: 24, fee: 12000, tier: "B", desc: "Farmingville is a suburban residential area where mulch refresh and driveway repairs are common." },
  { slug: "blue-point", name: "Blue Point", zip: ["11715"], miles: 17.4, minutes: 22, fee: 11500, tier: "B", desc: "Blue Point is a waterfront community along the Great South Bay with compact residential lots." },
  { slug: "stony-brook", name: "Stony Brook", zip: ["11790"], miles: 24.9, minutes: 34, fee: 16000, tier: "B", desc: "Stony Brook has hilly terrain near the university where retaining walls and grading are frequent." },
  { slug: "mount-sinai", name: "Mount Sinai", zip: ["11766"], miles: 18.5, minutes: 36, fee: 14500, tier: "B", desc: "Mount Sinai is a North Shore community with wooded lots and sloped terrain needing stone and drainage." },
  { slug: "smithtown", name: "Smithtown", zip: ["11787"], miles: 29.0, minutes: 40, fee: 19000, tier: "B", desc: "Smithtown is an established town with mature properties needing regular material replenishment." },
  { slug: "hauppauge", name: "Hauppauge", zip: ["11788"], miles: 27.3, minutes: 33, fee: 17000, tier: "B", desc: "Hauppauge has both residential neighborhoods and commercial parks ordering bulk materials." },
  { slug: "sag-harbor", name: "Sag Harbor", zip: ["11963"], miles: 33.6, minutes: 46, fee: 21500, tier: "B", desc: "Sag Harbor is a historic whaling village with period-appropriate landscaping and premium stone needs." },
  { slug: "bridgehampton", name: "Bridgehampton", zip: ["11932"], miles: 29.4, minutes: 37, fee: 18500, tier: "B", desc: "Bridgehampton estate properties order premium decorative stone and large mulch volumes." },
  { slug: "montauk", name: "Montauk", zip: ["11954"], miles: 51.1, minutes: 72, fee: 33000, tier: "B", desc: "Montauk is our furthest regular delivery point. Beach erosion and wind-resistant landscaping are top needs." },
  { slug: "amagansett", name: "Amagansett", zip: ["11930"], miles: 40.8, minutes: 59, fee: 27000, tier: "B", desc: "Amagansett sits between East Hampton and Montauk with high-end properties needing premium materials." },
  { slug: "east-setauket", name: "East Setauket", zip: ["11733"], miles: 28.2, minutes: 41, fee: 19000, tier: "B", desc: "East Setauket is a North Shore community near Stony Brook with established residential properties." },
  { slug: "port-jefferson", name: "Port Jefferson", zip: ["11777"], miles: 21.5, minutes: 41, fee: 17000, tier: "B", desc: "Port Jefferson has steep harbor-area terrain that makes retaining walls and drainage work common." },
  { slug: "miller-place", name: "Miller Place", zip: ["11764"], miles: 16.5, minutes: 30, fee: 12500, tier: "B", desc: "Miller Place is a North Shore residential community with wooded lots and standard landscaping needs." },
  { slug: "shoreham", name: "Shoreham", zip: ["11786"], miles: 16.5, minutes: 26, fee: 12000, tier: "B", desc: "Shoreham is a small North Shore village with residential properties needing regular material orders." },
  { slug: "mattituck", name: "Mattituck", zip: ["11952"], miles: 22.8, minutes: 33, fee: 15500, tier: "B", desc: "Mattituck is a North Fork farming community with vineyard properties and rural landscaping needs." },
  { slug: "greenport", name: "Greenport", zip: ["11944"], miles: 34.7, minutes: 50, fee: 23000, tier: "B", desc: "Greenport is a waterfront village at the tip of the North Fork with maritime landscaping needs." },
  { slug: "southold", name: "Southold", zip: ["11971"], miles: 29.2, minutes: 41, fee: 19500, tier: "B", desc: "Southold is a North Fork town with farms, vineyards, and waterfront properties needing bulk materials." },
  { slug: "cutchogue", name: "Cutchogue", zip: ["11935"], miles: 24.5, minutes: 36, fee: 16500, tier: "B", desc: "Cutchogue sits in the heart of North Fork wine country with vineyard and agricultural material needs." },
  { slug: "jamesport", name: "Jamesport", zip: ["11947"], miles: 17.9, minutes: 26, fee: 12500, tier: "B", desc: "Jamesport is the gateway to the North Fork with a mix of farms and residential properties." },
  { slug: "aquebogue", name: "Aquebogue", zip: ["11931"], miles: 16.0, minutes: 24, fee: 11000, tier: "B", desc: "Aquebogue is a small community near Riverhead with agricultural and residential delivery needs." },
  { slug: "water-mill", name: "Water Mill", zip: ["11976"], miles: 26.4, minutes: 33, fee: 16500, tier: "B", desc: "Water Mill has luxury estate properties with high-end landscaping and premium stone requirements." },
  { slug: "north-babylon", name: "North Babylon", zip: ["11703"], miles: 31.3, minutes: 35, fee: 19000, tier: "B", desc: "North Babylon is a western Suffolk community at the edge of our standard delivery range." },
  { slug: "west-babylon", name: "West Babylon", zip: ["11704"], miles: 32.0, minutes: 35, fee: 19000, tier: "B", desc: "West Babylon sits at the western edge of our regular delivery area on the south shore." },
  { slug: "deer-park", name: "Deer Park", zip: ["11729"], miles: 31.2, minutes: 40, fee: 19500, tier: "B", desc: "Deer Park is a suburban community with residential landscaping and commercial property needs." },
];

async function main() {
  const rows = towns.map((t, i) => ({
    slug: t.slug,
    name: t.name,
    state: "NY",
    zip_codes: t.zip,
    tier: t.tier,
    delivery_fee_cents: t.fee,
    distance_miles: t.miles,
    drive_minutes: t.minutes,
    estimated_delivery_minutes: t.minutes + 25,
    local_description: t.desc,
    route_origin: "110 Frowein Road, Center Moriches, NY 11934",
    route_destination: `${t.name}, NY`,
    sort_order: 26 + i,
  }));

  let count = 0;
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const { error } = await sb.from("town_pages").upsert(batch, { onConflict: "slug" });
    if (error) console.error(`Error at ${i}:`, error.message);
    else count += batch.length;
  }
  console.log(`Inserted ${count} new towns`);

  const { count: total } = await sb.from("town_pages").select("id", { count: "exact", head: true });
  console.log(`Total towns now: ${total}`);
}

main().catch(console.error);
