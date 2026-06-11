/* ====== VITEC PLANIA VM 2026 – app-logikk ======
   Ingenting her trenger å redigeres – alt styres fra data.js. */

const fmtDato = new Intl.DateTimeFormat("nb-NO", {
  timeZone: "Europe/Oslo", weekday: "short", day: "numeric", month: "short",
});
const fmtDatoLang = new Intl.DateTimeFormat("nb-NO", {
  timeZone: "Europe/Oslo", weekday: "long", day: "numeric", month: "long",
});
const fmtKlokke = new Intl.DateTimeFormat("nb-NO", {
  timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit",
});

function norskTid(utc) {
  const d = new Date(utc);
  return `${fmtDato.format(d)} kl. ${fmtKlokke.format(d)}`;
}
function norskDag(utc) {
  const s = fmtDatoLang.format(new Date(utc));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function flagg(lag, stor = false) {
  const kode = TEAMS[lag];
  if (!kode) return "🏳️";
  const h = stor ? "h60" : "h40";
  return `<img class="flag-img ${stor ? "flag-lg" : ""}" src="https://flagcdn.com/${h}/${kode}.png" alt="${lag}" loading="lazy">`;
}

const RUNDE_NAVN = {
  R32: "16-delsfinaler", R16: "Åttedelsfinaler", QF: "Kvartfinaler",
  SF: "Semifinaler", BRONSE: "Bronsefinale", FINALE: "Finale",
};
const RUNDE_KORT = {
  R32: "16-delsfinale", R16: "Åttedelsfinale", QF: "Kvartfinale",
  SF: "Semifinale", BRONSE: "Bronsefinale", FINALE: "Finale",
};

/* ---------- Resultathjelpere ---------- */
// Sluttresultatet som avgjør kampen (etter ekstraomganger hvis spilt)
function sluttScore(k) {
  return k.ekstraomganger || k.resultat;
}
// Målene som telles i målstatistikken (straffekonkurranse telles aldri)
function maalScore(k) {
  if (POENG.maalIEkstraomganger && k.ekstraomganger) return k.ekstraomganger;
  return k.resultat;
}

// Alle spilte kamper normalisert til {home, away, resultat, ekstraomganger, penaltyWinner}
function alleSpilteKamper() {
  const gruppe = KAMPER
    .filter((k) => k.resultat)
    .map((k) => ({ home: k.home, away: k.away, resultat: k.resultat, ekstraomganger: null, penaltyWinner: null }));
  const slutt = SLUTTSPILL
    .filter((k) => k.resultat && k.homeTeam && k.awayTeam)
    .map((k) => ({ home: k.homeTeam, away: k.awayTeam, resultat: k.resultat, ekstraomganger: k.ekstraomganger, penaltyWinner: k.penaltyWinner }));
  return gruppe.concat(slutt);
}

function statsForLag(lag) {
  let poeng = 0, seire = 0, uavgjort = 0, tap = 0, spilt = 0, maal = 0;
  for (const k of alleSpilteKamper()) {
    if (k.home !== lag && k.away !== lag) continue;
    spilt++;
    const erHjemme = k.home === lag;

    const [mh, ma] = maalScore(k);
    maal += erHjemme ? mh : ma;

    const [h, a] = sluttScore(k);
    const mine = erHjemme ? h : a;
    const deres = erHjemme ? a : h;
    if (mine > deres) { poeng += POENG.seier; seire++; }
    else if (mine < deres) { tap++; }
    else if (k.penaltyWinner && POENG.straffeseierTellerSomSeier) {
      const vantStraffer = (k.penaltyWinner === "home") === erHjemme;
      if (vantStraffer) { poeng += POENG.seier; seire++; }
      else { tap++; }
    } else { poeng += POENG.uavgjort; uavgjort++; }
  }
  return { poeng, seire, uavgjort, tap, spilt, maal };
}

// Et lag er ute når det har tapt en sluttspillkamp (gruppespill markeres ikke
// automatisk, siden treerne kan gå videre).
function erSlaattUt(lag) {
  return SLUTTSPILL.some((k) => {
    if (!k.resultat || !k.homeTeam || !k.awayTeam) return false;
    if (k.homeTeam !== lag && k.awayTeam !== lag) return false;
    if (k.runde === "BRONSE" || k.runde === "FINALE") return false;
    const [h, a] = sluttScore(k);
    const erHjemme = k.homeTeam === lag;
    if (h === a) return k.penaltyWinner && (k.penaltyWinner === "home") !== erHjemme;
    return erHjemme ? a > h : h > a;
  });
}

function kamperForLag(lag) {
  const liste = [];
  for (const k of KAMPER) {
    if (k.home === lag || k.away === lag) {
      liste.push({ ...k, etikett: `Gruppe ${k.gruppe}` });
    }
  }
  for (const k of SLUTTSPILL) {
    if (k.homeTeam === lag || k.awayTeam === lag) {
      liste.push({ ...k, home: k.homeTeam, away: k.awayTeam, etikett: RUNDE_KORT[k.runde] });
    }
  }
  return liste.sort((a, b) => new Date(a.utc) - new Date(b.utc));
}

function nesteKampFor(lag) {
  return kamperForLag(lag).find((k) => !k.resultat) || null;
}

/* ---------- Rangering ----------
   Lik poengsum gir lik plassering, og neste plass hoppes over:
   1, 2, 3, 3, 5, 6 ... ("standard competition ranking"). */
function medRangering(rader) {
  // rader må være sortert på poeng synkende
  let forrigePoeng = null, forrigeRang = 0;
  return rader.map((r, i) => {
    const rang = r.poeng === forrigePoeng ? forrigeRang : i + 1;
    forrigePoeng = r.poeng;
    forrigeRang = rang;
    return { ...r, rang };
  });
}

/* ---------- Scoreboard ---------- */
function byggScoreboard() {
  const rader = medRangering(
    DELTAKERE.map((d) => {
      const stats = statsForLag(d.lag);
      return { ...d, ...stats, ute: erSlaattUt(d.lag) };
    }).sort((a, b) => b.poeng - a.poeng || a.navn.localeCompare(b.navn, "nb"))
  );

  // Pallplasser (kun deltakere som faktisk har poeng)
  const podium = document.getElementById("podium");
  const medaljer = { 1: "🥇", 2: "🥈", 3: "🥉" };
  podium.innerHTML = rader.slice(0, 3).filter((r) => r.poeng > 0 && r.rang <= 3).map((r, i) => `
    <div class="podium-spot podium-${i + 1}" data-deltaker="${r.navn}">
      <span class="medal">${medaljer[r.rang]}</span>
      <span class="p-flag">${flagg(r.lag, true)}</span>
      <div class="p-name">${r.navn}</div>
      <div class="p-team">${r.lag}</div>
      <div class="p-points">${r.poeng} p</div>
    </div>`).join("");

  const board = document.getElementById("scoreboard");
  board.innerHTML = rader.map((r, i) => {
    const neste = nesteKampFor(r.lag);
    const nesteTekst = r.ute
      ? "Slått ut av VM 😢"
      : neste
        ? `Neste: ${neste.home ?? "?"} – ${neste.away ?? "?"} · ${norskTid(neste.utc)}`
        : "Ingen kamper igjen";
    return `
      <div class="score-row ${r.ute ? "eliminated" : ""}" data-deltaker="${r.navn}" style="animation-delay:${i * 0.06}s">
        <div class="rank ${r.rang <= 3 ? `r${r.rang}` : ""}">${r.rang}</div>
        <div class="s-who">
          <span class="s-flag">${flagg(r.lag)}</span>
          <span class="s-name">${r.navn} <span class="s-country">(${r.lag})</span></span>
        </div>
        <div class="s-stats">${r.spilt} kamper · ${r.seire}S ${r.uavgjort}U ${r.tap}T · ⚽ ${r.maal} mål<br>${nesteTekst}</div>
        <div class="s-points">${r.poeng}<small> poeng</small></div>
      </div>`;
  }).join("");

  // Klikk på rad eller pallplass → deltakerside
  document.querySelectorAll("[data-deltaker]").forEach((el) => {
    el.addEventListener("click", () => visDeltaker(el.dataset.deltaker));
  });
}

/* ---------- Trendgraf: plassering dag for dag ---------- */
const fmtDagNokkel = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Oslo", year: "numeric", month: "2-digit", day: "2-digit",
});
const fmtKortDato = new Intl.DateTimeFormat("nb-NO", {
  timeZone: "Europe/Oslo", day: "numeric", month: "numeric",
});

