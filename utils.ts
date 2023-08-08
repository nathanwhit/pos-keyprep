import parse from "json-bigint/lib/parse.js";
import stringify from "json-bigint/lib/stringify.js";
import * as YAML from "std/yaml/mod.ts";
import { z } from "zod/mod.ts";

export const JSONbig = {
  parse: parse({ useNativeBigInt: true }),
  stringify: stringify.stringify,
};

export function log(message: string, color = "blue") {
  console.log(`%c${message}`, `color: ${color}`);
}

export function error(message: string) {
  console.error(`%c${message}`, `color: red`);
}

export function nameCase(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export async function makeDir(dir: string, recursive = true) {
  try {
    await Deno.mkdir(dir, { recursive });
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
  }
}

// convert 1e+X (e.g 1e+21) to literal
export function convertExponentials(data: string): string {
  const converted = data.replace(/e\+[0-9]+/gi, function (exp) {
    const e = parseInt(exp.split("+")[1], 10);
    return "0".repeat(e);
  });
  return converted;
}

export async function parseYaml<T extends z.ZodTypeAny>(
  path: string,
  schema: T
): Promise<z.infer<T>> {
  const contents = await Deno.readFile(path);
  const decoder = new TextDecoder("utf-8");
  const decoded = decoder.decode(contents);
  const parsed = YAML.parse(decoded);
  const result = schema.safeParse(parsed);
  if (result.success) {
    return result.data;
  } else {
    throw new Error(`Invalid YAML config: ${result.error}`);
  }
}

export function removeAttrFromObject<O extends object, A extends keyof O>(
  object: O,
  attr: A
): Omit<O, A> {
  const newObject = { ...object };

  if (attr in newObject) {
    delete newObject[attr];
  }

  return newObject;
}
