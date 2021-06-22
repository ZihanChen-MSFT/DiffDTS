import { Visitor } from "@babel/core";
import babelTraverse from "@babel/traverse";
import { File } from "@babel/types";
import { State } from "../state";

export function collectFileVisitor(): Visitor<State> {
  return {
    Program: {
      exit(path, state) {
        console.log("collectFileVisitor()");
      },
    },
  };
}

export function collectFiles(state: State, filename: string, tsAst: File): void {
  babelTraverse<State>(tsAst, collectFileVisitor(), undefined, state);
}