function dagNokkel(dato) {
  return fmtDagNokkel.format(dato);
}

// Alle turneringsdager fra åpningskampen til og med i dag (maks t.o.m. finalen)
function turneringsDager() {
  const dager = [];
  const start = new Date("2026-06-11T10:00:00Z");
  const slutt = new Date("2026-07-20T10:00:00Z");
  const naa = new Date();
  for (let d = new Date(start); d <= slutt; d = new Date(d.getTime() + 86400000)) {
    dager.push({ nokkel: dagNokkel(d), label: fmtKortDato.format(d) });
    if (dagNokkel(d) === dagNokkel(naa)) break;
  }
  return dager;
}

function poengTilOgMedDag(lag, nokkel) {
  let poeng = 0;
  const tell = (home, away, k) => {
    if (home !== lag && away !== lag) return;
    if (dagNokkel(new Date(k.utc)) > nokkel) return;
    const [h, a] = sluttScore(k);
    const erHjemme = home === lag;
    const mine = erHjemme ? h : a, deres = erHjemme ? a : h;
    if (mine > deres) poeng += POENG.seier;
    else if (mine === deres) {
      if (k.penaltyWinner && POENG.straffeseierTellerSomSeier) {
        if ((k.penaltyWinner === "home") === erHjemme) poeng += POENG.seier;
      } else poeng += POENG.uavgjort;
    }
  };
  for (const k of KAMPER) if (k.resultat) tell(k.home, k.away, k);
  for (const k of SLUTTSPILL) if (k.resultat && k.homeTeam && k.awayTeam) tell(k.homeTeam, k.awayTeam, k);
  return poeng;
}

