# TypeScript To C++98 Bridge

Use this table as a compact intuition map. Do not treat it as exact language equivalence.

| TypeScript | C++98 intuition | Reading hint in OpenCode |
| --- | --- | --- |
| `import` / `export` | Header/source symbol dependency plus linker-visible API list | Follow imports first to identify ownership and module boundaries. |
| `const` | Local variable whose binding cannot be reassigned | Object contents may still mutate; check whether methods modify nested state. |
| `let` | Block-scoped mutable local | Look for reassignment and state transitions. |
| `var` | Older function-scoped local | Rare in modern code; be careful about hoisting. |
| object literal | Small struct plus inline initialization | Treat keys as fields or function-table entries. |
| array | Dynamic array similar to `std::vector` | Read `map/filter/flatMap` as loops producing new arrays. |
| destructuring | Field extraction shorthand | Mentally rewrite to `tmp.field` reads if it hides context. |
| function declaration | Named free function | Start by checking parameters, return path, and call sites. |
| arrow function | Inline callback object; C++11 lambda is the closest small analogy | Usually passed into event handlers, array operations, or Effect chains. |
| optional parameter | Argument may be absent and become `undefined` | Check defaulting and guard branches. |
| default parameter | Callee fills missing argument | Mentally add `if arg missing then arg = default`. |
| `undefined` | Missing/uninitialized JS value | Often means not provided or not found. |
| `null` | Explicit empty object/reference marker | Often means intentionally no object. |
| `type` | Compile-time alias | Usually erased at runtime; do not look for generated JS object. |
| `interface` | Compile-time structural contract | Also erased at runtime; runtime checks must be separate code. |
| `A | B` | Tagged/branching input shape | Find discriminant fields, `if`, `switch`, or schema decoding. |
| `<T>` | Template-like type parameter | Usually compile-time only; look at actual call sites for concrete types. |
| `async` / `await` | State machine with suspension points | Read awaits as scheduler handoff and later resume. |

Minimal example pattern:

```ts
async function loadConfig(path: string, fallback?: string) {
  const text = await Bun.file(path).text()
  return text || fallback || ""
}
```

C++98-style pseudocode:

```cpp
struct LoadConfigState {
    std::string path;
    std::string fallback;
    int step;
    std::string text;
};

// Runtime calls this again when file I/O completes.
void ResumeLoadConfig(LoadConfigState* s) {
    if (s->step == 0) {
        s->step = 1;
        StartAsyncReadFile(s->path, s);
        return;
    }

    if (s->text.size() != 0) Complete(s->text);
    else if (s->fallback.size() != 0) Complete(s->fallback);
    else Complete("");
}
```

Reading rule: TypeScript often hides boilerplate that a C++98 codebase would make explicit with structs, callback lists, enum states, and scheduler calls. When confused, rewrite the code mentally into those pieces.
