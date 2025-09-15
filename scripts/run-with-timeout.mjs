#!/usr/bin/env node
import { spawn } from 'node:child_process';

function usage() {
  console.log('Usage: node scripts/run-with-timeout.mjs <seconds> <command...>');
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 2) usage();

const seconds = Number(args.shift());
if (!Number.isFinite(seconds) || seconds <= 0) usage();

const cmd = args.join(' ');

// Spawn a bash shell so we can kill the whole process group
const child = spawn('bash', ['-lc', cmd], {
  stdio: 'inherit',
  detached: true,
});

let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  try {
    // Kill the entire process group
    process.kill(-child.pid, 'SIGTERM');
  } catch {}
  // Fallback to direct kill after short delay
  setTimeout(() => {
    try { process.kill(child.pid, 'SIGKILL'); } catch {}
    process.exit(124);
  }, 2000);
}, seconds * 1000);

child.on('exit', (code, signal) => {
  clearTimeout(timer);
  if (timedOut) {
    // Already exited with 124 in timeout path
    return;
  }
  process.exit(code ?? (signal ? 128 : 0));
});

