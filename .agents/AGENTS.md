# Vivaldi Dynamic Island Project Rules

<RULE[dynamic-island]>

## Project Context
This project compiles a single codebase into two platforms: a Vivaldi Web Panel mod and a standard Chrome Extension. 
Because of this complex architecture, seemingly simple fixes can easily cause regressions on the other platform.

## MANDATORY INSTRUCTIONS
1. **Always read `DEVELOPER_NOTES.md` before making ANY changes to the codebase.** This file contains critical architectural constraints, historical bugs (e.g., the `world: 'MAIN'` catastrophe), and exact payload signatures that you must not violate.
2. **Never change the `sendAction` signature in `chrome-ext.js`.** It must remain `(action, value)`. The compiler (`build.js`) handles adapting `ui.js`'s `(tabId, action, value)` signature automatically.
3. **Never use `world: 'MAIN'` in `execInTab`.** It breaks Manifest V3 strict sandboxing and will silently freeze the extension.
4. **Always use native DOM methods for precise timing.** Rely on `el.currentTime` for media syncing; never parse the UI text strings, as they truncate milliseconds and cause lyrics lag.
5. **Always verify cross-platform impact.** Remember that `opts.isVivaldi` splits logic between the Web Panel and the Chrome Extension. 

</RULE[dynamic-island]>
