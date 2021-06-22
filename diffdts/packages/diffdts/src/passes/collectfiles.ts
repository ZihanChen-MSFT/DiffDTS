import { Visitor } from "@babel/core";
import babelTraverse from "@babel/traverse";
import { File } from "@babel/types";
import * as t from "@babel/types";
import { createSymbolEntry, State, SymbolEntry, SymbolIndex, SymbolRawEntry } from "../state";

interface Context {
  state: State;
  key: string;
  entry: SymbolEntry;
  raw: SymbolRawEntry;
  index: SymbolIndex;
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
    },
    ExportNamedDeclaration: {
      exit(path, context) {
        const node = path.node;
        if (node.declaration) {
          switch (node.declaration.type) {
            case "TSTypeAliasDeclaration":
            case "TSInterfaceDeclaration":
            case "ClassDeclaration": {
              const id = node.declaration.id.name;
              context.index.decls[id] = node.declaration;
              context.raw.exports[id] = ["type", node.declaration.type];
              break;
            }
            case "VariableDeclaration": {
              for (const decl of node.declaration.declarations) {
                if (decl.id.type === "Identifier") {
                  const id = decl.id.name;
                  context.index.decls[id] = decl;
                  context.raw.exports[id] = ["variable"];
                }
              }
              break;
            }
          }
        }
        for (const specifier of node.specifiers) {
          if (specifier.type === "ExportSpecifier" && specifier.exported.type === "Identifier") {
            context.raw.exports[specifier.exported.name] = ["rename", specifier.local.name];
          }
        }
      }
    },
    ExportDefaultDeclaration: {
      exit(path, context) {
        const node = path.node;
        context.index.exportDefault = node;
        switch (node.declaration.type) {
          case "Identifier": {
            context.raw.exportDefault = ["variable", node.declaration.name];
            break;
          }
          case "ObjectExpression": {
            context.raw.exportDefault = ["object", []];
            for (const prop of node.declaration.properties) {
              switch (prop.type) {
                case "ObjectProperty": {
                  switch (prop.key.type) {
                    case "Identifier": {
                      context.raw.exportDefault[1].push(["value", prop.key.name]);
                    }
                  }
                  break;
                }
                case "SpreadElement": {
                  if (prop.argument.type === "Identifier") {
                    context.raw.exportDefault[1].push(["spread", prop.argument.name]);
                  }
                  break;
                }
              }
            }
            break;
          }
          default: {
            context.raw.exportDefault = "unrecognized";
          }
        }
      }
    }
  };
}

export function collectFiles(state: State, key: string, tsAst: File): void {
  let entry = state.entries[key];
  if (entry === undefined) {
    entry = createSymbolEntry();
    state.entries[key] = entry;
  }
  const context: Context = {
    state,
    key,
    entry,
    raw: entry.raw,
    index: entry.index
  }
  babelTraverse(tsAst, collectFileVisitor(), undefined, context);
}