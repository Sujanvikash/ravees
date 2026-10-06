// Seasonal touches: snow falls around Santa from 1 Dec to 6 Jan, and he wears a winter scarf
// after Christmas (26 Dec to end of Feb). `?santa-season=snow|scarf|both|none` overrides the
// date, for previewing.
export function getSeason(date = new Date(), search = window.location.search) {
  const override = new URLSearchParams(search).get("santa-season");
  if (override) {
    return {
      snow: override === "snow" || override === "both",
      scarf: override === "scarf" || override === "both",
    };
  }
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return {
    snow: month === 12 || (month === 1 && day <= 6),
    scarf: (month === 12 && day >= 26) || month === 1 || month === 2,
  };
}
