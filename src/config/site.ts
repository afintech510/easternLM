export type NavLink = {
  href: string;
  label: string;
};

export const siteConfig = {
  name: "Eastern Landscape & Mason Supply",
  description:
    "Suffolk County landscape and masonry supply yard with pickup and delivery.",
  phoneDisplay: "(631) 874-6244",
  phoneHref: "tel:+16318746244",
  email: "sales@easternlm.com",
  addressLine1: "543 Montauk Highway",
  addressLine2: "East Moriches, NY 11940",
  hours: [
    "Mon-Fri: 7:00 AM - 5:00 PM",
    "Saturday: 7:00 AM - 3:00 PM",
    "Sunday: Closed",
  ],
  navLinks: [
    { href: "/shop", label: "Shop" },
    { href: "/services", label: "Services" },
    { href: "/gallery", label: "Gallery" },
    { href: "/blog", label: "Blog" },
    { href: "/delivery", label: "Delivery" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ] satisfies NavLink[],
} as const;
