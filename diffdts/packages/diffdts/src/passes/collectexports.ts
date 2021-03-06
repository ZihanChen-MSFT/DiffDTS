import { State } from "../state";
import { pathToKey, resolveImport } from "../state";

export interface Export {
    type: "value" | "type" | "unrecognized";
    declType?: string;
}

export interface ResolvedExports {
    exports: { [key: string]: Export[] };
}

function findSymbolAsExport(state: State, key: string, name: string): Export[] {
    const entry = state.entries[key];
    {
        const imported = entry.index.importedNames[name];
        if (imported !== undefined) {
            const fullpath = resolveImport(state, key, imported[0]);
            if (fullpath !== undefined) {
                const [importedKey, isLocal] = pathToKey(state, fullpath);
                if (isLocal) {
                    return findSymbolAsExport(state, importedKey, imported[1]);
                }
            }
            return [{ type: "unrecognized" }];
        }
    }
    {
        const imported = entry.index.importedDefaults[name];
        if (imported !== undefined) {
            const fullpath = resolveImport(state, key, imported);
            if (fullpath !== undefined) {
                const [importedKey, isLocal] = pathToKey(state, fullpath);
                if (isLocal) {
                    const importedEntry = state.entries[importedKey];
                    const exportDefault = importedEntry.raw.exportDefault;
                    if (exportDefault !== "unrecognized" && exportDefault !== "none") {
                        switch (exportDefault[0]) {
                            case "type": return [{ type: "type", declType: exportDefault[1] }];
                            case "object": return [{ type: "value" }];
                            case "symbol": return findSymbolAsExport(state, importedKey, exportDefault[1]);
                        }
                    }
                }
            }
            return [{ type: "unrecognized" }];
        }
    }
    {
        const imported = entry.index.importedNamespaces[name];
        if (imported !== undefined) {
            return [{ type: "value" }];
        }
    }
    {
        const decls = entry.index.decls[name];
        if (decls !== undefined) {
            return decls.map((decl) => {
                switch (decl.type) {
                    case "VariableDeclarator": return { type: "value" };
                    case "TSTypeAliasDeclaration": return { type: "type" };
                    case "TSInterfaceDeclaration":
                    case "ClassDeclaration": {
                        return { type: "type", declType: decl.type };
                    }
                    default: return { type: "unrecognized" };
                }
            });
        }
    }
    return [];
}

function exportMembersOfSymbol(state: State, key: string, name: string, output: ResolvedExports): void {
    throw new Error("Not Implemented!");
}

function recordExport(output: ResolvedExports, id: string, ...values: Export[]): void {
    if (output.exports[id] === undefined) {
        output.exports[id] = [];
    }
    for (const value of values) {
        let skip = false;
        for (const exists of output.exports[id]) {
            if (exists.type === value.type && exists.declType === value.declType) {
                skip = true;
                break;
            }
        }
        if (!skip) {
            output.exports[id].push(value);
        }
    }
}

export function collectExports(state: State, key: string): ResolvedExports {
    const output: ResolvedExports = {
        exports: {}
    };
    const entry = state.entries[key];

    for (const exportName in entry.raw.exports) {
        for (const rawExport of entry.raw.exports[exportName]) {
            switch (rawExport[0]) {
                case "type": {
                    if (rawExport[1] === "TSTypeAliasDeclaration") {
                        recordExport(output, exportName, { type: "type" });
                    } else {
                        recordExport(output, exportName, { type: "type", declType: rawExport[1] });
                    }
                    break;
                }
                case "symbol": {
                    const resolvedExports = findSymbolAsExport(state, key, exportName);
                    recordExport(output, exportName, ...resolvedExports);
                    break;
                }
                case "rename": {
                    const resolvedExports = findSymbolAsExport(state, key, rawExport[1]);
                    recordExport(output, exportName, ...resolvedExports);
                    break;
                }
            }
        }
    }

    if (entry.raw.exportDefault !== "unrecognized" && entry.raw.exportDefault !== "none") {
        switch (entry.raw.exportDefault[0]) {
            case "symbol": {
                const name = entry.raw.exportDefault[0];
                if (findSymbolAsExport(state, key, name).length !== 0) {
                    exportMembersOfSymbol(state, key, name, output);
                }
                break;
            }
            case "object": {
                for (const [propType, propValue] of entry.raw.exportDefault[1]) {
                    switch (propType) {
                        case "value": {
                            recordExport(output, propValue, { type: "value" });
                            break;
                        }
                        case "spread": {
                            exportMembersOfSymbol(state, key, propValue, output);
                            break;
                        }
                    }
                }
                break;
            }
        }
    }

    return output;
}