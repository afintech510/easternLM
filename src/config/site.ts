export type NavLink = {
  href: string;
  label: string;
};

export const siteConfig = {
  name: "Eastern Landscape & Mason Supply",
  description:
    "Suffolk County landscape and masonry supply yard with pickup and delivery.",
  // Canonical production origin (used for absolute JSON-LD @id / urls).
  url: "https://www.easternlm.com",
  phoneDisplay: "(631) 874-6244",
  phoneHref: "tel:+16318746244",
  telephone: "+16318746244",
  smsHref: "sms:+16318746244",
  email: "sales@easternlm.com",
  addressLine1: "110 Frowein Road",
  addressLine2: "Center Moriches, NY 11934",
  // Structured address (single source of truth for schema.org PostalAddress).
  address: {
    streetAddress: "110 Frowein Road",
    addressLocality: "Center Moriches",
    addressRegion: "NY",
    postalCode: "11934",
    addressCountry: "US",
  },
  geo: { latitude: 40.7894, longitude: -72.7929 },
  priceRange: "$$",
  // Primary service area (schema areaServed + on-page copy).
  serviceArea: "Suffolk County, New York",
  hours: [
    "Mon-Fri: 7:00 AM - 5:00 PM",
    "Saturday: 7:00 AM - 3:00 PM",
    "Sunday: Closed",
  ],
  navLinks: [
    { href: "/shop", label: "Shop" },
    { href: "/services", label: "Services" },
    { href: "/blog", label: "Blog" },
    { href: "/delivery", label: "Delivery" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ] satisfies NavLink[],
} as const;
