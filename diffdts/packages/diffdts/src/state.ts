import * as babelParser from "@babel/parser";
import { File } from "@babel/types";
import * as t from "@babel/types";
import * as fs from "fs";

export interface SymbolRawEntry {
    importedFiles: { [key: string]: ["names", [string, string][]] | ["default", string] | ["namespace", string] }
    exports: { [key: string]: ["type", string] | ["variable"] | ["rename", string] };
    exportDefault: ["variable", string] | ["object", ["value" | "spread", string][]] | "unrecognized" | "none";
}

export interface SymbolIndex {
    decls: { [key: string]: t.Declaration | t.VariableDeclarator }
    exportDefault?: t.ExportDefaultDeclaration;
}

export interface SymbolEntry {
    raw: SymbolRawEntry;
    index: SymbolIndex;
}

export function createSymbolEntry(): SymbolEntry {
    return {
        raw: {
            importedFiles: {},
            exports: {},
            exportDefault: "none"
        },
        index: {
            decls: {}
        }
    };
}

export interface State {
    pwd: string;
    files: { [key: string]: File };
    entries: { [key: string]: SymbolEntry };
}

export function parseTS(state: State, filename: string): [string, File] {
    let key = filename.replace(/\\/g, "/");
    if (key.startsWith(state.pwd)) {
        key = key.substr(state.pwd.length);
    }

    let tsAst = state.files[key];
    if (tsAst === undefined) {
        const tsCode = fs.readFileSync(filename, { encoding: "utf-8" });
        tsAst = babelParser.parse(tsCode, {
            plugins: ["typescript"],
            sourceType: "module",
            allowUndeclaredExports: true,
        });
        state.files[key] = tsAst;
    }
    return [key, tsAst];
}