"""
Vitec Plania VM 2026 - enkel webserver med admin-API.

Start:  python server.py  (standard port 8123, valgfritt: python server.py 8080)

- Serverer de statiske filene (index.html m.m.)
- Brukernavn/passord ligger i config.json (opprettes med sysop/sysop hvis den mangler)
- AI-oppdatering av resultater krever en Anthropic API-nøkkel i config.json
  ("anthropic_api_key") eller i miljøvariabelen ANTHROPIC_API_KEY
- Deltakere og resultater lagres i data.json via API-et:
    POST /api/login       {"username": "...", "password": "..."}  -> {"token": "..."}
    GET  /api/data                                                 -> innholdet i data.json
    POST /api/data        (Authorization: Bearer <token>)          -> lagrer ny data.json
    POST /api/ai/forslag  (Authorization: Bearer <token>)          -> AI henter resultater
"""
import json
import os
import secrets
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
# I Docker settes VM2026_DATA_DIR=/data slik at config.json og data.json
# ligger på et volum og overlever oppdateringer. Lokalt brukes prosjektmappa.
DATA_DIR = os.environ.get("VM2026_DATA_DIR", ROOT)
CONFIG_FIL = os.path.join(DATA_DIR, "config.json")
DATA_FIL = os.path.join(DATA_DIR, "data.json")
TOKEN_LEVETID = 8 * 3600  # 8 timer

tokens = {}  # token -> utløpstidspunkt


def les_config():
    if not os.path.exists(CONFIG_FIL):
        with open(CONFIG_FIL, "w", encoding="utf-8") as f:
            json.dump(
                {"username": "sysop", "password": "sysop", "anthropic_api_key": ""},
                f, indent=2,
            )
        print("Opprettet config.json med standard brukernavn/passord (sysop/sysop)")
    with open(CONFIG_FIL, encoding="utf-8") as f:
        return json.load(f)


# ---------- AI-oppdatering av resultater ----------
AI_MODELL = "claude-sonnet-4-6"

# Fast kilde for VM-vinnerodds gjennom hele turneringen.
ODDS_KILDE = "Oddschecker (oddschecker.com)"

AI_SCHEMA = {
    "type": "object",
    "properties": {
        "kamper": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "funnet": {"type": "boolean"},
                    "resultat": {
                        "anyOf": [{"type": "array", "items": {"type": "integer"}}, {"type": "null"}]
                    },
                    "ekstraomganger": {
                        "anyOf": [{"type": "array", "items": {"type": "integer"}}, {"type": "null"}]
                    },
                    "penaltyWinner": {
                        "anyOf": [{"type": "string", "enum": ["home", "away"]}, {"type": "null"}]
                    },
                    "homeTeam": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                    "awayTeam": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                    "stats": {
                        "anyOf": [
                            {
                                "type": "object",
                                "properties": {
                                    "home": {"$ref": "#/$defs/lagstat"},
                                    "away": {"$ref": "#/$defs/lagstat"},
                                },
                                "required": ["home", "away"],
                                "additionalProperties": False,
                            },
                            {"type": "null"},
                        ]
                    },
                    "kilde": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                },
                "required": ["id", "funnet", "resultat", "ekstraomganger",
                             "penaltyWinner", "homeTeam", "awayTeam", "stats", "kilde"],
                "additionalProperties": False,
            },
        },
        "odds": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "lag": {"type": "string"},
                    "funnet": {"type": "boolean"},
                    "desimal": {"anyOf": [{"type": "number"}, {"type": "null"}]},
                    "kilde": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                },
                "required": ["lag", "funnet", "desimal", "kilde"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["kamper", "odds"],
    "additionalProperties": False,
    "$defs": {
        "lagstat": {
            "type": "object",
            "properties": {
                "gule": {"anyOf": [{"type": "integer"}, {"type": "null"}]},
                "rode": {"anyOf": [{"type": "integer"}, {"type": "null"}]},
                "hjorne": {"anyOf": [{"type": "integer"}, {"type": "null"}]},
                "straffer": {"anyOf": [{"type": "integer"}, {"type": "null"}]},
                "selvmal": {"anyOf": [{"type": "integer"}, {"type": "null"}]},
            },
            "required": ["gule", "rode", "hjorne", "straffer", "selvmal"],
            "additionalProperties": False,
        }
    },
}

AI_INSTRUKS = """You are updating a results database for the FIFA World Cup 2026 (USA/Canada/Mexico, June 11 - July 19, 2026).
For each match in the list below, use web search to find reliable information (FIFA.com, major sports outlets) about:

1. "resultat": the score after regulation time (90 minutes), as [home goals, away goals].
2. "ekstraomganger": ONLY for knockout matches that went to extra time - the score after extra time as [home, away]. Otherwise null.
3. "penaltyWinner": "home" or "away" if the match was decided by a penalty shootout, otherwise null.
4. "homeTeam"/"awayTeam": ONLY for knockout matches where the list shows the teams as unknown - the Norwegian team names of the qualified teams (use the exact Norwegian spellings from the list's other matches, e.g. "Tyskland", "Sør-Korea", "Elfenbenskysten"). Otherwise null.
5. "stats": per-team match statistics: "gule" (yellow cards), "rode" (red cards), "hjorne" (corner kicks), "straffer" (penalty kicks awarded during regulation time), "selvmal" (own goals). Use null for any value you cannot verify.

Rules:
- Set "funnet": false (and all other fields null) for matches that have not been played yet or where you cannot find a reliable final result. NEVER guess a result.
- Cross-check the result against at least two sources when possible.
- "kilde": a short note of the main source you used (e.g. "fifa.com").
- Keep team names exactly as given in the list (Norwegian names).

Matches to research:
"""