// Plassering per deltaker per dag, med delt rangering ved poenglikhet
function rangeringPerDag() {
  const dager = turneringsDager();
  const serier = Object.fromEntries(DELTAKERE.map((d) => [d.navn, []]));
  for (const dag of dager) {
    const rader = medRangering(
      DELTAKERE.map((d) => ({ navn: d.navn, poeng: poengTilOgMedDag(d.lag, dag.nokkel) }))
        .sort((a, b) => b.poeng - a.poeng || a.navn.localeCompare(b.navn, "nb"))
    );
    for (const r of rader) serier[r.navn].push(r.rang);
  }
  return { dager, serier };
}

function tegnTrendGraf(navn, sammenlignMed) {
  const { dager, serier } = rangeringPerDag();
  const antall = DELTAKERE.length;
  const B = 800, H = 320, mL = 40, mR = 16, mT = 16, mB = 36;
  const bredde = B - mL - mR, hoyde = H - mT - mB;
  const x = (i) => mL + (dager.length === 1 ? bredde / 2 : (i / (dager.length - 1)) * bredde);
  const y = (rang) => mT + (antall === 1 ? hoyde / 2 : ((rang - 1) / (antall - 1)) * hoyde);

  // Rutenett og y-akse (1 øverst, sisteplass nederst)
  const ySteg = antall > 14 ? 2 : 1;
  let akser = "";
  for (let r = 1; r <= antall; r += ySteg) {
    akser += `<line x1="${mL}" y1="${y(r)}" x2="${B - mR}" y2="${y(r)}" class="tg-grid"/>` +
             `<text x="${mL - 8}" y="${y(r) + 4}" class="tg-ylabel">${r}</text>`;
  }
  const xSteg = Math.max(1, Math.ceil(dager.length / 9));
  for (let i = 0; i < dager.length; i += xSteg) {
    akser += `<text x="${x(i)}" y="${H - 12}" class="tg-xlabel">${dager[i].label}</text>`;
  }

  const linje = (serie, klasse) => {
    const punkter = serie.map((rang, i) => `${x(i).toFixed(1)},${y(rang).toFixed(1)}`);
    const dots = serie.map((rang, i) =>
      `<circle cx="${x(i).toFixed(1)}" cy="${y(rang).toFixed(1)}" r="4" class="${klasse}-dot"><title>${dager[i].label}: ${rang}. plass</title></circle>`).join("");
    return `<polyline points="${punkter.join(" ")}" class="${klasse}"/>` + dots;
  };

  let grafer = linje(serier[navn], "tg-linje");
  let tegnforklaring = `<span class="tg-leg"><span class="tg-dot-a"></span>${navn}</span>`;
  if (sammenlignMed && serier[sammenlignMed]) {
    grafer += linje(serier[sammenlignMed], "tg-linje2");
    tegnforklaring += `<span class="tg-leg"><span class="tg-dot-b"></span>${sammenlignMed}</span>`;
  }

  return `
    <div class="tg-top">
      <div class="tg-legend">${tegnforklaring}</div>
      <label class="tg-compare">Sammenlign med:
        <select id="sammenlignVelger">
          <option value="">– av –</option>
          ${DELTAKERE.filter((d) => d.navn !== navn).map((d) =>
            `<option value="${d.navn}" ${d.navn === sammenlignMed ? "selected" : ""}>${d.navn} (${d.lag})</option>`).join("")}
        </select>
      </label>
    </div>
    <svg viewBox="0 0 ${B} ${H}" class="trendgraf" role="img" aria-label="Plassering dag for dag">
      ${akser}${grafer}
    </svg>`;
}

