/* ============================================================
   VITEC PLANIA – FOTBALL-VM 2026
   Dette er den ENESTE filen dere trenger å redigere.

   1) DELTAKERE: Bytt ut eksempelnavnene med ekte deltakere.
      "lag" må matche et lagnavn slik det er skrevet i TEAMS under.

   2) RESULTATER: Når en kamp er spilt, legg inn f.eks.
         resultat: [2, 1]
      på kampen (hjemmemål, bortemål). La stå null for uspilte kamper.

   3) SLUTTSPILL: Når lagene er klare, fyll inn homeTeam/awayTeam.
      - resultat: stillingen etter ORDINÆR TID (90 min), f.eks. [1, 1]
      - ekstraomganger: sluttresultat etter ekstraomganger hvis spilt,
        f.eks. [2, 1]. La stå null hvis kampen ble avgjort på 90 min
        eller gikk rett til straffer.
      - penaltyWinner: "home" eller "away" hvis avgjort på straffer.
   ============================================================ */

// ---- DELTAKERE ----
// NB: Når siden kjøres via server.py er det data.json (redigeres i
// adminpanelet) som gjelder. Denne listen brukes bare som reserve.
const DELTAKERE = [
  { navn: "Asbjørn",     lag: "Portugal" },
  { navn: "Frode",       lag: "Colombia" },
  { navn: "Heidi Marie", lag: "Belgia" },
  { navn: "Olav",        lag: "Norge" },
  { navn: "Lasse",       lag: "USA" },
  { navn: "Steffen",     lag: "Argentina" },
  { navn: "Line",        lag: "Frankrike" },
  { navn: "Stian",       lag: "Brasil" },
  { navn: "Trude",       lag: "Kroatia" },
  { navn: "Daniel",      lag: "Tyskland" },
  { navn: "Jon Erik",    lag: "Japan" },
  { navn: "Arne",        lag: "England" },
  { navn: "Linda",       lag: "Bosnia-Hercegovina" },
  { navn: "Lisa A",      lag: "Uruguay" },
  { navn: "Åsmund",      lag: "Senegal" },
  { navn: "Jarle",       lag: "Spania" },
  { navn: "Bane",        lag: "Marokko" },
];

// ---- POENGREGLER ----
const POENG = {
  seier: 3,
  uavgjort: 1,
  // true  = seier på straffer gir full pott (3 poeng), taper får 0
  // false = uavgjort etter ordinær tid gir 1 poeng til begge uansett
  straffeseierTellerSomSeier: true,
  // Målscoring per lag: straffekonkurranser telles ALDRI med.
  // false = kun mål i ordinær tid (90 min)
  // true  = mål i ekstraomganger telles også (virker tilbake på alle kamper)
  maalIEkstraomganger: false,
};

// ---- LAG MED FLAGGKODER (flagcdn.com) ----
const TEAMS = {
  "Mexico": "mx", "Sør-Afrika": "za", "Sør-Korea": "kr", "Tsjekkia": "cz",
  "Canada": "ca", "Bosnia-Hercegovina": "ba", "Qatar": "qa", "Sveits": "ch",
  "Brasil": "br", "Marokko": "ma", "Haiti": "ht", "Skottland": "gb-sct",
  "USA": "us", "Paraguay": "py", "Australia": "au", "Tyrkia": "tr",
  "Tyskland": "de", "Curaçao": "cw", "Elfenbenskysten": "ci", "Ecuador": "ec",
  "Nederland": "nl", "Japan": "jp", "Sverige": "se", "Tunisia": "tn",
  "Belgia": "be", "Egypt": "eg", "Iran": "ir", "New Zealand": "nz",
  "Spania": "es", "Kapp Verde": "cv", "Saudi-Arabia": "sa", "Uruguay": "uy",
  "Frankrike": "fr", "Senegal": "sn", "Irak": "iq", "Norge": "no",
  "Argentina": "ar", "Algerie": "dz", "Østerrike": "at", "Jordan": "jo",
  "Portugal": "pt", "DR Kongo": "cd", "Usbekistan": "uz", "Colombia": "co",
  "England": "gb-eng", "Kroatia": "hr", "Ghana": "gh", "Panama": "pa",
};

