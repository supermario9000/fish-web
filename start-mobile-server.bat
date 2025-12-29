@echo off
setlocal enabledelayedexpansion

::Chatgpt generated code to launch php server on local network
:: Set project directory
set "PROJECT_DIR=%USERPROFILE%\Documents\GitHub\Web-UI-design"

:: Init flags
set "found_wifi=0"
set "localip="

echo ========================================
echo   Tiny Turntles Mobile Server Setup
echo ========================================
echo.

:: Check if running as admin
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✓ Running with admin privileges
) else (
    echo ⚠ WARNING: Not running as administrator!
    echo   Firewall rules may not be created.
    echo   Right-click and "Run as administrator" for best results.
    echo.
)

:: Loop through ipconfig output
for /f "delims=" %%i in ('ipconfig') do (
    echo %%i | findstr /C:"Wireless LAN adapter WiFi" >nul
    if !errorlevel! == 0 (
        set "found_wifi=1"
    )

    if !found_wifi! == 1 (
        echo %%i | findstr /C:"IPv4 Address" >nul
        if !errorlevel! == 0 (
            for /f "tokens=2 delims=:" %%a in ("%%i") do (
                set "localip=%%a"
                set "found_wifi=2"
            )
        )
    )
)

:: Trim whitespace
set "localip=%localip: =%"

:: Confirm result
if "%localip%"=="" (
    echo ❌ Could not find Wi-Fi IP address. Are you connected to Wi-Fi?
    pause
    exit /b
)

echo ✅ Wi-Fi IPv4: %localip%
echo.

:: Add firewall rule for PHP
echo Configuring firewall...
netsh advfirewall firewall show rule name="PHP Development Server" >nul 2>&1
if %errorLevel% == 0 (
    echo ✓ Firewall rule already exists
) else (
    echo   Creating firewall rule...
    netsh advfirewall firewall add rule name="PHP Development Server" dir=in action=allow protocol=TCP localport=8000 >nul 2>&1
    if %errorLevel% == 0 (
        echo ✓ Firewall rule created successfully
    ) else (
        echo ⚠ Failed to create firewall rule - you may need to run as admin
    )
)
echo.

:: Change to project dir and start PHP server
cd /d "%PROJECT_DIR%"
echo ========================================
echo   Server Starting...
echo ========================================
echo.
echo 🌐 Access from phone: http://%localip%:8000
echo 📱 Make sure your phone is on the same WiFi network!
echo.
echo Press Ctrl+C to stop the server
echo ----------------------------------------
echo.
php -S %localip%:8000 -t .
pause