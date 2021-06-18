import * as path from "path";
import * as fs from "fs";

function processEntry(inputFilename: string, outputFilename: string): void {
  fs.writeFileSync(
    outputFilename,
    JSON.stringify(
      { filename: inputFilename.substr(dirbase.length) },
      undefined,
      4
    )
  );
}

const dirbase = path.join(__dirname, "../../../../download/node_modules/");
const dirsrc = path.join(dirbase, "react-native-tscodegen-types/react-native");
const dirdst = path.join(dirbase, "@types/react-native");
const dirout = path.join(__dirname, "../output");

const entrysrc = path.join(dirsrc, "index.d.ts");
const entrydst = path.join(dirdst, "index.d.ts");

if (!fs.existsSync(dirout)) {
  fs.mkdirSync(dirout, { recursive: true });
}
processEntry(entrysrc, path.join(dirout, "source_flow2dts.json"));
processEntry(entrydst, path.join(dirout, "target_dt.json"));
