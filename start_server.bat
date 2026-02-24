@echo off
echo Starting RefundHelp Website Server...
echo.
echo This will start a local web server on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0"
php -S localhost:8000
pause