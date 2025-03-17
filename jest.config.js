module.exports = {
    preset: 'ts-jest',            // Menyatakan bahwa kita menggunakan ts-jest
    testEnvironment: 'node',      // Lingkungan pengujian yang digunakan adalah Node.js
    transform: {
      '^.+\\.ts$': 'ts-jest',    // Menggunakan ts-jest untuk file .ts
    },
    testMatch: ['**/*.test.ts'],  // Hanya menjalankan file yang berakhiran .test.ts
    collectCoverage: true,        // Mengumpulkan informasi cakupan kode
    coverageDirectory: 'coverage', // Lokasi output laporan cakupan
  };