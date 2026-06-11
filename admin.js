/* ====== VITEC PLANIA VM 2026 – administrasjon ======
   Krever at siden kjøres via server.py (innlogging og lagring skjer der). */

let adminToken = sessionStorage.getItem("vmAdminToken");

const adminLink = document.getElementById("adminLink");
const loginForm = document.getElementById("loginForm");
const loginFeil = document.getElementById("loginFeil");

adminLink.addEventListener("click", () => {
  if (adminToken) {
    visAdmin();
  } else {
    loginForm.hidden = !loginForm.hidden;
    if (!loginForm.hidden) document.getElementById("loginUser").focus();
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginFeil.textContent = "";
  try {
    const res = await fetch("api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("loginUser").value,
        password: document.getElementById("loginPass").value,
      }),
    });
    if (!res.ok) {
      loginFeil.textContent = "Feil brukernavn eller passord";
      return;
    }
    adminToken = (await res.json()).token;
    sessionStorage.setItem("vmAdminToken", adminToken);
    loginForm.hidden = true;
    document.getElementById("loginPass").value = "";
    visAdmin();
  } catch (err) {
    loginFeil.textContent = "Får ikke kontakt med serveren (kjører server.py?)";
  }
});

document.getElementById("loggUtBtn").addEventListener("click", () => {
  adminToken = null;
  sessionStorage.removeItem("vmAdminToken");
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-scoreboard").classList.add("active");
});

