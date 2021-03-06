import { readFileSync } from "fs";
import * as Path from "path";

/**
 * Helper methods
 */

const capitalize = (str: string) =>
  str.length > 0 ? `${str.charAt(0).toUpperCase()}${str.slice(1)}` : "";

export const stringsToPascalCase = (strs: string[]) => {
  return strs.reduce((accum, curr) => {
    return `${accum}${capitalize(curr)}`;
  }, "");
};

export const stringsToCamelCase = (strs: string[]) => {
  return strs.reduce((accum, curr, index) => {
    return index > 0
      ? `${accum}${capitalize(curr)}`
      : `${accum}${curr.toLowerCase()}`;
  }, "");
};

export const convertToPascalCase = (s: string) => {
  return s
    .split(".")
    .reduce(
      (prev, cur) => `${prev}${cur.charAt(0).toUpperCase() + cur.slice(1)}`,
      ""
    );
};

export const convertToCamelCase = (s: string) => {
  // If all caps just return the same string
  if (s === s.toUpperCase()) {
    return s;
  }

  s = s
    .replace(
      /(?:^\w|[A-Z]|\b\w)/g,
      (ltr, idx) => (idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase())
    )
    .replace(/\s+/g, "");
  s = s.replace(/_/g, "");
  s = s.replace(/-/g, "");
  return s;
};

/**
 * Formats ElementDefinition path to camel case
 */
export const pathToCamelCase = (path: string) =>
  stringsToCamelCase(path.split("."));

/**
 * Formats ElementDefinition path to pascal case
 */
export const pathToPascalCase = (path: string) =>
  stringsToPascalCase(path.split("."));

export const loadFromFile = (pathString: string): any => {
  // tslint:disable-next-line:no-console
  console.log(pathString);

  const path: string = Path.join(__dirname, "..", pathString);

  return JSON.parse((readFileSync(
    path
  ) as any) as string)
};

/**
 * Parses the parent element name from the ElementDefinition path
 */
export const parentName = ({ path }: any) =>
  stringsToPascalCase(path.split(".").slice(0, -1));

/**
 * Parses the element name from the ElementDefinition path and a given type
 */
export const elementName = (elementDefinition: any, type: any) => {
  const { path } = elementDefinition;
  if (path.split(".").length === 1) {
    return "";
  }
  const [elName] = path.split(".").slice(-1);
  return isChoiceType(elementDefinition)
    ? stringsToCamelCase([elName.substring(0, elName.length - 3), type.code])
    : elName;
};

/**
 * Whether an Element Definition is defining a BackboneElement
 */
export const isBackboneElement = ({ type }: any) =>
  !!type && type.some((t: any) => t.code === "BackboneElement");

/**
 * Whether an Element Definition is defining a Choice Type
 * https://www.hl7.org/fhir/formats.html#choice
 */
export const isChoiceType = ({ path }: any) => !!path && path.substr(-3) === "[x]";

/**
 * Whether an Element Definition is required
 */
export const isRequired = ({ min }: any) => min > 0;

/**
 * Whether an Element Definition is a list
 */
const isArray = ({ max }: any) =>
  max === "*" || (!isNaN(parseInt(max, 10)) && parseInt(max, 10) > 1);

/**
 * Format a TS property type name from an Element Definition
 */
export const propertyTypeName = (elementDefinition: any) => {
  const { contentReference, path, type } = elementDefinition;
  return (!contentReference
    ? type.map(
        (t: any) => `${t.code === "BackboneElement" ? pathToPascalCase(path) : t.code}`
      )
    : [stringsToPascalCase(contentReference.slice(1).split("."))]
  )
    .map((name: any) => `${name}${isArray(elementDefinition) ? "[]" : ""}`)
    .join(" | ");
};

/**
 * Removes all line breaks from string
 */
export const formatComment = (comment: string) =>
  comment.replace(/\r?\n|\r/g, "");
