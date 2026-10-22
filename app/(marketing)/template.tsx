/**
 * Re-mounts on every marketing navigation, which lets the shared
 * enter animation run so pages glide in instead of snapping.
 */
export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
