const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const FRONTEND_DIR = path.join(ROOT, 'frontend')
const DIST_DIR = path.join(FRONTEND_DIR, 'dist')
const PUBLIC_DIR = path.join(ROOT, 'backend', 'public')

function run(cmd, cwd) {
  console.log(`\n▸ ${cmd}`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

function copyDir(src, dest) {
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  fs.cpSync(src, dest, { recursive: true })
}

console.log('╔══════════════════════════════════════════╗')
console.log('║     VibeMeet — Production Build          ║')
console.log('╚══════════════════════════════════════════╝\n')

console.log('📦  Step 1/2 — Building React frontend...')
run('npm run build', FRONTEND_DIR)

if (!fs.existsSync(DIST_DIR)) {
  console.error('✗  frontend/dist/ not found after build. Check Vite output above.')
  process.exit(1)
}

console.log('\n📂  Step 2/2 — Copying dist → backend/public/ ...')
copyDir(DIST_DIR, PUBLIC_DIR)

const fileCount = fs.readdirSync(PUBLIC_DIR).length
console.log(`✓  Copied ${fileCount} items to backend/public/\n`)

console.log('╔══════════════════════════════════════════╗')
console.log('║  Build complete! Ready for Hostinger.    ║')
console.log('╚══════════════════════════════════════════╝')
console.log(`
What to upload to Hostinger (via SFTP / File Manager):
  backend/
  ├── package.json
  ├── package-lock.json
  ├── src/
  │   └── server.js
  └── public/          ← this was just generated
      ├── index.html
      └── assets/

Do NOT upload: node_modules/ (run npm install on Hostinger via hPanel)
`)
