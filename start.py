"""
Startet den Dienstplaner: Datenbank vorbereiten, Demo-Daten (nur beim ersten
Mal), Server starten und den Browser oeffnen.

Aufruf ueber run.bat (Doppelklick) oder direkt:  py start.py
"""

from __future__ import annotations

import threading
import webbrowser

from backend import db, seed, server


def main() -> None:
    db.init_db()
    seed.seed()  # nur wirksam, wenn die Datenbank noch leer ist

    url = f"http://{server.HOST}:{server.PORT}/"
    # Browser kurz zeitversetzt oeffnen, damit der Server schon lauscht
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()

    server.run()


if __name__ == "__main__":
    main()
