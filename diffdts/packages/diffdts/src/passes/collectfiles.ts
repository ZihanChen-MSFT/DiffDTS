import { Visitor } from "@babel/core";
import babelTraverse from "@babel/traverse";
import { File } from "@babel/types";
import * as t from "@babel/types";
import { createSymbolEntry, parseTS, pathToKey, resolveImport } from "../state";
import { State, SymbolEntry, SymbolIndex, SymbolRawEntry } from "../state";

interface Context {
  state: State;
  key: string;
  entry: SymbolEntry;
  raw: SymbolRawEntry;
  index: SymbolIndex;
}

function recordDecl(context: Context, id: string, decl: t.Declaration | t.VariableDeclarator): void {
  if (context.index.decls[id] === undefined) {
    context.index.decls[id] = [decl];
  } else if (!context.index.decls[id].includes(decl)) {
    context.index.decls[id].push(decl);
  }
}

function recordExport(context: Context, id: string, value: SymbolRawEntry["exports"][string][number]): void {
  if (context.raw.exports[id] === undefined) {
    context.raw.exports[id] = [value];
  } else {
    for (const exists of context.raw.exports[id]) {
      if (exists[0] === value[0] && exists[1] === value[1]) {
        return;
      }
    }
    context.raw.exports[id].push(value);
  }
}

function astToRawVisitor(): Visitor<Context> {
  return {
    ImportDeclaration: {
      exit(path, context) {
        const node = path.node;
        if (node.specifiers.length === 1 && node.specifiers[0].type === "ImportDefaultSpecifier") {
          const name = node.specifiers[0].local.name;
          context.raw.importedFiles[node.source.value] = [
            "default",
            name
          ];
          context.index.importedDefaults[name] = node.source.value;
        } else if (node.specifiers.length === 1 && node.specifiers[0].type === "ImportNamespaceSpecifier") {
          const name = node.specifiers[0].local.name;
          context.raw.importedFiles[node.source.value] = [
            "namespace",
            name
          ];
          context.index.importedNamespaces[name] = node.source.value;
        } else {
          context.raw.importedFiles[node.source.value] = [
            "names",
            node.specifiers
              .filter((specifier) => specifier.type === "ImportSpecifier")
              .map((specifier: t.ImportSpecifier) => {
                const imported = specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value;
                const local = specifier.local.name;
                context.index.importedNames[local] = [node.source.value, imported];
                return [imported, local];
              })
          ];
        }
      }
    },
    TSTypeAliasDeclaration: {
      exit(path, context) {
        recordDecl(context, path.node.id.name, path.node);
      }
    },
    TSInterfaceDeclaration: {
      exit(path, context) {
        recordDecl(context, path.node.id.name, path.node);
      }
    },
    ClassDeclaration: {
      exit(path, context) {
        recordDecl(context, path.node.id.name, path.node);
      }
    },
    VariableDeclaration: {
      exit(path, context) {
        for (const decl of path.node.declarations) {
          if (decl.id.type === "Identifier") {
            const id = decl.id.name;
            recordDecl(context, id, decl);
          }
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
              recordDecl(context, id, node.declaration);
              recordExport(context, id, ["type", node.declaration.type]);
              break;
            }
            case "VariableDeclaration": {
              for (const decl of node.declaration.declarations) {
                if (decl.id.type === "Identifier") {
                  const id = decl.id.name;
                  recordDecl(context, id, decl);
                  recordExport(context, id, ["symbol"]);
                }
              }
              break;
            }
          }
        }
        for (const specifier of node.specifiers) {
          if (specifier.type === "ExportSpecifier" && specifier.exported.type === "Identifier") {
            recordExport(context, specifier.exported.name, ["rename", specifier.local.name]);
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
            context.raw.exportDefault = ["symbol", node.declaration.name];
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
          case "ClassDeclaration": {
            context.raw.exportDefault = ["type", node.declaration.type];
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
    console.log(`    < ${key}`);
    entry = createSymbolEntry();
    state.entries[key] = entry;

    const context: Context = {
      state,
      key,
      entry,
      raw: entry.raw,
      index: entry.index
    }
    babelTraverse(tsAst, astToRawVisitor(), undefined, context);

    for (const importedPath in entry.raw.importedFiles) {
      const fullname = resolveImport(state, key, importedPath);
      if (fullname !== undefined) {
        const [, isLocal] = pathToKey(state, fullname);
        if (isLocal) {
          const [importedKey, importedAst] = parseTS(state, fullname);
          collectFiles(state, importedKey, importedAst);
        }
      }
    }
  }
}