import { JsonHigh } from "https://deno.land/x/jsonhilo@v0.3.2/JsonHigh.js";

enum StateKind {
  Start,
  InArray,
  InObject,
}

class StopNow extends Error {}

type StreamState =
  | {
      kind: StateKind.InObject;
      currentKey?: string;
      needsComma: boolean;
    }
  | {
      kind: StateKind.InArray;
      needsComma: boolean;
    };

class StreamStateStack {
  private stack: StreamState[] = [];

  constructor() {}

  push(state: StreamState) {
    this.stack.push(state);
  }

  get needsComma() {
    if (this.stack.length === 0) {
      return false;
    }
    return this.stack[this.stack.length - 1].needsComma;
  }

  set needsComma(value: boolean) {
    if (this.stack.length === 0) {
      throw new Error("Invalid state");
    }
    this.stack[this.stack.length - 1].needsComma = value;
  }

  enterObject() {
    this.stack.push({
      kind: StateKind.InObject,
      needsComma: false,
      currentKey: undefined,
    });
  }

  enterArray() {
    this.stack.push({
      kind: StateKind.InArray,
      needsComma: false,
    });
  }

  top() {
    if (this.stack.length === 0) {
      throw new Error("Invalid state");
    }
    return this.stack[this.stack.length - 1];
  }

  pop() {
    return this.stack.pop();
  }

  peek() {
    return this.stack[this.stack.length - 1];
  }
}

// deno-lint-ignore no-explicit-any
type JsonAny = any;

export async function pluckValues(
  path: string,
  want: Record<string, JsonAny | undefined>
) {
  const file = await Deno.open(path, { read: true });
  const decoder = new TextDecoder("utf-8");
  const stack = new StreamStateStack();
  const maybeStop = () => {
    if (Object.values(want).every((v) => v !== undefined)) {
      throw new StopNow();
    }
  };
  const stream = JsonHigh({
    openArray: () => {
      stack.enterArray();
    },
    openObject: () => {
      stack.enterObject();
    },
    closeArray: () => {
      stack.pop();
    },
    closeObject: () => {
      stack.pop();
    },
    key: (key: string) => {
      const current = stack.top();
      if (current.kind === StateKind.InObject) {
        current.currentKey = key;
      }
    },
    value: (value: JsonAny) => {
      const current = stack.top();
      if (current.kind === StateKind.InObject) {
        if (current.currentKey !== undefined) {
          if (current.currentKey in want) {
            want[current.currentKey] = value;
            maybeStop();
          }
          current.currentKey = undefined;
        }
      }
    },
  });

  try {
    for await (const bytes of file.readable) {
      const chunk = decoder.decode(bytes);
      stream.chunk(chunk);
    }
  } catch (e) {
    if (e instanceof StopNow) {
      return;
    }
    throw e;
  }
}

// async function writeBigJson(
//   from: string,
//   to: string,
//   write: [string, any][],
//   beforeKey: string
// ) {
//   const file = await Deno.open(from, { read: true });
//   const toFile = await Deno.open(to, { write: true, create: true });
//   const writer = toFile.writable.getWriter();
//   const stack = new StreamStateStack();
//   const encoder = new TextEncoder();

//   const writeOut = (data: string) => {
//     writer.write(encoder.encode(data));
//   };
//   const writeComma = () => {
//     if (stack.needsComma) {
//       writeOut(",");
//     }
//     stack.needsComma = true;
//   };
//   const handleValue = (value: any) => {
//     const current = stack.top();
//     switch (current.kind) {
//       case StateKind.InArray:
//         writeComma();
//         writeOut(JSON.stringify(value));
//         break;
//       case StateKind.InObject:
//         writeOut(JSON.stringify(value));
//         current.currentKey = undefined;
//         break;
//     }
//   };
//   const stream = JsonHigh({
//     openArray: () => {
//       stack.enterArray();
//       writeOut("[");
//     },
//     closeArray: () => {
//       stack.pop();
//       writeOut("]");
//     },
//     openObject: () => {
//       stack.enterObject();
//       writeOut("{");
//     },
//     closeObject: () => {
//       stack.pop();
//       writeOut("}");
//     },
//     key: (key: string) => {
//       const current = stack.top();
//       if (current.kind === StateKind.InObject) {
//         current.currentKey = key;
//       }
//       if (key === beforeKey) {
//         for (const [k, v] of write) {
//           writeComma();
//           writeOut(JSON.stringify(k));
//           writeOut(":");
//           writeOut(JSON.stringify(v));
//         }
//       }
//       writeComma();
//       writeOut(JSON.stringify(key));
//       writeOut(":");
//     },
//     value: (value: any) => {
//       handleValue(value);
//     },
//   });

//   const decoder = new TextDecoder();
//   for await (const bytes of file.readable) {
//     const chunk = decoder.decode(bytes);
//     stream.chunk(chunk);
//   }

//   await writer.close();
// }
