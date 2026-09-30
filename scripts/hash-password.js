// Genera el hash bcrypt para ADMIN_PASSWORD_HASH sin dejar la contraseña en el repo.
// Uso:  node scripts/hash-password.js
// (pide la contraseña por consola; no la escribas en archivos ni en el historial del shell)
const bcrypt = require("bcryptjs");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Nueva contraseña (mín. 16 caracteres): ", (pw) => {
  rl.close();
  if (pw.length < 16) {
    console.error("Usa al menos 16 caracteres.");
    process.exit(1);
  }
  console.log("\nADMIN_PASSWORD_HASH=" + bcrypt.hashSync(pw, 12));
  console.log("Pégalo en las variables de Railway y borra el historial de la terminal.");
});
