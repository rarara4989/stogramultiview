
@echo off
cd /d %~dp0
echo サーバーを起動しています... ブラウザで http://localhost:8000 を開いてください。
py -m http.server 8000
pause
