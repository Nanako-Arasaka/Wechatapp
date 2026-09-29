const localPhotos: Record<string, string> = {
  "1626224583764-f87db24ac4ea": "badminton",
  "1546519638-68e109498ffc": "basketball",
  "1575361204480-aadea25e6e68": "football",
  "1595435934249-5df7ed86e1c0": "tennis",
  "1534158914592-062992fbe900": "table-tennis",
  "1530549387789-4c1017266635": "swimming",
};

export function venueImage(source?: string): string {
  const known = Object.keys(localPhotos).find((id) =>
    source?.includes(`images.unsplash.com/photo-${id}`),
  );
  return known
    ? `/assets/venues/${localPhotos[known]}.jpg`
    : source || "/assets/ui/venue.svg";
}