/* ---------- Deltakerside ---------- */
function resultatTekst(k, lag) {
  // Returnerer {score, suffiks, utfall} sett fra lagets side
  const [h, a] = sluttScore(k);
  const erHjemme = k.home === lag;
  let suffiks = "";
  if (k.ekstraomganger) suffiks = " e.e.o.";
  let utfall;
  if (h === a) {
    if (k.penaltyWinner) {
      const vant = (k.penaltyWinner === "home") === erHjemme;
      suffiks = " e.str.";
      utfall = vant && POENG.straffeseierTellerSomSeier ? "V" : (vant ? "U" : (POENG.straffeseierTellerSomSeier ? "T" : "U"));
    } else utfall = "U";
  } else {
    const mine = erHjemme ? h : a;
    utfall = mine > (erHjemme ? a : h) ? "V" : "T";
  }
  return { h, a, suffiks, utfall };
}

function statsLinje(k, lag) {
  if (!k.stats) return "";
  const side = k.home === lag ? k.stats.home : k.stats.away;
  if (!side) return "";
  const deler = [];
  if (side.gule != null) deler.push(`🟨 ${side.gule}`);
  if (side.rode != null) deler.push(`🟥 ${side.rode}`);
  if (side.hjorne != null) deler.push(`⛳ ${side.hjorne} hjørner`);
  if (side.straffer != null) deler.push(`🎯 ${side.straffer} straffer`);
  if (side.selvmal != null) deler.push(`😬 ${side.selvmal} selvmål`);
  return deler.length ? `<span class="d-stats-line">${deler.join(" · ")}</span>` : "";
}

let gjeldendeDeltaker = null;
let gjeldendeSammenligning = "";