// ---- GRUPPER ----
const GRUPPER = {
  A: ["Mexico", "Sør-Afrika", "Sør-Korea", "Tsjekkia"],
  B: ["Canada", "Bosnia-Hercegovina", "Qatar", "Sveits"],
  C: ["Brasil", "Marokko", "Haiti", "Skottland"],
  D: ["USA", "Paraguay", "Australia", "Tyrkia"],
  E: ["Tyskland", "Curaçao", "Elfenbenskysten", "Ecuador"],
  F: ["Nederland", "Japan", "Sverige", "Tunisia"],
  G: ["Belgia", "Egypt", "Iran", "New Zealand"],
  H: ["Spania", "Kapp Verde", "Saudi-Arabia", "Uruguay"],
  I: ["Frankrike", "Senegal", "Irak", "Norge"],
  J: ["Argentina", "Algerie", "Østerrike", "Jordan"],
  K: ["Portugal", "DR Kongo", "Usbekistan", "Colombia"],
  L: ["England", "Kroatia", "Ghana", "Panama"],
};

// ---- GRUPPESPILL (tidspunkt i UTC – vises automatisk i norsk tid) ----
const KAMPER = [
  { id: 1,  gruppe: "A", home: "Mexico", away: "Sør-Afrika", utc: "2026-06-11T19:00:00Z", venue: "Mexico City", resultat: null },
  { id: 2,  gruppe: "A", home: "Sør-Korea", away: "Tsjekkia", utc: "2026-06-12T02:00:00Z", venue: "Guadalajara", resultat: null },
  { id: 3,  gruppe: "B", home: "Canada", away: "Bosnia-Hercegovina", utc: "2026-06-12T19:00:00Z", venue: "Toronto", resultat: null },
  { id: 4,  gruppe: "D", home: "USA", away: "Paraguay", utc: "2026-06-13T01:00:00Z", venue: "Los Angeles", resultat: null },
  { id: 5,  gruppe: "C", home: "Haiti", away: "Skottland", utc: "2026-06-14T01:00:00Z", venue: "Boston", resultat: null },
  { id: 6,  gruppe: "D", home: "Australia", away: "Tyrkia", utc: "2026-06-14T04:00:00Z", venue: "Vancouver", resultat: null },
  { id: 7,  gruppe: "C", home: "Brasil", away: "Marokko", utc: "2026-06-13T22:00:00Z", venue: "New York/New Jersey", resultat: null },
  { id: 8,  gruppe: "B", home: "Qatar", away: "Sveits", utc: "2026-06-13T19:00:00Z", venue: "San Francisco", resultat: null },
  { id: 9,  gruppe: "E", home: "Elfenbenskysten", away: "Ecuador", utc: "2026-06-14T23:00:00Z", venue: "Philadelphia", resultat: null },
  { id: 10, gruppe: "E", home: "Tyskland", away: "Curaçao", utc: "2026-06-14T17:00:00Z", venue: "Houston", resultat: null },
  { id: 11, gruppe: "F", home: "Nederland", away: "Japan", utc: "2026-06-14T20:00:00Z", venue: "Dallas", resultat: null },
  { id: 12, gruppe: "F", home: "Sverige", away: "Tunisia", utc: "2026-06-15T02:00:00Z", venue: "Monterrey", resultat: null },
  { id: 13, gruppe: "H", home: "Saudi-Arabia", away: "Uruguay", utc: "2026-06-15T22:00:00Z", venue: "Miami", resultat: null },
  { id: 14, gruppe: "H", home: "Spania", away: "Kapp Verde", utc: "2026-06-15T16:00:00Z", venue: "Atlanta", resultat: null },
  { id: 15, gruppe: "G", home: "Belgia", away: "Egypt", utc: "2026-06-15T19:00:00Z", venue: "Seattle", resultat: null },
  { id: 16, gruppe: "G", home: "Iran", away: "New Zealand", utc: "2026-06-16T01:00:00Z", venue: "Los Angeles", resultat: null },
  { id: 17, gruppe: "I", home: "Frankrike", away: "Senegal", utc: "2026-06-16T19:00:00Z", venue: "New York/New Jersey", resultat: null },
  { id: 18, gruppe: "I", home: "Irak", away: "Norge", utc: "2026-06-16T22:00:00Z", venue: "Boston", resultat: null },
  { id: 19, gruppe: "J", home: "Argentina", away: "Algerie", utc: "2026-06-17T01:00:00Z", venue: "Kansas City", resultat: null },
  { id: 20, gruppe: "J", home: "Østerrike", away: "Jordan", utc: "2026-06-17T04:00:00Z", venue: "San Francisco", resultat: null },
  { id: 21, gruppe: "L", home: "Ghana", away: "Panama", utc: "2026-06-17T23:00:00Z", venue: "Toronto", resultat: null },
  { id: 22, gruppe: "L", home: "England", away: "Kroatia", utc: "2026-06-17T20:00:00Z", venue: "Dallas", resultat: null },
  { id: 23, gruppe: "K", home: "Portugal", away: "DR Kongo", utc: "2026-06-17T17:00:00Z", venue: "Houston", resultat: null },
  { id: 24, gruppe: "K", home: "Usbekistan", away: "Colombia", utc: "2026-06-18T02:00:00Z", venue: "Mexico City", resultat: null },
  { id: 25, gruppe: "A", home: "Tsjekkia", away: "Sør-Afrika", utc: "2026-06-18T16:00:00Z", venue: "Atlanta", resultat: null },
  { id: 26, gruppe: "B", home: "Sveits", away: "Bosnia-Hercegovina", utc: "2026-06-18T19:00:00Z", venue: "Los Angeles", resultat: null },
  { id: 27, gruppe: "B", home: "Canada", away: "Qatar", utc: "2026-06-18T22:00:00Z", venue: "Vancouver", resultat: null },
  { id: 28, gruppe: "A", home: "Mexico", away: "Sør-Korea", utc: "2026-06-19T01:00:00Z", venue: "Guadalajara", resultat: null },
  { id: 29, gruppe: "C", home: "Brasil", away: "Haiti", utc: "2026-06-20T00:30:00Z", venue: "Philadelphia", resultat: null },
  { id: 30, gruppe: "C", home: "Skottland", away: "Marokko", utc: "2026-06-19T22:00:00Z", venue: "Boston", resultat: null },
  { id: 31, gruppe: "D", home: "Tyrkia", away: "Paraguay", utc: "2026-06-20T03:00:00Z", venue: "San Francisco", resultat: null },
  { id: 32, gruppe: "D", home: "USA", away: "Australia", utc: "2026-06-19T19:00:00Z", venue: "Seattle", resultat: null },
  { id: 33, gruppe: "E", home: "Tyskland", away: "Elfenbenskysten", utc: "2026-06-20T20:00:00Z", venue: "Toronto", resultat: null },
  { id: 34, gruppe: "E", home: "Ecuador", away: "Curaçao", utc: "2026-06-21T00:00:00Z", venue: "Kansas City", resultat: null },
  { id: 35, gruppe: "F", home: "Nederland", away: "Sverige", utc: "2026-06-20T17:00:00Z", venue: "Houston", resultat: null },
  { id: 36, gruppe: "F", home: "Tunisia", away: "Japan", utc: "2026-06-21T04:00:00Z", venue: "Monterrey", resultat: null },
  { id: 37, gruppe: "H", home: "Uruguay", away: "Kapp Verde", utc: "2026-06-21T22:00:00Z", venue: "Miami", resultat: null },
  { id: 38, gruppe: "H", home: "Spania", away: "Saudi-Arabia", utc: "2026-06-21T16:00:00Z", venue: "Atlanta", resultat: null },
  { id: 39, gruppe: "G", home: "Belgia", away: "Iran", utc: "2026-06-21T19:00:00Z", venue: "Los Angeles", resultat: null },
  { id: 40, gruppe: "G", home: "New Zealand", away: "Egypt", utc: "2026-06-22T01:00:00Z", venue: "Vancouver", resultat: null },
  { id: 41, gruppe: "I", home: "Norge", away: "Senegal", utc: "2026-06-23T00:00:00Z", venue: "New York/New Jersey", resultat: null },
  { id: 42, gruppe: "I", home: "Frankrike", away: "Irak", utc: "2026-06-22T21:00:00Z", venue: "Philadelphia", resultat: null },
  { id: 43, gruppe: "J", home: "Argentina", away: "Østerrike", utc: "2026-06-22T17:00:00Z", venue: "Dallas", resultat: null },
  { id: 44, gruppe: "J", home: "Jordan", away: "Algerie", utc: "2026-06-23T03:00:00Z", venue: "San Francisco", resultat: null },
  { id: 45, gruppe: "L", home: "England", away: "Ghana", utc: "2026-06-23T20:00:00Z", venue: "Boston", resultat: null },
  { id: 46, gruppe: "L", home: "Panama", away: "Kroatia", utc: "2026-06-23T23:00:00Z", venue: "Toronto", resultat: null },
  { id: 47, gruppe: "K", home: "Portugal", away: "Usbekistan", utc: "2026-06-23T17:00:00Z", venue: "Houston", resultat: null },
  { id: 48, gruppe: "K", home: "Colombia", away: "DR Kongo", utc: "2026-06-24T02:00:00Z", venue: "Guadalajara", resultat: null },
  { id: 49, gruppe: "C", home: "Skottland", away: "Brasil", utc: "2026-06-24T22:00:00Z", venue: "Miami", resultat: null },
  { id: 50, gruppe: "C", home: "Marokko", away: "Haiti", utc: "2026-06-24T22:00:00Z", venue: "Atlanta", resultat: null },
  { id: 51, gruppe: "B", home: "Sveits", away: "Canada", utc: "2026-06-24T19:00:00Z", venue: "Vancouver", resultat: null },
  { id: 52, gruppe: "B", home: "Bosnia-Hercegovina", away: "Qatar", utc: "2026-06-24T19:00:00Z", venue: "Seattle", resultat: null },
  { id: 53, gruppe: "A", home: "Tsjekkia", away: "Mexico", utc: "2026-06-25T01:00:00Z", venue: "Mexico City", resultat: null },
  { id: 54, gruppe: "A", home: "Sør-Afrika", away: "Sør-Korea", utc: "2026-06-25T01:00:00Z", venue: "Monterrey", resultat: null },
  { id: 55, gruppe: "E", home: "Curaçao", away: "Elfenbenskysten", utc: "2026-06-25T20:00:00Z", venue: "Philadelphia", resultat: null },
  { id: 56, gruppe: "E", home: "Ecuador", away: "Tyskland", utc: "2026-06-25T20:00:00Z", venue: "New York/New Jersey", resultat: null },
  { id: 57, gruppe: "F", home: "Japan", away: "Sverige", utc: "2026-06-25T23:00:00Z", venue: "Dallas", resultat: null },
  { id: 58, gruppe: "F", home: "Tunisia", away: "Nederland", utc: "2026-06-25T23:00:00Z", venue: "Kansas City", resultat: null },
  { id: 59, gruppe: "D", home: "Tyrkia", away: "USA", utc: "2026-06-26T02:00:00Z", venue: "Los Angeles", resultat: null },
  { id: 60, gruppe: "D", home: "Paraguay", away: "Australia", utc: "2026-06-26T02:00:00Z", venue: "San Francisco", resultat: null },
  { id: 61, gruppe: "I", home: "Norge", away: "Frankrike", utc: "2026-06-26T19:00:00Z", venue: "Boston", resultat: null },
  { id: 62, gruppe: "I", home: "Senegal", away: "Irak", utc: "2026-06-26T19:00:00Z", venue: "Toronto", resultat: null },
  { id: 63, gruppe: "G", home: "Egypt", away: "Iran", utc: "2026-06-27T03:00:00Z", venue: "Seattle", resultat: null },
  { id: 64, gruppe: "G", home: "New Zealand", away: "Belgia", utc: "2026-06-27T03:00:00Z", venue: "Vancouver", resultat: null },
  { id: 65, gruppe: "H", home: "Kapp Verde", away: "Saudi-Arabia", utc: "2026-06-27T00:00:00Z", venue: "Houston", resultat: null },
  { id: 66, gruppe: "H", home: "Uruguay", away: "Spania", utc: "2026-06-27T00:00:00Z", venue: "Guadalajara", resultat: null },
  { id: 67, gruppe: "L", home: "Panama", away: "England", utc: "2026-06-27T21:00:00Z", venue: "New York/New Jersey", resultat: null },
  { id: 68, gruppe: "L", home: "Kroatia", away: "Ghana", utc: "2026-06-27T21:00:00Z", venue: "Philadelphia", resultat: null },
  { id: 69, gruppe: "J", home: "Algerie", away: "Østerrike", utc: "2026-06-28T02:00:00Z", venue: "Kansas City", resultat: null },
  { id: 70, gruppe: "J", home: "Jordan", away: "Argentina", utc: "2026-06-28T02:00:00Z", venue: "Dallas", resultat: null },
  { id: 71, gruppe: "K", home: "Colombia", away: "Portugal", utc: "2026-06-27T23:30:00Z", venue: "Miami", resultat: null },
  { id: 72, gruppe: "K", home: "DR Kongo", away: "Usbekistan", utc: "2026-06-27T23:30:00Z", venue: "Atlanta", resultat: null },
];

