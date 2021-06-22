import * as fs from "fs";
import * as path from "path";
import { collectFiles } from "./passes/collectfiles"
import { collectExports } from "./passes/collectexports"
import { parseTS, State } from "./state";

function processEntry(inputFilename: string, outputDirname: string): void {
  console.log(`Processing: ${inputFilename}`);
  const state: State = {
    pwd: path.dirname(inputFilename).replace(/\\/g, "/") + "/",
    files: {},
    entries: {}
  };
  const [key, entryAst] = parseTS(state, inputFilename);
  collectFiles(state, key, entryAst);
  const resolvedExports = collectExports(state, key);

  console.log(`Writing: index.json`);
  const output = {
    pwd: state.pwd.substr(dirbase.length),
    exports: {}
  };
  for (const key of Object.keys(resolvedExports.exports).sort()) {
    output.exports[key] = resolvedExports.exports[key];
  }
  fs.writeFileSync(path.join(outputDirname, "index.json"), JSON.stringify(output, undefined, 4));

  for (const filename in state.entries) {
    console.log(`    > ${filename}.json`);
    const entry = state.entries[filename];
    const entryOutput = {
      raw: entry.raw,
      importedNames: entry.index.importedNames,
      importedNamespaces: entry.index.importedNamespaces,
      importedDefaults: entry.index.importedDefaults,
      decls: Object.keys(entry.index.decls).map((id) => [id, entry.index.decls[id].type])
    };

    const outputEntryPath = path.join(outputDirname, "files", filename + ".json");
    const outputEntryDir = path.dirname(outputEntryPath);
    if (!fs.existsSync(outputEntryDir)) {
      fs.mkdirSync(outputEntryDir, { recursive: true });
    }
    fs.writeFileSync(outputEntryPath, JSON.stringify(entryOutput, undefined, 4));
  }
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
processEntry(entrysrc, path.join(dirout, "source_flow2dts"));
processEntry(entrydst, path.join(dirout, "target_dt"));
