/**
 * Config plugin — ABI filter biar APK lebih kecil (Android Go friendly).
 *
 * React Native mengontrol ABI lewat property `reactNativeArchitectures` di
 * android/gradle.properties (dibaca ReactAndroid/build.gradle.kts) — BUKAN
 * lewat ndk.abiFilters di app/build.gradle (itu di-override RNGP).
 *
 * Expo prebuild (lokal maupun EAS cloud) generate ulang android/ dari
 * app.json, jadi inject lewat config plugin biar jalan otomatis.
 *
 * Hasil: native libs cuma arm64-v8a + armeabi-v7a (x86/x86_64 dibuang) →
 * ukuran APK turun drastis.
 */
const { withGradleProperties } = require('expo/config-plugins');

module.exports = function withAbiFilters(config) {
  return withGradleProperties(config, (config) => {
    // Hapus key lama kalau sudah ada (biar idempotent)
    config.modResults = config.modResults.filter(
      (p) => p.key !== 'reactNativeArchitectures'
    );
    config.modResults.push({
      type: 'property',
      key: 'reactNativeArchitectures',
      value: 'arm64-v8a,armeabi-v7a',
    });
    return config;
  });
};
