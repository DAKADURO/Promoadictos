const bcrypt = require('bcryptjs');

const password = 'X9#qL2!pZ8*rT5$vN1^mB4@kY7';
const salt = bcrypt.genSaltSync(12);
const hash = bcrypt.hashSync(password, salt);

console.log('Username: MasterPromo_2026_Admin');
console.log('Password: ' + password);
console.log('Hash: ' + hash);
