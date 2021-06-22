import * as babelParser from "@babel/parser";
import { File } from "@babel/types";
import * as fs from "fs";

export interface State {
    pwd: string;
    files?: { [key: string]: File };
}

export function parseTS(state: State, filename: string): File {
    let key = filename.replace(/\\/g, "/");
    if (key.startsWith(state.pwd)) {
        key = key.substr(state.pwd.length);
    }

    if (state.files === undefined) {
        state.files = {};
    }
    let tsAst = state.files[key];
    if (tsAst !== undefined) {
        return tsAst;
    }

    const tsCode = fs.readFileSync(filename, { encoding: "utf-8" });
    tsAst = babelParser.parse(tsCode, {
        plugins: ["typescript"],
        sourceType: "module",
        allowUndeclaredExports: true,
    });

    state.files[key] = tsAst;
    return tsAst;
}