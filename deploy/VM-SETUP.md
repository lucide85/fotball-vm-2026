# Sette opp app-VM (Hyper-V + Ubuntu Server 24.04 + Docker)

Steg-for-steg for å lage en VM, installere Docker, og kjøre Fotball-VM-appen der via
GitHub – og deretter rute til den med Traefik. Samme oppskrift som 10km-appen, men appen
her er ren Python (ingen Node), så det er ingen byggesteg å vente på.

> **Allerede en app-VM hjemme?** Hvis 10km-appen alt kjører på en VM, kan du gjenbruke
> den – hopp rett til **Del E** (appen kjører på sin egen port 8123, så den krasjer ikke
> med treningsappen på 3001). Ellers, ta Del B–D for en ny VM.

---

## Del A – Push koden til GitHub (på Windows-PC-en)

Repoet committes lokalt først (se «Klargjøring» nederst om det ikke er gjort).

1. Opprett et **nytt, tomt repo** på <https://github.com/new>:
   - Navn: f.eks. `fotball-vm-2026`
   - Privat eller offentlig – `config.json` og `data.json` (hemmeligheter + resultater)
     er `.gitignore`-et og havner aldri i repoet uansett.
   - **Ikke** kryss av for README/license/.gitignore (repoet finnes allerede lokalt).
2. Koble til og push (bytt `<bruker>`):
   ```powershell
   cd "C:\Users\viave\OneDrive - Vitec Software Group AB (publ)\Claude\FotballVM2026"
   git remote add origin https://github.com/<bruker>/fotball-vm-2026.git
   git push -u origin main
   ```

> Oppdatere senere: `git add -A && git commit -m "..." && git push`.

---

## Del B – Lag VM-en i Hyper-V

1. **Last ned ISO:** Ubuntu Server 24.04 LTS fra <https://ubuntu.com/download/server>.
2. **(Mangler ekstern svitsj?)** Hyper-V Manager → *Virtual Switch Manager* →
   **New virtual network switch** → **External** → knytt til nettverkskortet → OK.
3. **Action → New → Virtual Machine:**
   | Steg | Valg |
   |---|---|
   | Name | `fotballvm-vm` |
   | Generation | **Generation 2** |
   | Memory | **2048 MB** holder fint (appen er lett) |
   | Network | Den **eksterne** svitsjen |
   | Virtual hard disk | Ny, **20 GB** |
   | Installation options | velg Ubuntu-ISO-en |
4. **Settings før start:** Security → Secure Boot → Template = **«Microsoft UEFI
   Certificate Authority»**. Processor → **2** vCPU.
5. **Start → Connect**, installer Ubuntu, kryss av for **«Install OpenSSH server»**.
6. Finn IP: `ip a` (f.eks. `192.168.1.50`). SSH inn: `ssh <bruker>@192.168.1.50`.

---

## Del C – Fast IP (så Traefik alltid finner den)

Enklest: lag en **DHCP-reservasjon** på hjemmeruteren for VM-ens MAC-adresse. (Eller
statisk via netplan – se 10km-appens VM-SETUP for et eksempel.)

---

## Del D – Installer Docker på VM-en

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
docker compose version
```

---

## Del E – Hent og start appen

```bash
# Privat repo? Bruk et Personal Access Token (PAT) som passord når git spør.
git clone https://github.com/<bruker>/fotball-vm-2026.git
cd fotball-vm-2026

# Lag config med dine hemmeligheter (ligger i ./data, som er gitignore-et)
mkdir -p data
cp config.example.json data/config.json
nano data/config.json
```

Fyll inn i `data/config.json`:
- `username` / `password` – innlogging til adminpanelet (⚙️ nederst på siden)
- `anthropic_api_key` – nøkkel fra <https://console.anthropic.com> (kun nødvendig for
  «🤖 Hent resultater med AI»; la stå tom for å klare deg uten AI-funksjonen)

```bash
# Bygg og start (kjører i bakgrunnen, starter automatisk ved boot)
docker compose up -d --build

# Følg loggen – skal vise «VM 2026-serveren kjører på http://localhost:8123»
docker compose logs -f

# Lokal test på VM-en
curl -I http://localhost:8123
```

Tillat at Traefik-VM-en når port 8123:
```bash
sudo ufw allow from <TRAEFIK_VM_IP> to any port 8123 proto tcp
```

---

## Del F – Koble til Traefik

1. Kopier [`traefik/fotballvm.yml`](traefik/fotballvm.yml) til Traefiks dynamiske mappe på
   **Traefik-VM-en** (typisk `/etc/traefik/dynamic/`).
2. Rediger den: bytt `vm2026.vikane.cloud` til domenet ditt, og `192.168.1.50` til
   app-VM-ens IP. Sjekk at `websecure` og `letsencrypt` matcher din statiske Traefik-config.
3. Pek domenet (DNS / din dynamiske-DNS-løsning) mot hjemme-IP-en, slik du gjorde for
   `run.vikane.cloud`. Traefik henter Let's Encrypt-sertifikat automatisk.

Åpne `https://vm2026.vikane.cloud` – ferdig. 🎉

---

## Oppdatere senere
```bash
cd fotball-vm-2026 && git pull && docker compose up -d --build   # data/ beholdes
```

`data/`-mappa (config.json + data.json) røres ikke av `git pull` eller rebuild, så
deltakere, resultater og hemmeligheter overlever oppdateringer.

---

## Klargjøring (kun hvis repoet ikke er init-et lokalt ennå)
```powershell
cd "C:\Users\viave\OneDrive - Vitec Software Group AB (publ)\Claude\FotballVM2026"
git init -b main
git add -A
git commit -m "Fotball-VM 2026 scoreboard"
```
