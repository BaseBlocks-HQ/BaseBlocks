interface SiteLogoProps {
  site: { name: string; logoUrl?: string };
  team: {
    name: string;
    logoUrl?: string;
    settings: { primaryColor?: string };
  };
}

export function SiteLogo({ site, team }: SiteLogoProps) {
  // Priority: site logo > team logo > auto-generated
  if (site.logoUrl) {
    return (
      <img
        src={site.logoUrl}
        alt={site.name}
        className="h-8 w-8 rounded-lg object-contain"
      />
    );
  }

  if (team.logoUrl) {
    return (
      <img
        src={team.logoUrl}
        alt={team.name}
        className="h-8 w-8 rounded-lg object-contain"
      />
    );
  }

  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold"
      style={{
        backgroundColor: team.settings.primaryColor || "#0066FF",
      }}
    >
      {site.name[0]}
    </div>
  );
}
