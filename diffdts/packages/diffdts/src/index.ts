import { Visitor } from "@babel/core";
import * as babelParser from "@babel/parser";
import babelTraverse from "@babel/traverse";
import * as fs from "fs";
import * as path from "path";

interface State {}

function dtsVisitor(): Visitor<State> {
  return {
    Program: {
      exit(path, state) {
        console.log("dtsVisitor()");
      },
    },
  };
}

function processEntry(inputFilename: string, outputFilename: string): void {
  console.log(`Processing: ${inputFilename}`);
  const tsCode = fs.readFileSync(inputFilename, { encoding: "utf-8" });
  const tsAst = babelParser.parse(tsCode, {
    plugins: ["typescript"],
    sourceType: "module",
    allowUndeclaredExports: true,
  });

  const state: State = {};
  babelTraverse<State>(tsAst, dtsVisitor(), undefined, state);

  const output = {
    filename: inputFilename.substr(dirbase.length),
  };
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
