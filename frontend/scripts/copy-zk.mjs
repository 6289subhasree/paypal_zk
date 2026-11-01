// Copy the circuit's proving artifacts into public/zk so the browser can prove locally.
import { copyFileSync, mkdirSync } from "node:fs";
const src = new URL("../../circuits/keys/", import.meta.url);
const dst = new URL("../public/zk/", import.meta.url);
mkdirSync(dst, { recursive: true });
for (const f of ["kyc_payment.wasm", "kyc_payment.zkey"]) copyFileSync(new URL(f, src), new URL(f, dst));
console.log("copied proving artifacts to public/zk");
