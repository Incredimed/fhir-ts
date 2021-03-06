"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const glob = __importStar(require("glob"));
// tslint:disable-next-line:no-duplicate-imports
const ts_simple_ast_1 = __importDefault(require("ts-simple-ast"));
const helpers_1 = require("./helpers");
/**
 * Module for generating Typescript type declarations from a FHIR structure definition
 */
var FHIRPrimitiveTypes;
(function (FHIRPrimitiveTypes) {
    FHIRPrimitiveTypes["boolean"] = "boolean";
    FHIRPrimitiveTypes["integer"] = "integer";
    FHIRPrimitiveTypes["string"] = "string";
    FHIRPrimitiveTypes["decimal"] = "decimal";
    FHIRPrimitiveTypes["uri"] = "uri";
    FHIRPrimitiveTypes["base64Binary"] = "base64Binary";
    FHIRPrimitiveTypes["instant"] = "instant";
    FHIRPrimitiveTypes["date"] = "date";
    FHIRPrimitiveTypes["dateTime"] = "dateTime";
    FHIRPrimitiveTypes["time"] = "time";
    FHIRPrimitiveTypes["code"] = "code";
    FHIRPrimitiveTypes["oid"] = "oid";
    FHIRPrimitiveTypes["id"] = "id";
    FHIRPrimitiveTypes["markdown"] = "markdown";
    FHIRPrimitiveTypes["unsignedInt"] = "unsignedInt";
    FHIRPrimitiveTypes["positiveInt"] = "positiveInt";
    FHIRPrimitiveTypes["xhtml"] = "xhtml";
})(FHIRPrimitiveTypes || (FHIRPrimitiveTypes = {}));
const PRIMITIVE_TYPES_SET = new Set(Object.keys(FHIRPrimitiveTypes));
exports.generateDefinitions = (pattern, outputPath, version = "4.0.0") => {
    // tslint:disable-next-line:no-console
    console.log("Generating Definitions");
    const files = glob.sync(pattern);
    const structureDefinitions = files.map(fileName => helpers_1.loadFromFile(fileName));
    // Only define declarations for base resource and complex-type structure definitions
    const interfaceDeclarations = structureDefinitions
        .filter(({ baseDefinition, kind, id, type }) => kind === "complex-type" ||
        (kind === "resource" &&
            baseDefinition ===
                "http://hl7.org/fhir/StructureDefinition/DomainResource") ||
        type === "Resource")
        .reduce((prev, curr) => {
        const newInterfaceDeclarations = createInterfaceDeclarationsFromStructureDefinition(curr);
        return [...prev, ...newInterfaceDeclarations];
    }, []);
    // tslint:disable-next-line:no-console
    console.log("Creating Project");
    const project = new ts_simple_ast_1.default({
        compilerOptions: { declaration: true, outDir: outputPath }
    });
    // tslint:disable-next-line:no-console
    console.log("Creating Source Files");
    project.createSourceFile(`${outputPath}/fhir-r4.ts`, {
        interfaces: interfaceDeclarations,
        typeAliases: [
            { name: "canonical", type: "string", isExported: true },
            { name: "url", type: "string", isExported: true },
            { name: "uuid", type: "string", isExported: true },
            { name: "integer", type: "number", isExported: true },
            { name: "decimal", type: "number", isExported: true },
            { name: "uri", type: "string", isExported: true },
            { name: "base64Binary", type: "string", isExported: true },
            { name: "instant", type: "string", isExported: true },
            { name: "date", type: "string", isExported: true },
            { name: "dateTime", type: "string", isExported: true },
            { name: "time", type: "string", isExported: true },
            { name: "code", type: "string", isExported: true },
            { name: "oid", type: "string", isExported: true },
            { name: "id", type: "string", isExported: true },
            { name: "markdown", type: "string", isExported: true },
            { name: "unsignedInt", type: "number", isExported: true },
            { name: "positiveInt", type: "number", isExported: true },
            { name: "xhtml", type: "string", isExported: true } // For Narrative.div
        ]
    }, { overwrite: true });
    // tslint:disable-next-line:no-console
    console.log("Emitting File");
    project.emit({ emitOnlyDtsFiles: true });
    // tslint:disable-next-line:no-console
    console.log("File Generated: " + `${outputPath}/fhir.r4.ts`);
    return files;
};
const createInterfaceDeclarationsFromStructureDefinition = (structureDefinition) => {
    const { differential, kind, snapshot, type, id } = structureDefinition;
    const interfaces = interfacesFromSnapshot(snapshot);
    const isResource = kind === "resource";
    // tslint:disable-next-line:no-console
    console.log("Resource: " + id);
    return Object.keys(interfaces).map(interfaceName => {
        const { backbone, docs, elementDefinitions } = interfaces[interfaceName];
        return {
            docs: (docs || []).map((doc) => helpers_1.formatComment(doc)),
            isExported: true,
            name: interfaceName,
            properties: [
                ...(isResource && !backbone
                    ? [
                        {
                            docs: ["The type of the resource."],
                            name: "resourceType",
                            type: "string"
                        }
                    ]
                    : []),
                ...Object.keys(elementDefinitions).map(elementKey => {
                    const elementDefinition = elementDefinitions[elementKey];
                    const { definition } = elementDefinition;
                    return {
                        docs: [helpers_1.formatComment(definition)],
                        hasQuestionToken: !helpers_1.isRequired(elementDefinition),
                        name: elementKey,
                        type: helpers_1.propertyTypeName(elementDefinition)
                    };
                })
            ]
        };
    });
};
const interfacesFromSnapshot = (snapshot) => snapshot.element.reduce((interfaceDefinitions, curr, index) => {
    const { contentReference, definition, path, type } = curr;
    const isBaseElement = index === 0; // The first element in the snapshot array is the base element definition
    if (isBaseElement) {
        return {
            [path]: {
                backbone: false,
                docs: [helpers_1.formatComment(definition)]
            }
        };
    }
    // If contentReference inherit type from referenced
    const types = !contentReference
        ? type
        : [helpers_1.stringsToPascalCase(contentReference.slice(1).split("."))];
    const normalizedElementDefinitions = types.reduce((accumPropDef, currType) => {
        const elName = helpers_1.elementName(curr, currType);
        return Object.assign({}, accumPropDef, { [elName]: Object.assign({}, curr, { type: [currType] }) }, (PRIMITIVE_TYPES_SET.has(currType.code)
            ? {
                [`_${elName}`]: Object.assign({}, curr, { definition: `Contains extension information for property '${elName}'.`, min: 0, type: [{ code: "Element" }] })
            }
            : {}));
    }, {});
    let updatedInterfaceDefinitions = Object.assign({}, interfaceDefinitions, { [helpers_1.parentName(curr)]: Object.assign({}, interfaceDefinitions[helpers_1.parentName(curr)], { elementDefinitions: Object.assign({}, (interfaceDefinitions[helpers_1.parentName(curr)] || {}).elementDefinitions, normalizedElementDefinitions) }) });
    if (helpers_1.isBackboneElement(curr)) {
        const backboneElementName = helpers_1.pathToPascalCase(path);
        updatedInterfaceDefinitions = Object.assign({}, updatedInterfaceDefinitions, { [backboneElementName]: Object.assign({}, updatedInterfaceDefinitions[backboneElementName], { backbone: true, docs: [helpers_1.formatComment(definition)] }) });
    }
    return updatedInterfaceDefinitions;
}, {});
//# sourceMappingURL=generateDefinition.js.map