AI_ODDS_INSTRUKS = (
    "\n\nIn addition to the matches, return the current outright winner odds for the FIFA "
    "World Cup 2026 ('to win the tournament' / outright market) for the teams listed below.\n"
    "- Use {kilde} as the consistent source throughout the tournament (the aggregated best "
    "decimal odds shown there for the outright winner market).\n"
    "- 'desimal': the decimal odds as a number (e.g. 5.5, 12.0, 26.0).\n"
    "- Set 'funnet': false and 'desimal': null for any team where you cannot find a reliable "
    "figure (e.g. teams already eliminated may be removed from the market).\n"
    "- Use the exact Norwegian team names given here. Return one entry per team.\n"
    "Teams for odds:\n"
)


def ai_forslag(kamper, lag, api_key):
    """Spør Claude (med websøk) om resultater + VM-odds. Returnerer dict."""
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    kampliste = json.dumps(kamper, ensure_ascii=False, indent=1)
    odds_del = ""
    if lag:
        odds_del = AI_ODDS_INSTRUKS.format(kilde=ODDS_KILDE) + json.dumps(
            sorted(set(lag)), ensure_ascii=False
        )
    prompt = AI_INSTRUKS + kampliste + odds_del
    messages = [{"role": "user", "content": prompt}]

    while True:
        response = client.messages.create(
            model=AI_MODELL,
            max_tokens=16000,
            thinking={"type": "adaptive"},
            tools=[{"type": "web_search_20260209", "name": "web_search"}],
            output_config={"format": {"type": "json_schema", "schema": AI_SCHEMA}},
            messages=messages,
        )
        if response.stop_reason == "pause_turn":
            # Serverside websøk-løkke trenger flere runder - fortsett der den slapp
            messages = [
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": response.content},
            ]
            continue
        break

    tekst = next((b.text for b in response.content if b.type == "text"), None)
    if not tekst:
        raise RuntimeError(f"Tomt svar fra modellen (stop_reason={response.stop_reason})")
    return json.loads(tekst)


def gyldig_token(header):
    if not header or not header.startswith("Bearer "):
        return False
    token = header[7:]
    utlop = tokens.get(token)
    if not utlop or utlop < time.time():
        tokens.pop(token, None)
        return False
    return True


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _json(self, kode, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(kode)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _les_body(self):
        lengde = int(self.headers.get("Content-Length", 0))
        if lengde <= 0 or lengde > 2_000_000:
            return None
        try:
            return json.loads(self.rfile.read(lengde).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None

    def end_headers(self):
        # Unngå at nettleseren cacher gamle js/css/data-filer
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        sti = self.path.split("?")[0]
        if sti in ("/config.json", "/server.py"):
            self._json(403, {"error": "Ingen tilgang"})
            return
        if sti == "/api/data":
            if os.path.exists(DATA_FIL):
                with open(DATA_FIL, encoding="utf-8") as f:
                    self._json(200, json.load(f))
            else:
                self._json(200, {})
            return
        super().do_GET()

    def do_POST(self):
        sti = self.path.split("?")[0]
        if sti == "/api/login":
            body = self._les_body()
            cfg = les_config()
            if (
                body
                and secrets.compare_digest(str(body.get("username", "")), cfg["username"])
                and secrets.compare_digest(str(body.get("password", "")), cfg["password"])
            ):
                token = secrets.token_urlsafe(32)
                tokens[token] = time.time() + TOKEN_LEVETID
                self._json(200, {"token": token})
            else:
                self._json(401, {"error": "Feil brukernavn eller passord"})
            return

        if sti == "/api/data":
            if not gyldig_token(self.headers.get("Authorization")):
                self._json(401, {"error": "Ikke innlogget"})
                return
            body = self._les_body()
            if body is None or not isinstance(body, dict):
                self._json(400, {"error": "Ugyldig data"})
                return
            with open(DATA_FIL, "w", encoding="utf-8") as f:
                json.dump(body, f, ensure_ascii=False, indent=2)
            self._json(200, {"ok": True})
            return

        if sti == "/api/ai/forslag":
            if not gyldig_token(self.headers.get("Authorization")):
                self._json(401, {"error": "Ikke innlogget"})
                return
            body = self._les_body()
            kamper = (body or {}).get("kamper") or []
            lag = (body or {}).get("lag") or []
            if not isinstance(kamper, list) or not isinstance(lag, list):
                self._json(400, {"error": "Ugyldig forespørsel"})
                return
            if not kamper and not lag:
                self._json(400, {"error": "Ingenting å undersøke"})
                return
            cfg = les_config()
            api_key = cfg.get("anthropic_api_key") or os.environ.get("ANTHROPIC_API_KEY")
            if not api_key:
                self._json(503, {"error": 'Ingen Anthropic API-nøkkel. Legg inn "anthropic_api_key" i config.json på serveren.'})
                return
            try:
                import anthropic  # noqa: F401
            except ImportError:
                self._json(503, {"error": "Python-pakken 'anthropic' mangler på serveren. Kjør: pip install anthropic"})
                return
            try:
                forslag = ai_forslag(kamper[:15], lag[:48], api_key)
                self._json(200, forslag)
            except Exception as e:  # API-feil, nettverk, JSON-parsing
                self._json(502, {"error": f"AI-forespørselen feilet: {e}"})
            return

        self._json(404, {"error": "Ukjent endepunkt"})

    def log_message(self, fmt, *args):
        pass  # stille logg


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    les_config()
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"VM 2026-serveren kjører på http://localhost:{port}")
    server.serve_forever()
