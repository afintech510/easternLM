@echo off
title ELM Print Server - Sunmi NT311
cd /d "%~dp0"
set PRINTER_COUNTER_IP=192.168.1.4
node server.js
pause