function visAdmin() {
  byggAdmin();
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-admin").classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Bygg admin-skjemaene ---------- */
function lagValg(valgt) {
  const alle = Object.keys(TEAMS).sort((a, b) => a.localeCompare(b, "nb"));
  return `<option value="">– velg lag –</option>` + alle.map((l) =>
    `<option value="${l}" ${l === valgt ? "selected" : ""}>${l}</option>`).join("");
}

function deltakerRad(d = { navn: "", lag: "" }) {
  return `
    <div class="admin-row ad-deltaker">
      <input type="text" class="ad-navn" placeholder="Navn" value="${d.navn.replace(/"/g, "&quot;")}">
      <select class="ad-lag">${lagValg(d.lag)}</select>
      <button type="button" class="del-btn" title="Fjern deltaker">🗑️</button>
    </div>`;
}

const STAT_FELT = [
  ["gule", "Gule kort"], ["rode", "Røde kort"], ["hjorne", "Hjørnespark"],
  ["straffer", "Straffespark (ord. tid)"], ["selvmal", "Selvmål"],
];

function statsDetaljer(k) {
  const s = k.stats || {};
  const kolonne = (side, navn) => `
    <div class="st-col">
      <strong>${navn || (side === "home" ? "Hjemmelag" : "Bortelag")}</strong>
      ${STAT_FELT.map(([key, label]) => {
        const v = s[side] && s[side][key] != null ? s[side][key] : "";
        return `<label>${label}<input type="number" min="0" class="st-${side}-${key}" value="${v}"></label>`;
      }).join("")}
    </div>`;
  const harStats = s.home || s.away;
  return `
    <details class="stats-details" ${harStats ? "open" : ""}>
      <summary>📊 Kampstatistikk</summary>
      <div class="st-grid">${kolonne("home", k.home || (k.homeTeam ?? null))}${kolonne("away", k.away || (k.awayTeam ?? null))}</div>
    </details>`;
}

function byggAdmin() {
  // Deltakere
  const delEl = document.getElementById("adminDeltakere");
  delEl.innerHTML = DELTAKERE.map((d) => deltakerRad(d)).join("");

  // Gruppespill (kronologisk)
  const gruppeEl = document.getElementById("adminGruppespill");
  gruppeEl.innerHTML = [...KAMPER]
    .sort((a, b) => new Date(a.utc) - new Date(b.utc))
    .map((k) => {
      const [h, a] = k.resultat || ["", ""];
      return `
        <div class="admin-row ad-kamp" data-id="${k.id}">
          <span class="am-label"><span class="d-badge">Gruppe ${k.gruppe}</span> ${norskTid(k.utc)}</span>
          <span class="am-teams">${k.home} ${flagg(k.home)}</span>
          <span class="am-inputs">
            <input type="number" min="0" class="am-h" value="${h}"> – <input type="number" min="0" class="am-a" value="${a}">
          </span>
          <span class="am-teams am-away">${flagg(k.away)} ${k.away}</span>
          ${statsDetaljer(k)}
        </div>`;
    }).join("");

  // Sluttspill (kronologisk)
  const sluttEl = document.getElementById("adminSluttspill");
  sluttEl.innerHTML = [...SLUTTSPILL]
    .sort((a, b) => new Date(a.utc) - new Date(b.utc))
    .map((k) => {
      const [h, a] = k.resultat || ["", ""];
      const [eh, ea] = k.ekstraomganger || ["", ""];
      return `
        <div class="admin-row ad-slutt" data-id="${k.id}">
          <span class="am-label">
            <span class="d-badge">${RUNDE_KORT[k.runde]}</span> ${norskTid(k.utc)}
            <span class="am-slots">${slotTekst(k.homeSlot)} vs ${slotTekst(k.awaySlot)}</span>
          </span>
          <div class="as-grid">
            <label>Hjemmelag <select class="as-home">${lagValg(k.homeTeam)}</select></label>
            <label>Bortelag <select class="as-away">${lagValg(k.awayTeam)}</select></label>
            <label>Fulltid <span class="am-inputs">
              <input type="number" min="0" class="as-h" value="${h}"> – <input type="number" min="0" class="as-a" value="${a}">
            </span></label>
            <label>Etter ekstraomganger <span class="am-inputs">
              <input type="number" min="0" class="as-eh" value="${eh}"> – <input type="number" min="0" class="as-ea" value="${ea}">
            </span></label>
            <label>Videre etter straffer
              <select class="as-pen">
                <option value="" ${!k.penaltyWinner ? "selected" : ""}>– ingen straffekonkurranse –</option>
                <option value="home" ${k.penaltyWinner === "home" ? "selected" : ""}>Hjemmelaget</option>
                <option value="away" ${k.penaltyWinner === "away" ? "selected" : ""}>Bortelaget</option>
              </select>
            </label>
          </div>
          ${statsDetaljer(k)}
        </div>`;
    }).join("");
}

document.getElementById("leggTilDeltaker").addEventListener("click", () => {
  document.getElementById("adminDeltakere").insertAdjacentHTML("beforeend", deltakerRad());
});

document.getElementById("adminDeltakere").addEventListener("click", (e) => {
  if (e.target.classList.contains("del-btn")) e.target.closest(".admin-row").remove();
});

/* ---------- Lagring ---------- */
function lesPar(el, hSel, aSel) {
  const h = el.querySelector(hSel).value.trim();
  const a = el.querySelector(aSel).value.trim();
  if (h === "" || a === "") return null;
  return [Number(h), Number(a)];
}

function visStatus(tekst, ok) {
  const el = document.getElementById("lagreStatus");
  el.hidden = false;
  el.textContent = tekst;
  el.className = `lagre-status ${ok ? "status-ok" : "status-feil"}`;
  if (ok) setTimeout(() => { el.hidden = true; }, 4000);
}

function lesStats(rad) {
  const lesSide = (side) => {
    const o = {};
    let harData = false;
    for (const [key] of STAT_FELT) {
      const felt = rad.querySelector(`.st-${side}-${key}`);
      const v = felt ? felt.value.trim() : "";
      o[key] = v === "" ? null : Number(v);
      if (v !== "") harData = true;
    }
    return harData ? o : null;
  };
  const home = lesSide("home"), away = lesSide("away");
  if (!home && !away) return null;
  const tom = Object.fromEntries(STAT_FELT.map(([key]) => [key, null]));
  return { home: home || tom, away: away || { ...tom } };
}

async function lagreAlt() {
  // Deltakere
  const deltakere = [];
  for (const rad of document.querySelectorAll("#adminDeltakere .ad-deltaker")) {
    const navn = rad.querySelector(".ad-navn").value.trim();
    const lag = rad.querySelector(".ad-lag").value;
    if (!navn && !lag) continue;
    if (!navn || !lag) {
      visStatus("Alle deltakere må ha både navn og lag.", false);
      return false;
    }
    deltakere.push({ navn, lag });
  }

  // Resultater
  const resultater = {};
  for (const rad of document.querySelectorAll("#adminGruppespill .ad-kamp")) {
    resultater[rad.dataset.id] = {
      resultat: lesPar(rad, ".am-h", ".am-a"),
      stats: lesStats(rad),
    };
  }
  for (const rad of document.querySelectorAll("#adminSluttspill .ad-slutt")) {
    const pen = rad.querySelector(".as-pen").value;
    resultater[rad.dataset.id] = {
      homeTeam: rad.querySelector(".as-home").value || null,
      awayTeam: rad.querySelector(".as-away").value || null,
      resultat: lesPar(rad, ".as-h", ".as-a"),
      ekstraomganger: lesPar(rad, ".as-eh", ".as-ea"),
      penaltyWinner: pen || null,
      stats: lesStats(rad),
    };
  }

  try {
    const res = await fetch("api/data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ deltakere, resultater, odds: ODDS, oddsMeta: ODDS_META }),
    });
    if (res.status === 401) {
      adminToken = null;
      sessionStorage.removeItem("vmAdminToken");
      visStatus("Innloggingen er utløpt – logg inn på nytt.", false);
      return false;
    }
    if (!res.ok) {
      visStatus("Lagring feilet – prøv igjen.", false);
      return false;
    }
    await lastData();
    visStatus("Lagret! Scoreboardet er oppdatert. ✔", true);
    return true;
  } catch (err) {
    visStatus("Får ikke kontakt med serveren.", false);
    return false;
  }
}

