import * as glob from "glob";
import { InterfaceDeclarationStructure } from "ts-simple-ast";
// tslint:disable-next-line:no-duplicate-imports
import Project from "ts-simple-ast";
import {
  elementName,
  formatComment,
  isBackboneElement,
  isRequired,
  loadFromFile,
  parentName,
  pathToPascalCase,
  propertyTypeName,
  stringsToPascalCase
} from "./helpers";

/**
 * Module for generating Typescript type declarations from a FHIR structure definition
 */

enum FHIRPrimitiveTypes {
  boolean = "boolean",
  integer = "integer",
  string = "string",
  decimal = "decimal",
  uri = "uri",
  base64Binary = "base64Binary",
  instant = "instant",
  date = "date",
  dateTime = "dateTime",
  time = "time",
  code = "code",
  oid = "oid",
  id = "id",
  markdown = "markdown",
  unsignedInt = "unsignedInt",
  positiveInt = "positiveInt",
  xhtml = "xhtml"
}

const PRIMITIVE_TYPES_SET = new Set(Object.keys(FHIRPrimitiveTypes));

export const generateDefinitions = (
  pattern: string,
  outputPath: string,
  version: string = "4.0.0"
) => {
  // tslint:disable-next-line:no-console
  console.log("Generating Definitions");

  const files = glob.sync(pattern);
  const structureDefinitions = files.map(fileName => loadFromFile(fileName));

  // Only define declarations for base resource and complex-type structure definitions
  const interfaceDeclarations = structureDefinitions
    .filter(
      ({ baseDefinition, kind, id, type }) =>
        kind === "complex-type" ||
        (kind === "resource" &&
          baseDefinition ===
            "http://hl7.org/fhir/StructureDefinition/DomainResource") ||
        type === "Resource"
    )
    .reduce((prev, curr) => {
      const newInterfaceDeclarations = createInterfaceDeclarationsFromStructureDefinition(
        curr
      );
      return [...prev, ...newInterfaceDeclarations];
    }, []);

  // tslint:disable-next-line:no-console
  console.log("Creating Project");

  const project = new Project({
    compilerOptions: { declaration: true, outDir: outputPath }
  });

  // tslint:disable-next-line:no-console
  console.log("Creating Source Files");

  project.createSourceFile(
    `${outputPath}/fhir-r4.ts`,
    {
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
    },
    { overwrite: true }
  );
  
  // tslint:disable-next-line:no-console
  console.log("Emitting File");

  project.emit({ emitOnlyDtsFiles: true });
  
  // tslint:disable-next-line:no-console
  console.log("File Generated: " + `${outputPath}/fhir.r4.ts`);

  return files;
};

const createInterfaceDeclarationsFromStructureDefinition = (
  structureDefinition: any
): InterfaceDeclarationStructure[] => {

  const { differential, kind, snapshot, type, id } = structureDefinition;

  const interfaces = interfacesFromSnapshot(snapshot);
  const isResource = kind === "resource";

  // tslint:disable-next-line:no-console
  console.log("Resource: " + id);

  return Object.keys(interfaces).map(interfaceName => {
    const { backbone, docs, elementDefinitions } = interfaces[interfaceName];

    return {
      docs: (docs || []).map((doc: any) => formatComment(doc)),
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
            docs: [formatComment(definition)],
            hasQuestionToken: !isRequired(elementDefinition),
            name: elementKey,
            type: propertyTypeName(elementDefinition)
          };
        })
      ]
    };
  });
};

const interfacesFromSnapshot = (snapshot: any) =>
  snapshot.element.reduce((interfaceDefinitions: any, curr: any, index: any) => {
    const { contentReference, definition, path, type } = curr;
    const isBaseElement = index === 0; // The first element in the snapshot array is the base element definition
    if (isBaseElement) {
      return {
        [path]: {
          backbone: false,
          docs: [formatComment(definition)]
        }
      };
    }

    // If contentReference inherit type from referenced
    const types = !contentReference
      ? type
      : [stringsToPascalCase(contentReference.slice(1).split("."))];

    const normalizedElementDefinitions = types.reduce(
      (accumPropDef: any, currType: any) => {
        const elName = elementName(curr, currType);
        return {
          ...accumPropDef,
          [elName]: { ...curr, type: [currType] },
          // If primitive type, add optional '_<name>' extension element
          ...(PRIMITIVE_TYPES_SET.has(currType.code)
            ? {
                [`_${elName}`]: {
                  ...curr,
                  definition: `Contains extension information for property '${elName}'.`,
                  min: 0,
                  type: [{ code: "Element" }]
                }
              }
            : {})
        };
      },
      {}
    );

    let updatedInterfaceDefinitions = {
      ...interfaceDefinitions,
      [parentName(curr)]: {
        ...interfaceDefinitions[parentName(curr)],
        elementDefinitions: {
          ...(interfaceDefinitions[parentName(curr)] || {}).elementDefinitions,
          ...normalizedElementDefinitions
        }
      }
    };

    if (isBackboneElement(curr)) {
      const backboneElementName = pathToPascalCase(path);
      updatedInterfaceDefinitions = {
        ...updatedInterfaceDefinitions,
        [backboneElementName]: {
          ...updatedInterfaceDefinitions[backboneElementName],
          backbone: true,
          docs: [formatComment(definition)]
        }
      };
    }
    return updatedInterfaceDefinitions;
  }, {});
