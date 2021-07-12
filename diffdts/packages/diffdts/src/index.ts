import * as fs from "fs";
import * as path from "path";
import { collectFiles } from "./passes/collectfiles"
import { collectExports, ResolvedExports } from "./passes/collectexports"
import { parseTS, State } from "./state";

function processEntry(inputFilename: string, outputDirname: string): ResolvedExports {
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
      decls: Object.keys(entry.index.decls).map((id) => [id, entry.index.decls[id].map((decl) => decl.type)])
    };

    const outputEntryPath = path.join(outputDirname, "files", filename + ".json");
    const outputEntryDir = path.dirname(outputEntryPath);
    if (!fs.existsSync(outputEntryDir)) {
      fs.mkdirSync(outputEntryDir, { recursive: true });
    }
    fs.writeFileSync(outputEntryPath, JSON.stringify(entryOutput, undefined, 4));
  }

  return resolvedExports;
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
const resrc = processEntry(entrysrc, path.join(dirout, "source_flow2dts"));
const redst = processEntry(entrydst, path.join(dirout, "target_dt"));

let same = 0;
let extra = 0;
let different = 0;
let missing = 0;
let differentDetails = {};
let missingDetails = {};
const keys = Array.from(new Set(Object.keys(resrc.exports).concat(Object.keys(redst.exports)))).sort();
for (const key of keys) {
  const esrc = resrc.exports[key];
  const edst = redst.exports[key];
  if (edst !== undefined) {
    if (esrc === undefined) {
      missing++;
      missingDetails[key] = edst;
    } else {
      const jsonsrc = JSON.stringify(esrc.map(e => JSON.stringify(e)).sort());
      const jsondst = JSON.stringify(edst.map(e => JSON.stringify(e)).sort());
      if (jsonsrc === jsondst) {
        same++;
      } else {
        different++;
        differentDetails[key] = {
          ours: esrc,
          theirs: edst
        };
      }
    }
  } else {
    extra++;
  }
}

fs.writeFileSync(path.join(dirout, "different.json"), JSON.stringify(differentDetails, undefined, 4));
fs.writeFileSync(path.join(dirout, "missing.json"), JSON.stringify(missingDetails, undefined, 4));

console.log(`same: ${same}`);
console.log(`extra: ${extra}`);
console.log(`missing: ${missing}`);
console.log(`different: ${different}`);
