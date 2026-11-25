// Arranca la API local y la app web a la vez. Ctrl+C detiene ambas.
import { spawn } from 'node:child_process';

const procesos = [
  spawn('npm', ['run', 'dev:api'], { stdio: 'inherit', shell: true }),
  spawn('npm', ['run', 'dev:web'], { stdio: 'inherit', shell: true }),
];
const salir = () => { for (const p of procesos) p.kill(); process.exit(); };
process.on('SIGINT', salir);
process.on('SIGTERM', salir);
for (const p of procesos) p.on('exit', (code) => { if (code) salir(); });
