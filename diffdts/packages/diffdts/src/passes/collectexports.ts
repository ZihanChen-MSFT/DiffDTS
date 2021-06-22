import { State } from "../state";
import { pathToKey, resolveImport } from "../state";

export interface Export {
    type: "value" | "type" | "unrecognized";
    declType?: string;
}

export interface ResolvedExports {
    exports: { [key: string]: Export };
}

function findSymbolAsExport(state: State, key: string, name: string): Export | undefined {
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
            return undefined;
        }
    }
    {
        const imported = entry.index.importedDefaults[name];
        if (imported !== undefined) {
            const fullpath = resolveImport(state, key, imported[0]);
            if (fullpath !== undefined) {
                const [importedKey, isLocal] = pathToKey(state, fullpath);
                if (isLocal) {
                    const importedEntry = state.entries[importedKey];
                    const exportDefault = importedEntry.raw.exportDefault;
                    if (exportDefault !== "unrecognized" && exportDefault !== "none") {
                        switch (exportDefault[0]) {
                            case "type": return { type: "type", declType: exportDefault[1] };
                            case "object": return { type: "value" };
                            case "symbol": return findSymbolAsExport(state, importedKey, exportDefault[1]);
                        }
                    }
                }
            }
            return undefined;
        }
    }
    {
        const imported = entry.index.importedNamespaces[name];
        if (imported !== undefined) {
            return { type: "value" };
        }
    }
    {
        const decl = entry.index.decls[name];
        if (decl !== undefined) {
            switch (decl.type) {
                case "VariableDeclarator": return { type: "value" };
                case "TSTypeAliasDeclaration": return { type: "type" };
                case "TSInterfaceDeclaration":
                case "ClassDeclaration": {
                    return { type: "type", declType: decl.type };
                }
                default: return undefined;
            }
        }
    }
}

function exportMembersOfSymbol(state: State, key: string, name: string, output: ResolvedExports): void {
    // TODO:
}

export function collectExports(state: State, key: string): ResolvedExports {
    const output: ResolvedExports = {
        exports: {}
    };
    const entry = state.entries[key];

    for (const exportName in entry.raw.exports) {
        if (output.exports[exportName] === undefined) {
            const rawExport = entry.raw.exports[exportName];
            switch (rawExport[0]) {
                case "type": {
                    if (rawExport[1] === "TSTypeAliasDeclaration") {
                        output.exports[exportName] = { type: "type" };
                    } else {
                        output.exports[exportName] = { type: "type", declType: rawExport[1] };
                    }
                    break;
                }
                case "symbol": {
                    const resolvedExport = findSymbolAsExport(state, key, exportName);
                    if (resolvedExport !== undefined) {
                        output.exports[exportName] = resolvedExport;
                    }
                    break;
                }
                case "rename": {
                    const resolvedExport = findSymbolAsExport(state, key, rawExport[1]);
                    if (resolvedExport !== undefined) {
                        output.exports[exportName] = resolvedExport;
                    }
                    break;
                }
            }
        }
    }

    if (entry.raw.exportDefault !== "unrecognized" && entry.raw.exportDefault !== "none") {
        switch (entry.raw.exportDefault[0]) {
            case "symbol": {
                const name = entry.raw.exportDefault[0];
                const resolvedExport = findSymbolAsExport(state, key, name);
                if (resolvedExport !== undefined && resolvedExport.type === "value") {
                    exportMembersOfSymbol(state, key, name, output);
                }
                break;
            }
            case "object": {
                for (const [propType, propValue] of entry.raw.exportDefault[1]) {
                    switch (propType) {
                        case "value": {
                            if (output.exports[propValue] !== undefined) {
                                output.exports[propValue] = { type: "value" };
                            }
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