// ---- SLUTTSPILL ----
// homeSlot/awaySlot beskriver hvem som kvalifiserer seg (1A = vinner gruppe A,
// 2B = toer gruppe B, 3X/Y/... = en av de beste treerne, W73 = vinner kamp 73).
// Fyll inn homeTeam/awayTeam når lagene er klare, deretter resultat.
const SLUTTSPILL = [
  { id: 73,  runde: "R32", homeSlot: "2A",  awaySlot: "2B",  utc: "2026-06-28T19:00:00Z", venue: "Los Angeles", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 74,  runde: "R32", homeSlot: "1E",  awaySlot: "3ABCDF", utc: "2026-06-29T20:30:00Z", venue: "Boston", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 75,  runde: "R32", homeSlot: "1F",  awaySlot: "2C",  utc: "2026-06-30T01:00:00Z", venue: "Monterrey", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 76,  runde: "R32", homeSlot: "1C",  awaySlot: "2F",  utc: "2026-06-29T17:00:00Z", venue: "Houston", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 77,  runde: "R32", homeSlot: "1I",  awaySlot: "3CDFGH", utc: "2026-06-30T21:00:00Z", venue: "New York/New Jersey", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 78,  runde: "R32", homeSlot: "2E",  awaySlot: "2I",  utc: "2026-06-30T17:00:00Z", venue: "Dallas", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 79,  runde: "R32", homeSlot: "1A",  awaySlot: "3CEFHI", utc: "2026-07-01T01:00:00Z", venue: "Mexico City", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 80,  runde: "R32", homeSlot: "1L",  awaySlot: "3EHIJK", utc: "2026-07-01T16:00:00Z", venue: "Atlanta", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 81,  runde: "R32", homeSlot: "1D",  awaySlot: "3BEFIJ", utc: "2026-07-02T00:00:00Z", venue: "San Francisco", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 82,  runde: "R32", homeSlot: "1G",  awaySlot: "3AEHIJ", utc: "2026-07-01T20:00:00Z", venue: "Seattle", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 83,  runde: "R32", homeSlot: "2K",  awaySlot: "2L",  utc: "2026-07-02T23:00:00Z", venue: "Toronto", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 84,  runde: "R32", homeSlot: "1H",  awaySlot: "2J",  utc: "2026-07-02T19:00:00Z", venue: "Los Angeles", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 85,  runde: "R32", homeSlot: "1B",  awaySlot: "3EFGIJ", utc: "2026-07-03T03:00:00Z", venue: "Vancouver", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 86,  runde: "R32", homeSlot: "1J",  awaySlot: "2H",  utc: "2026-07-03T22:00:00Z", venue: "Miami", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 87,  runde: "R32", homeSlot: "1K",  awaySlot: "3DEIJL", utc: "2026-07-03T23:30:00Z", venue: "Kansas City", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 88,  runde: "R32", homeSlot: "2D",  awaySlot: "2G",  utc: "2026-07-03T18:00:00Z", venue: "Dallas", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 89,  runde: "R16", homeSlot: "W74", awaySlot: "W77", utc: "2026-07-04T21:00:00Z", venue: "Philadelphia", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 90,  runde: "R16", homeSlot: "W73", awaySlot: "W75", utc: "2026-07-04T17:00:00Z", venue: "Houston", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 91,  runde: "R16", homeSlot: "W76", awaySlot: "W78", utc: "2026-07-05T20:00:00Z", venue: "New York/New Jersey", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 92,  runde: "R16", homeSlot: "W79", awaySlot: "W80", utc: "2026-07-06T00:00:00Z", venue: "Mexico City", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 93,  runde: "R16", homeSlot: "W83", awaySlot: "W84", utc: "2026-07-06T19:00:00Z", venue: "Dallas", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 94,  runde: "R16", homeSlot: "W81", awaySlot: "W82", utc: "2026-07-07T00:00:00Z", venue: "Seattle", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 95,  runde: "R16", homeSlot: "W86", awaySlot: "W88", utc: "2026-07-07T16:00:00Z", venue: "Atlanta", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 96,  runde: "R16", homeSlot: "W85", awaySlot: "W87", utc: "2026-07-07T20:00:00Z", venue: "Vancouver", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 97,  runde: "QF",  homeSlot: "W89", awaySlot: "W90", utc: "2026-07-09T20:00:00Z", venue: "Boston", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 98,  runde: "QF",  homeSlot: "W93", awaySlot: "W94", utc: "2026-07-10T19:00:00Z", venue: "Los Angeles", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 99,  runde: "QF",  homeSlot: "W91", awaySlot: "W92", utc: "2026-07-11T21:00:00Z", venue: "Miami", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 100, runde: "QF",  homeSlot: "W95", awaySlot: "W96", utc: "2026-07-11T23:00:00Z", venue: "Kansas City", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 101, runde: "SF",  homeSlot: "W97", awaySlot: "W98", utc: "2026-07-14T19:00:00Z", venue: "Dallas", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 102, runde: "SF",  homeSlot: "W99", awaySlot: "W100", utc: "2026-07-15T19:00:00Z", venue: "Atlanta", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 103, runde: "BRONSE", homeSlot: "T101", awaySlot: "T102", utc: "2026-07-18T21:00:00Z", venue: "Miami", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
  { id: 104, runde: "FINALE", homeSlot: "W101", awaySlot: "W102", utc: "2026-07-19T19:00:00Z", venue: "New York/New Jersey", homeTeam: null, awayTeam: null, resultat: null, ekstraomganger: null, penaltyWinner: null },
];
