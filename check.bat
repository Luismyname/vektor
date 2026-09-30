cd "C:\Users\guill\Documents\x\vector"
npx vite --host > server.log 2>&1
timeout /t 3
node check-server.mjs