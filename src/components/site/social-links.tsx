import { siteConfig } from "@/config/site";

const NETWORKS = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
] as const;

type Props = { className?: string; linkClassName?: string };

/** Links to the studio's social profiles; networks without a URL are hidden. */
export function SocialLinks({ className, linkClassName }: Props) {
  const links = NETWORKS.flatMap(({ key, label }) => {
    const href = siteConfig.socials[key];
    return href ? [{ href, label }] : [];
  });
  if (links.length === 0) return null;
  return (
    <ul className={className}>
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} className={linkClassName} rel="me noopener">
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