function visDeltaker(navn, sammenlignMed = "") {
  const d = DELTAKERE.find((x) => x.navn === navn);
  if (!d) return;
  gjeldendeDeltaker = navn;
  gjeldendeSammenligning = sammenlignMed;
  const stats = statsForLag(d.lag);
  const ute = erSlaattUt(d.lag);
  const kamper = kamperForLag(d.lag);
  const spilte = kamper.filter((k) => k.resultat);
  const kommende = kamper.filter((k) => !k.resultat);

  const utfallKlasse = { V: "res-v", U: "res-u", T: "res-t" };
  const utfallNavn = { V: "Seier", U: "Uavgjort", T: "Tap" };

  const spilteHtml = spilte.length ? spilte.map((k) => {
    const r = resultatTekst(k, d.lag);
    return `
      <div class="d-match">
        <span class="d-badge">${k.etikett}</span>
        <span class="d-teams">${k.home} ${flagg(k.home)} <strong class="d-score">${r.h} – ${r.a}${r.suffiks}</strong> ${flagg(k.away)} ${k.away}${statsLinje(k, d.lag)}</span>
        <span class="d-result ${utfallKlasse[r.utfall]}">${utfallNavn[r.utfall]}</span>
      </div>`;
  }).join("") : `<p class="d-empty">Ingen kamper spilt ennå.</p>`;

  const kommendeHtml = kommende.length ? kommende.map((k) => `
      <div class="d-match">
        <span class="d-badge">${k.etikett}</span>
        <span class="d-teams">${k.home} ${flagg(k.home)} <span class="d-vs">vs</span> ${flagg(k.away)} ${k.away}</span>
        <span class="d-time">${norskTid(k.utc)}</span>
      </div>`).join("")
    : `<p class="d-empty">${ute ? "Laget er slått ut av VM." : "Ingen flere kamper planlagt ennå – sluttspillkamper dukker opp her når lagene er klare."}</p>`;

  document.getElementById("deltakerDetalj").innerHTML = `
    <div class="d-header">
      <span class="d-flag">${flagg(d.lag, true)}</span>
      <div>
        <h2>${d.navn} <span class="s-country">(${d.lag})</span></h2>
        <p class="d-substats">${stats.poeng} poeng · ${stats.spilt} kamper · ${stats.seire}S ${stats.uavgjort}U ${stats.tap}T · ⚽ ${stats.maal} mål${ute ? " · 😢 Slått ut" : ""}</p>
      </div>
    </div>
    <h3 class="d-section">📈 Plassering dag for dag</h3>
    <div class="trend-card">${tegnTrendGraf(navn, sammenlignMed)}</div>
    <h3 class="d-section">✅ Spilte kamper</h3>
    <div class="d-list">${spilteHtml}</div>
    <h3 class="d-section">📅 Kommende kamper <span class="section-hint">(norsk tid)</span></h3>
    <div class="d-list">${kommendeHtml}</div>`;

  document.getElementById("sammenlignVelger").addEventListener("change", (e) => {
    visDeltaker(navn, e.target.value);
  });

  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-deltaker").classList.add("active");
  if (!sammenlignMed) window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("backBtn").addEventListener("click", () => {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-scoreboard").classList.add("active");
});

/* ---------- Gruppespill ---------- */
function gruppetabell(gruppe) {
  const lag = GRUPPER[gruppe].map((navn) => ({
    navn, spilt: 0, poeng: 0, plussminus: 0, scoret: 0,
  }));
  const byNavn = Object.fromEntries(lag.map((l) => [l.navn, l]));
  for (const k of KAMPER) {
    if (k.gruppe !== gruppe || !k.resultat) continue;
    const [h, a] = k.resultat;
    const hjem = byNavn[k.home], borte = byNavn[k.away];
    hjem.spilt++; borte.spilt++;
    hjem.scoret += h; borte.scoret += a;
    hjem.plussminus += h - a; borte.plussminus += a - h;
    if (h > a) hjem.poeng += 3;
    else if (a > h) borte.poeng += 3;
    else { hjem.poeng++; borte.poeng++; }
  }
  return lag.sort((x, y) =>
    y.poeng - x.poeng || y.plussminus - x.plussminus || y.scoret - x.scoret ||
    x.navn.localeCompare(y.navn, "nb")
  );
}

function byggGrupper() {
  const valgteLag = new Set(DELTAKERE.map((d) => d.lag));
  const el = document.getElementById("groups");
  el.innerHTML = Object.keys(GRUPPER).map((g, gi) => {
    const tabell = gruppetabell(g);
    const kamper = KAMPER.filter((k) => k.gruppe === g)
      .sort((a, b) => new Date(a.utc) - new Date(b.utc));

    const rader = tabell.map((l, i) => `
      <tr class="${i < 2 ? "qual-direct" : ""}">
        <td class="num">${i + 1}</td>
        <td><span class="team-cell ${valgteLag.has(l.navn) ? "picked" : ""}">${flagg(l.navn)} ${l.navn}</span></td>
        <td class="num">${l.spilt}</td>
        <td class="num">${l.plussminus > 0 ? "+" : ""}${l.plussminus}</td>
        <td class="num pts">${l.poeng}</td>
      </tr>`).join("");

    const kampHtml = kamper.map((k) => {
      const spilt = !!k.resultat;
      const [h, a] = k.resultat || [];
      const hjemVinner = spilt && h > a, borteVinner = spilt && a > h;
      const midt = spilt
        ? `<span class="m-score">${h} – ${a}</span>`
        : `<span class="m-time">${norskTid(k.utc)}</span>`;
      return `
        <div class="match ${spilt ? "played" : ""}">
          <span class="m-home ${hjemVinner ? "winner" : ""}">${k.home} ${flagg(k.home)}</span>
          <span class="m-mid">${midt}</span>
          <span class="m-away ${borteVinner ? "winner" : ""}">${flagg(k.away)} ${k.away}</span>
        </div>`;
    }).join("");

    return `
      <div class="group-card" style="animation-delay:${gi * 0.05}s">
        <h3><span class="group-letter">${g}</span> Gruppe ${g}</h3>
        <table class="standings">
          <thead><tr><th class="num">#</th><th>Lag</th><th class="num">K</th><th class="num">+/−</th><th class="num">P</th></tr></thead>
          <tbody>${rader}</tbody>
        </table>
        <div class="match-list">${kampHtml}</div>
      </div>`;
  }).join("");
}

/* ---------- Kronologisk visning ---------- */
function byggKronologisk() {
  const alle = [
    ...KAMPER.map((k) => ({ ...k, etikett: `Gruppe ${k.gruppe}` })),
    ...SLUTTSPILL.map((k) => ({
      ...k,
      home: k.homeTeam,
      away: k.awayTeam,
      homeTekst: k.homeTeam || slotTekst(k.homeSlot),
      awayTekst: k.awayTeam || slotTekst(k.awaySlot),
      etikett: RUNDE_KORT[k.runde],
    })),
  ].sort((a, b) => new Date(a.utc) - new Date(b.utc));

  let html = "", forrigeDag = "";
  for (const k of alle) {
    const dag = norskDag(k.utc);
    if (dag !== forrigeDag) {
      html += `<h3 class="chrono-day">${dag}</h3>`;
      forrigeDag = dag;
    }
    const hjemme = k.homeTekst || k.home;
    const borte = k.awayTekst || k.away;
    const hjemmeFlagg = k.home ? flagg(k.home) : "";
    const borteFlagg = k.away ? flagg(k.away) : "";
    const spilt = !!k.resultat && (!k.homeSlot || (k.homeTeam && k.awayTeam));
    let midt;
    if (spilt) {
      const [h, a] = sluttScore(k);
      let suffiks = k.ekstraomganger ? " e.e.o." : "";
      if (k.resultat && sluttScore(k)[0] === sluttScore(k)[1] && k.penaltyWinner) suffiks = " e.str.";
      midt = `<span class="m-score">${h} – ${a}${suffiks}</span>`;
    } else {
      midt = `<span class="m-time">kl. ${fmtKlokke.format(new Date(k.utc))}</span>`;
    }
    html += `
      <div class="match chrono-match ${spilt ? "played" : ""}">
        <span class="m-home">${hjemme} ${hjemmeFlagg}</span>
        <span class="m-mid">${midt}</span>
        <span class="m-away">${borteFlagg} ${borte}</span>
        <span class="chrono-badge">${k.etikett}</span>
      </div>`;
  }
  document.getElementById("chrono").innerHTML = html;
}

/* ---------- Sluttspill / bracket ---------- */
function bkLagHtml(team, slot, motstanderMaal, mineMaal, vantStraffer, tapteStraffer) {
  if (!team) {
    return `<div class="bk-team tbd"><span class="bk-name">${slotTekst(slot)}</span></div>`;
  }
  let klasse = "";
  const maal = mineMaal != null ? mineMaal : "";
  if (mineMaal != null && motstanderMaal != null) {
    if (mineMaal > motstanderMaal || vantStraffer) klasse = "bk-winner";
    else if (mineMaal < motstanderMaal || tapteStraffer) klasse = "bk-loser";
  }
  return `
    <div class="bk-team ${klasse}">
      <span class="bk-name">${flagg(team)} ${team}</span>
      <span class="bk-goals">${maal}${vantStraffer ? " (e.str.)" : ""}</span>
    </div>`;
}

function slotTekst(slot) {
  if (/^1[A-L]$/.test(slot)) return `Vinner gruppe ${slot[1]}`;
  if (/^2[A-L]$/.test(slot)) return `Toer gruppe ${slot[1]}`;
  if (/^3/.test(slot)) return `Treer ${slot.slice(1).split("").join("/")}`;
  if (/^W\d+$/.test(slot)) return `Vinner kamp ${slot.slice(1)}`;
  if (/^T\d+$/.test(slot)) return `Taper kamp ${slot.slice(1)}`;
  return slot;
}

function bkKampHtml(k, ekstraKlasse = "") {
  const spilt = !!k.resultat;
  const [h, a] = spilt ? sluttScore(k) : [null, null];
  const eeo = spilt && k.ekstraomganger ? `<span class="bk-eeo">e.e.o.</span>` : "";
  return `
    <div class="bk-match ${ekstraKlasse}">
      ${bkLagHtml(k.homeTeam, k.homeSlot, a, h, spilt && h === a && k.penaltyWinner === "home", spilt && h === a && k.penaltyWinner === "away")}
      ${bkLagHtml(k.awayTeam, k.awaySlot, h, a, spilt && h === a && k.penaltyWinner === "away", spilt && h === a && k.penaltyWinner === "home")}
      <div class="bk-meta">${norskTid(k.utc)} ${eeo}</div>
    </div>`;
}

// Visuell rekkefølge slik at kampene ligger ved siden av kampen de mater inn i
const BRACKET_REKKEFOLGE = {
  R32: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
  R16: [89, 90, 93, 94, 91, 92, 95, 96],
  QF: [97, 98, 99, 100],
  SF: [101, 102],
};

function byggSluttspill() {
  const runder = ["R32", "R16", "QF", "SF"];
  const bracket = document.getElementById("bracket");
  bracket.innerHTML = runder.map((r) => {
    const rekkefolge = BRACKET_REKKEFOLGE[r];
    const kamper = SLUTTSPILL.filter((k) => k.runde === r)
      .sort((a, b) => rekkefolge.indexOf(a.id) - rekkefolge.indexOf(b.id));
    return `
      <div class="round">
        <div class="round-title">${RUNDE_NAVN[r]}</div>
        <div class="round-matches">${kamper.map((k) => bkKampHtml(k)).join("")}</div>
      </div>`;
  }).join("");

  const finale = SLUTTSPILL.find((k) => k.runde === "FINALE");
  const bronse = SLUTTSPILL.find((k) => k.runde === "BRONSE");
  document.getElementById("finaleRow").innerHTML = `
    <div>
      <div class="finale-label">🏆 ${RUNDE_NAVN.FINALE}</div>
      ${bkKampHtml(finale, "final-match")}
    </div>
    <div>
      <div class="finale-label">🥉 ${RUNDE_NAVN.BRONSE}</div>
      ${bkKampHtml(bronse)}
    </div>`;
}

/* ---------- Faner og visningsmodus ---------- */
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`view-${tab.dataset.view}`).classList.add("active");
  });
});