document.getElementById("lagreBtn").addEventListener("click", lagreAlt);

/* ---------- AI-oppdatering (Claude Sonnet med websøk) ---------- */
let aiForslag = null;
let aiOdds = null;

function aiKandidater() {
  // Kun nye, ferdigspilte kamper som ennå IKKE er registrert (mangler resultat).
  // Kamper som allerede har et resultat rører ikke AI-en – der retter admin manuelt.
  const naa = Date.now();
  const ferdig = (utc) => new Date(utc).getTime() + 2.5 * 3600 * 1000 < naa;
  const kandidater = [];
  for (const k of KAMPER) {
    if (!ferdig(k.utc)) continue;
    if (k.resultat) continue;
    kandidater.push({ id: k.id, stage: `Gruppe ${k.gruppe}`, home: k.home, away: k.away, utc: k.utc, teamsKnown: true });
  }
  for (const k of SLUTTSPILL) {
    if (!ferdig(k.utc)) continue;
    if (k.resultat) continue;
    kandidater.push({
      id: k.id,
      stage: RUNDE_KORT[k.runde],
      home: k.homeTeam || `UNKNOWN (${slotTekst(k.homeSlot)})`,
      away: k.awayTeam || `UNKNOWN (${slotTekst(k.awaySlot)})`,
      utc: k.utc,
      teamsKnown: !!(k.homeTeam && k.awayTeam),
    });
  }
  return kandidater;
}

function finnKamp(id) {
  return KAMPER.find((k) => k.id === id) || SLUTTSPILL.find((k) => k.id === id);
}

function statsTekst(stats) {
  if (!stats) return "";
  const side = (s) => s ? `🟨${s.gule ?? "?"} 🟥${s.rode ?? "?"} ⛳${s.hjorne ?? "?"} 🎯${s.straffer ?? "?"} 😬${s.selvmal ?? "?"}` : "–";
  return `<span class="ai-stats">Statistikk (H/B): ${side(stats.home)} &nbsp;|&nbsp; ${side(stats.away)}</span>`;
}

