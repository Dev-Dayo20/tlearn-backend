import crypto from "crypto";

const generateKey = () => {
  return crypto.randomBytes(32).toString("hex");
};

const generate = generateKey();
console.log(generate);