document.querySelectorAll(".toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("mode-grupper").hidden = btn.dataset.mode !== "grupper";
    document.getElementById("mode-kronologisk").hidden = btn.dataset.mode !== "kronologisk";
  });
});

/* ---------- Init ---------- */
function byggAlt() {
  byggScoreboard();
  byggGrupper();
  byggKronologisk();
  byggSluttspill();
}

// Henter deltakere og resultater fra serveren (data.json). Faller tilbake til
// innholdet i data.js hvis siden kjører uten server (åpnet som fil).
async function lastData() {
  try {
    const res = await fetch("api/data", { cache: "no-store" });
    if (res.ok) {
      const lagret = await res.json();
      if (Array.isArray(lagret.deltakere)) {
        DELTAKERE.length = 0;
        DELTAKERE.push(...lagret.deltakere);
      }
      if (lagret.resultater) {
        for (const k of KAMPER) {
          const o = lagret.resultater[k.id] || {};
          k.resultat = o.resultat ?? null;
          k.stats = o.stats ?? null;
        }
        for (const k of SLUTTSPILL) {
          const o = lagret.resultater[k.id] || {};
          k.homeTeam = o.homeTeam ?? null;
          k.awayTeam = o.awayTeam ?? null;
          k.resultat = o.resultat ?? null;
          k.ekstraomganger = o.ekstraomganger ?? null;
          k.penaltyWinner = o.penaltyWinner ?? null;
          k.stats = o.stats ?? null;
        }
      }
    }
  } catch (e) {
    // Ingen server – bruk data.js som den er
  }
  byggAlt();
}

lastData();
