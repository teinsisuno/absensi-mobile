/**
 * Config plugin — ABI filters biar APK lebih kecil (Android Go friendly).
 *
 * Expo prebuild (lokal maupun EAS cloud) meng-generate android/ dari app.json.
 * Perubahan manual di android/app/build.gradle TIDAK ikut ke EAS cloud, jadi
 * inject ndk.abiFilters lewat config plugin — jalan otomatis saat prebuild.
 *
 * Hasil: APK universal tapi cuma bawa native libs arm64-v8a + armeabi-v7a
 * (x86/x86_64 dibuang) → ukuran turun drastis.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAbiFilters(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    // Jangan double-inject kalau plugin sudah pernah jalan
    if (!contents.includes("abiFilters 'arm64-v8a'")) {
      config.modResults.contents = contents.replace(
        'defaultConfig {',
        "defaultConfig {\n        ndk {\n            // Hanya ABI HP asli (buang x86/x86_64) — APK lebih kecil\n            abiFilters 'arm64-v8a', 'armeabi-v7a'\n        }"
      );
    }
    return config;
  });
};
