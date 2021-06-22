import * as fs from "fs";
import * as path from "path";
import { collectFiles } from "./passes/collectfiles"
import { parseTS, State } from "./state";

function processEntry(inputFilename: string, outputFilename: string): void {
  console.log(`Processing: ${inputFilename}`);
  const state: State = {
    pwd: path.dirname(inputFilename).replace(/\\/g, "/") + "/",
    files: {},
    entries: {}
  };
  const [key, entryAst] = parseTS(state, inputFilename);
  collectFiles(state, key, entryAst);

  const output = {
    pwd: state.pwd.substr(dirbase.length),
    files: Object.keys(state.entries).map((key) => state.entries[key].raw)
  };
  console.log(state.pwd);
  fs.writeFileSync(outputFilename, JSON.stringify(output, undefined, 4));
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
