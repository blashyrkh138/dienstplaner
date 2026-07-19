@echo off
chcp 65001 >nul
title Dienstplaner
echo =====================================================
echo   Dienstplaner  -  wird gestartet
echo =====================================================
echo.
echo Pruefe Zusatzpakete (nur beim ersten Start noetig)...
py -m pip install --user --quiet -r requirements.txt
echo.
echo Starte die App... Ein Browserfenster oeffnet sich gleich.
echo (Dieses schwarze Fenster bitte geoeffnet lassen, solange du arbeitest.)
echo.
py start.py
echo.
echo Die App wurde beendet.
pause