function oddsForslagHtml(oddsFunnet) {
  if (!oddsFunnet.length) return "";
  const kilde = oddsFunnet.find((o) => o.kilde)?.kilde || "";
  const rader = oddsFunnet
    .slice()
    .sort((a, b) => a.desimal - b.desimal)
    .map((o) => {
      const naa = ODDS[o.lag];
      const naaTekst = naa != null && !isNaN(Number(naa))
        ? Number(naa).toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "–";
      const ny = Number(o.desimal).toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `<tr><td>${flagg(o.lag)} ${o.lag}</td><td class="ao-old">${naaTekst}</td><td class="ao-arrow">→</td><td class="ao-new">${ny}</td></tr>`;
    }).join("");
  return `
    <div class="ai-odds">
      <label class="ai-row ai-odds-head">
        <input type="checkbox" id="aiOddsGodkjenn" checked>
        <span class="ai-info">
          <span class="ai-kamp">🏆 Oppdater VM-vinnerodds (${oddsFunnet.length} lag)</span>
          <span class="ai-meta">${kilde ? `Kilde: ${kilde}` : ""}</span>
        </span>
      </label>
      <table class="ai-odds-tabell"><tbody>${rader}</tbody></table>
    </div>`;
}

function visAiForslag(forslagListe, oddsListe = []) {
  const panel = document.getElementById("aiPanel");
  const funnet = forslagListe.filter((f) => f.funnet && f.resultat);
  const ikkeFunnet = forslagListe.filter((f) => !f.funnet || !f.resultat);
  const oddsFunnet = oddsListe.filter((o) => o.funnet && o.desimal != null);
  aiForslag = funnet;
  aiOdds = oddsFunnet;

  if (!funnet.length && !oddsFunnet.length) {
    panel.hidden = false;
    panel.innerHTML = `<p class="d-empty">AI-en fant ingen pålitelige resultater eller odds
      (${ikkeFunnet.length} kamper undersøkt). Prøv igjen senere.</p>`;
    return;
  }

  const rader = funnet.map((f) => {
    const k = finnKamp(f.id);
    const hjemme = f.homeTeam || k.home || k.homeTeam || "?";
    const borte = f.awayTeam || k.away || k.awayTeam || "?";
    const detaljer = [];
    detaljer.push(`Fulltid: <strong>${f.resultat[0]} – ${f.resultat[1]}</strong>`);
    if (f.ekstraomganger) detaljer.push(`Etter e.o.: <strong>${f.ekstraomganger[0]} – ${f.ekstraomganger[1]}</strong>`);
    if (f.penaltyWinner) detaljer.push(`Straffer: <strong>${f.penaltyWinner === "home" ? hjemme : borte} videre</strong>`);
    if (f.homeTeam || f.awayTeam) detaljer.push(`Lag: <strong>${hjemme} – ${borte}</strong>`);
    const naavaerende = k.resultat ? `Nåværende i databasen: ${k.resultat[0]} – ${k.resultat[1]}` : "Ikke registrert ennå";
    return `
      <label class="ai-row">
        <input type="checkbox" class="ai-godkjenn" data-id="${f.id}" checked>
        <span class="ai-info">
          <span class="ai-kamp"><span class="d-badge">${k.gruppe ? `Gruppe ${k.gruppe}` : RUNDE_KORT[k.runde]}</span> ${hjemme} – ${borte}</span>
          <span class="ai-detaljer">${detaljer.join(" · ")}</span>
          ${statsTekst(f.stats)}
          <span class="ai-meta">${naavaerende}${f.kilde ? ` · Kilde: ${f.kilde}` : ""}</span>
        </span>
      </label>`;
  }).join("");

  panel.hidden = false;
  panel.innerHTML = `
    <h3 class="d-section">🤖 Forslag fra AI – velg hva som skal inn i databasen</h3>
    ${funnet.length ? rader : `<p class="ai-meta">Ingen nye kampresultater å foreslå.</p>`}
    ${ikkeFunnet.length ? `<p class="ai-meta">${ikkeFunnet.length} kamper ble undersøkt uten at det ble funnet et pålitelig resultat.</p>` : ""}
    ${oddsForslagHtml(oddsFunnet)}
    <div class="ai-knapper">
      <button id="aiGodkjennBtn" class="save-btn">✅ Godkjenn valgte og lagre</button>
      <button id="aiAvvisBtn" class="back-btn">Avvis alle</button>
    </div>`;

  document.getElementById("aiAvvisBtn").addEventListener("click", () => {
    panel.hidden = true;
    panel.innerHTML = "";
    aiForslag = null;
    aiOdds = null;
  });

  document.getElementById("aiGodkjennBtn").addEventListener("click", async () => {
    const valgte = new Set(
      [...panel.querySelectorAll(".ai-godkjenn:checked")].map((el) => Number(el.dataset.id))
    );
    for (const f of aiForslag) {
      if (!valgte.has(f.id)) continue;
      const k = finnKamp(f.id);
      if (!k) continue;
      k.resultat = f.resultat;
      if (k.homeSlot) { // sluttspillkamp
        k.ekstraomganger = f.ekstraomganger ?? null;
        k.penaltyWinner = f.penaltyWinner ?? null;
        if (f.homeTeam) k.homeTeam = f.homeTeam;
        if (f.awayTeam) k.awayTeam = f.awayTeam;
      }
      if (f.stats) k.stats = f.stats;
    }

    // VM-odds (oppdateres samlet hvis avkrysset)
    const oddsBoks = document.getElementById("aiOddsGodkjenn");
    if (oddsBoks && oddsBoks.checked && aiOdds && aiOdds.length) {
      for (const o of aiOdds) ODDS[o.lag] = o.desimal;
      ODDS_META = {
        kilde: aiOdds.find((o) => o.kilde)?.kilde || ODDS_META.kilde || "",
        oppdatert: new Date().toISOString(),
      };
    }

    byggAdmin(); // skjemaet viser de godkjente verdiene
    const ok = await lagreAlt(); // ...og databasen oppdateres fra skjemaet
    if (ok) {
      panel.hidden = true;
      panel.innerHTML = "";
      aiForslag = null;
      aiOdds = null;
    }
  });
}

