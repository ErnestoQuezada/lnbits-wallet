
@echo off
title XAMPP Website Health Checker

echo ==========================================
echo       XAMPP WEBSITE HEALTH CHECKER
echo ==========================================
echo.

REM Move to the directory containing this script
cd /d "%~dp0"

REM Check if Claude Code is installed
where claude >nul 2>&1

if errorlevel 1 (
    echo ERROR: Claude Code was not found.
    echo Please install Claude Code and ensure it is in PATH.
    pause
    exit /b 1
)

REM Check if the Skill file exists
if not exist ".claude\skills\xampp-check\SKILL.md" (
    echo ERROR: XAMPP Check Skill was not found.
    echo Please verify the .claude\skills folder.
    pause
    exit /b 1
)

echo Project directory:
echo %CD%
echo.
echo Starting Claude Code Skill...
echo.

REM Invoke the skill
claude -p "/xampp-check"

echo.
echo ==========================================
echo          HEALTH CHECK COMPLETED
echo ==========================================
pause