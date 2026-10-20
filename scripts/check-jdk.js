#!/usr/bin/env node
// Fails fast unless the JDK that Gradle will use is exactly Java 17.
const { spawnSync } = require('child_process');
const path = require('path');

const exe = process.platform === 'win32' ? 'java.exe' : 'java';
const javaBin = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', exe) : 'java';
const r = spawnSync(javaBin, ['-version'], { encoding: 'utf8' });
const out = `${r.stdout || ''}${r.stderr || ''}`;
const m = out.match(/version "(\d+)(?:\.(\d+))?/);
const major = m ? (m[1] === '1' ? Number(m[2]) : Number(m[1])) : NaN;

if (r.error || major !== 17) {
  console.error(`\n[check-jdk] JDK 17 required, found: ${Number.isNaN(major) ? 'none' : major}`);
  console.error('Install Temurin/OpenJDK 17 and set JAVA_HOME to it, then retry.\n');
  process.exit(1);
}
console.log('[check-jdk] OK: Java 17 detected');