document.getElementById("aiBtn").addEventListener("click", async () => {
  const knapp = document.getElementById("aiBtn");
  const kandidater = aiKandidater();
  // Deltakernes lag – AI henter oppdaterte VM-vinnerodds for disse hver gang.
  const lag = [...new Set(
    [...document.querySelectorAll("#adminDeltakere .ad-deltaker")]
      .map((rad) => rad.querySelector(".ad-lag").value)
      .filter(Boolean)
  )];
  if (!kandidater.length && !lag.length) {
    visStatus("Ingen spilte kamper mangler data, og ingen lag å hente odds for. 👍", true);
    return;
  }
  knapp.disabled = true;
  knapp.textContent = "🤖 AI søker… (kan ta et par minutter)";
  try {
    const res = await fetch("api/ai/forslag", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ kamper: kandidater, lag }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      adminToken = null;
      sessionStorage.removeItem("vmAdminToken");
      visStatus("Innloggingen er utløpt – logg inn på nytt.", false);
      return;
    }
    if (!res.ok) {
      visStatus(data.error || "AI-forespørselen feilet.", false);
      return;
    }
    visAiForslag(data.kamper || [], data.odds || []);
  } catch (err) {
    visStatus("Får ikke kontakt med serveren.", false);
  } finally {
    knapp.disabled = false;
    knapp.textContent = "🤖 Hent resultater med AI";
  }
});
