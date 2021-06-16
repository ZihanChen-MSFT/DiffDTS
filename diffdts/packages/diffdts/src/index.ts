import * as path from "path";
import * as fs from "fs";

const dirbase = path.join(__dirname, "../../../../download/node_modules/");
const dirsrc = path.join(dirbase, "react-native-tscodegen-types/react-native/index.d.ts");
const dirdst = path.join(dirbase, "@types/react-native/index.d.ts");

console.log(`[${fs.existsSync(dirsrc)}]: ${dirsrc}`);
console.log(`[${fs.existsSync(dirdst)}]: ${dirdst}`);
