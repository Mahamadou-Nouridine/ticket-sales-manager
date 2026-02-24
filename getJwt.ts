import jwt from "jsonwebtoken";

const secret = "9777bfb00a1fae7759af4286e5898b7dddd7bbcb49413f8b5f30ab9b6fd8c514a3238664288f934c1502919d980c9a1648075ce9234daf5266c07391a99c42f7";
const payload = {
    id: "69c68455-8049-448b-852d-86788817312a",
    name: "System Admin",
    email: "[EMAIL_ADDRESS]",
    role: "admin",
    tenantId: null,
    tenantSlug: null,
    needsPasswordSetup: false,
};

// never expire
const token = jwt.sign(payload, secret, { expiresIn: "99999999999999999999d" });
console.log(token);