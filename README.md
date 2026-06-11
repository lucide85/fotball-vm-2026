# ⚽ Vitec Plania – Fotball-VM 2026

Scoreboard for intern VM-konkurranse: hver deltaker følger ett lag gjennom hele VM.
**Seier = 3 poeng · Uavgjort = 1 poeng** — poengene regnes ut automatisk.

## Kom i gang

```
python server.py          # standard port 8123
python server.py 8080     # valgfri port
```

Åpne deretter `http://localhost:8123`. Serveren bruker kun Pythons standardbibliotek
(unntatt AI-funksjonen, som trenger `pip install anthropic`). (Siden kan også åpnes rett
fra `index.html` uten server, men da er adminpanelet utilgjengelig og reservedataene i
`data.js` brukes.)

`config.json` og `data.json` leses fra mappa serveren ligger i, eller fra `VM2026_DATA_DIR`
hvis den miljøvariabelen er satt (brukes i Docker for å skille data fra koden).

## Kjøre hjemme med Docker + Traefik

For å kjøre dette på en hjemme-VM og rute til det med Traefik (samme oppsett som
10km-appen), se **[`deploy/VM-SETUP.md`](deploy/VM-SETUP.md)**. Kort fortalt:

```bash
mkdir -p data && cp config.example.json data/config.json && nano data/config.json
docker compose up -d --build
```

`data/`-mappa (hemmeligheter + resultater) er `.gitignore`-et og overlever oppdateringer.
Traefik-config ligger i [`deploy/traefik/fotballvm.yml`](deploy/traefik/fotballvm.yml).

## Administrasjon

Klikk på det diskrete ⚙️-ikonet nederst på siden og logg inn.
Brukernavn og passord ligger i **`config.json`** på webserveren
(opprettes automatisk med standardverdiene `sysop`/`sysop` — bytt passord der!).
Serveren nekter å servere `config.json` og `server.py` til nettleseren.

I adminpanelet kan du:

- **Deltakere**: legge til/fjerne deltakere og velge laget deres
- **Gruppespill**: legge inn stilling etter fulltid
- **Sluttspill**: velge lagene når de er klare, legge inn stilling etter fulltid,
  stilling etter eventuelle ekstraomganger, og hvem som gikk videre etter
  eventuell straffekonkurranse

- **Kampstatistikk**: per kamp og lag — gule kort, røde kort, hjørnespark,
  straffespark i ordinær tid og selvmål (under «📊 Kampstatistikk»)
- **🤖 Hent resultater med AI**: Claude (Sonnet) søker på nettet etter resultater
  og statistikk for spilte kamper som mangler data. Alle forslag vises til
  godkjenning — først når du godkjenner, lagres de i databasen.
  Krever en Anthropic API-nøkkel i `config.json` (`"anthropic_api_key"`) eller
  miljøvariabelen `ANTHROPIC_API_KEY`, samt `pip install anthropic` på serveren.

Alt lagres i `data.json` på serveren og vises umiddelbart for alle — alle
poeng, plasseringer og grafer beregnes alltid på nytt fra databasen, også om
den endres i etterkant. Innloggingen varer i 8 timer.

## Scoreboard og deltakersider

- Lik poengsum gir delt plassering, og neste plass hoppes over (1, 2, 3, 3, 5, 6 …).
- Klikk på en deltaker for å se trendgraf med plassering dag for dag
  (1. plass øverst), med mulighet for å sammenligne med en annen deltaker.

## Poengregler (`POENG` i data.js)

- `seier` / `uavgjort`: poeng per utfall (3/1)
- `straffeseierTellerSomSeier`: om seier i straffekonkurranse gir full pott
- `maalIEkstraomganger`: om mål i ekstraomganger telles i målstatistikken
  (straffekonkurranser telles aldri). Endring virker tilbake på alle kamper.

Alle kamptidspunkter er lagret i UTC og vises automatisk i norsk tid.
Kampdata (grupper og tider) er fra det offisielle VM-programmet etter
trekningen i desember 2025.

## Filer

| Fil | Innhold |
|---|---|
| `server.py` | Webserver + innloggings-/lagrings-API |
| `config.json` | Brukernavn/passord (kun på server) |
| `data.json` | Deltakere og resultater (redigeres via adminpanelet) |
| `data.js` | Kampoppsett, lag, poengregler + reservedata |
| `index.html` / `app.js` / `admin.js` / `styles.css` | Selve siden |
