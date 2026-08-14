@echo off
title Push F.R.I.D.A.Y. to GitHub (cloud9890)
cd /d "%~dp0"

echo ========================================================
echo   ⚡ F.R.I.D.A.Y. AI Assistant // Pushing to cloud9890
echo ========================================================
echo.

:: Configure Git Identity
git config --global user.name "cloud9890"
git config --global user.email "cloud9890@users.noreply.github.com"

:: Stage and Commit
git init
git branch -M main
git add .
git commit -m "feat: initial F.R.I.D.A.Y. tactical AI assistant prototype (WIP)"

:: Try GitHub CLI first
where gh >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Creating and pushing via GitHub CLI...
    gh repo create cloud9890/friday-ai-assistant --public --source=. --remote=origin --push
    if %ERRORLEVEL% EQU 0 goto success
)

:: Direct Remote Push
echo.
echo Pushing directly to https://github.com/cloud9890/friday-ai-assistant.git ...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/cloud9890/friday-ai-assistant.git
git push -u origin main

:success
echo.
echo ========================================================
echo   ✅ Repository pushed to https://github.com/cloud9890/friday-ai-assistant
echo ========================================================
pause
