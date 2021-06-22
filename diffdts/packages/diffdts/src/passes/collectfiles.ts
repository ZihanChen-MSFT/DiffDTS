import { Visitor } from "@babel/core";
import babelTraverse from "@babel/traverse";
import { File } from "@babel/types";
import * as t from "@babel/types";
import { createSymbolEntry, State, SymbolEntry, SymbolRawEntry } from "../state";

interface Context {
  state: State;
  key: string;
  entry: SymbolEntry;
  raw: SymbolRawEntry;
}

function collectFileVisitor(): Visitor<Context> {
  return {
    ImportDeclaration: {
      exit(path, context) {
        const node = path.node;
        if (node.specifiers.length === 1 && node.specifiers[0].type === "ImportDefaultSpecifier") {
          context.raw.importedFiles[node.source.value] = [
            "default",
            node.specifiers[0].local.name
          ];
        } else if (node.specifiers.length === 1 && node.specifiers[0].type === "ImportNamespaceSpecifier") {
          context.raw.importedFiles[node.source.value] = [
            "namespace",
            node.specifiers[0].local.name
          ];
        } else {
          context.raw.importedFiles[node.source.value] = [
            "names",
            node.specifiers
              .filter((specifier) => specifier.type === "ImportSpecifier")
              .map((specifier: t.ImportSpecifier) => [
                specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value,
                specifier.local.name
              ])
          ];
        }
      }
    }
  };
}

export function collectFiles(state: State, key: string, tsAst: File): void {
  if (state.entries === undefined) {
    state.entries = {};
  }
  let entry = state.entries[key];
  if (entry === undefined) {
    entry = createSymbolEntry();
    state.entries[key] = entry;
  }
  const context: Context = {
    state,
    key,
    entry,
    raw: entry.raw
  }
  babelTraverse(tsAst, collectFileVisitor(), undefined, context);
}