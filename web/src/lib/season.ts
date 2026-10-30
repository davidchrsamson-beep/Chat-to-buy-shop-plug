// Christmas Edition: on from now until 7 January 2027 (Lagos time).
// Change this date (or set it in the past) to switch the festive touches off.
const CHRISTMAS_EDITION_UNTIL = new Date("2027-01-07T23:59:59+01:00");

export function isChristmasEdition(): boolean {
  return Date.now() <= CHRISTMAS_EDITION_UNTIL.getTime();
}
