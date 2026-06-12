@echo off
echo Buscando proceso en puerto 1420...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :1420') do (
  echo Cerrando PID %%a
  taskkill /F /PID %%a 2>nul
)
echo Listo.
