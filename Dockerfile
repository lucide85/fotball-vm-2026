# syntax=docker/dockerfile:1
#
# Vitec Plania VM 2026 – enkel container.
# Appen er ren Python (standardbibliotek) + pakken "anthropic" til AI-funksjonen.
# Ingen byggesteg trengs – vi kopierer bare inn filene og kjører server.py.

FROM python:3.12-slim AS runtime
WORKDIR /app

# Eneste avhengighet: Anthropic-SDK-en (til "Hent resultater med AI")
RUN pip install --no-cache-dir "anthropic>=0.40"

# Statiske filer + server. config.json og data.json ligger IKKE her – de
# bor på et volum under /data slik at de overlever oppdateringer (se compose).
COPY server.py index.html app.js admin.js styles.css data.js ./

# config.json (hemmeligheter) og data.json (deltakere/resultater) leses herfra
ENV VM2026_DATA_DIR=/data
VOLUME ["/data"]

EXPOSE 8123
CMD ["python", "server.py", "8123"]
