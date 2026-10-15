@echo off
REM Push deploy repo to GitHub - double click to run
title Push to GitHub
cd /d D:\agent-tmp\vinyl-galaxy\deploy

echo ============================================
echo  Pushing to github.com/xiaoming-xuebing/Huang-Yiming
echo  112MB first push may take 2-10 minutes...
echo ============================================
echo.

REM Clear any broken proxy env for this session
set HTTP_PROXY=
set HTTPS_PROXY=
set http_proxy=
set https_proxy=

git push -u origin main
echo.
if %errorlevel%==0 (
  echo ============================================
  echo  PUSH OK!
  echo  Next: open repo Settings - Pages, enable
  echo  branch main, folder /(root)
  echo ============================================
) else (
  echo ============================================
  echo  PUSH FAILED. Check:
  echo  1. Is your proxy/VPN running? Try again.
  echo  2. Or use SSH: see deployment guide.
  echo ============================================
)
pause
