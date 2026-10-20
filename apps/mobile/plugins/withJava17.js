/**
 * Expo config plugin: forces JDK 17 compliance for the generated Android project.
 *  1. Fails the prebuild early (with a clear message) if the active JDK is not 17.
 *  2. Injects compileOptions / kotlinOptions for Java 17 into android/app/build.gradle.
 *  3. Pins Gradle to the validated JAVA_HOME and tunes gradle.properties.
 * Runs automatically during `npx expo run:android` (prebuild step).
 */
const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');
const { spawnSync } = require('child_process');
const path = require('path');

const MARK = '// @generated withJava17';

function detectJavaMajor() {
  const exe = process.platform === 'win32' ? 'java.exe' : 'java';
  const bin = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', exe) : 'java';
  const r = spawnSync(bin, ['-version'], { encoding: 'utf8' });
  if (r.error) return { major: NaN, usedJavaHome: false };
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const m = out.match(/version "(\d+)(?:\.(\d+))?/);
  const major = m ? (m[1] === '1' ? Number(m[2]) : Number(m[1])) : NaN;
  return { major, usedJavaHome: !!process.env.JAVA_HOME };
}

function assertJdk17() {
  if (process.env.SKIP_JDK_CHECK === '1') return { ok: false };
  const { major, usedJavaHome } = detectJavaMajor();
  if (major !== 17) {
    throw new Error(
      `[withJava17] JDK 17 is required to build Android (found ${Number.isNaN(major) ? 'no JDK' : `JDK ${major}`}). ` +
        'Install Temurin/OpenJDK 17, set JAVA_HOME to it, and re-run. ' +
        '(Set SKIP_JDK_CHECK=1 to bypass at your own risk.)'
    );
  }
  return { ok: true, pinHome: usedJavaHome };
}

function injectCompileOptions(src) {
  if (src.includes(MARK)) return src;
  const block = `
    ${MARK}
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = '17'
    }
`;
  if (!/^android\s*\{/m.test(src)) {
    throw new Error('[withJava17] Could not find the android { } block in app/build.gradle');
  }
  return src.replace(/^android\s*\{/m, (m) => m + block);
}

function upsertProperty(props, key, value) {
  const existing = props.find((p) => p.type === 'property' && p.key === key);
  if (existing) existing.value = value;
  else props.push({ type: 'property', key, value });
}

module.exports = function withJava17(config) {
  const jdk = assertJdk17();

  config = withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('[withJava17] Expected a Groovy app/build.gradle');
    }
    cfg.modResults.contents = injectCompileOptions(cfg.modResults.contents);
    return cfg;
  });

  config = withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;
    upsertProperty(props, 'org.gradle.jvmargs', '-Xmx4096m -XX:MaxMetaspaceSize=1024m');
    upsertProperty(props, 'org.gradle.java.installations.auto-download', 'false');
    upsertProperty(props, 'kotlin.jvm.target.validation.mode', 'warning');
    if (jdk.ok && jdk.pinHome) {
      // Gradle daemon runs on the exact JDK 17 we just validated (forward slashes work on every OS).
      upsertProperty(props, 'org.gradle.java.home', process.env.JAVA_HOME.replace(/\\/g, '/'));
    }
    return cfg;
  });

  return config;
};
