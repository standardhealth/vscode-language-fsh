# FSH Language Support for VS Code

A language support extension for the FHIR Shorthand (FSH) language.

## How to Download

In Visual Studio Code, go to the VS Code Extension Marketplace and download the
`vscode-language-fsh` extension. Once activated, this extension's features should
be automatically implemented.

## Language Features

### Syntax Highlighting

![FSH Syntax](images/docs/fsh-syntax.jpg)

FSH files automatically have syntax highlighting applied. This allows for easier reading and writing of FHIR Shorthand.

## Snippets

![FSH Snippets](images/docs/fsh-snippets.gif)

FSH Snippets make creating new FSH items a breeze! Snippets automatically add relevant keywords and placeholders so you can easily
enter all of the recommended metadata for a FSH definition. Snippets will even auto-create your `Id` and `Title` for you based on the
name.

To use snippets, type one of the trigger phrases, hit the &lt;TAB&gt; or &lt;ENTER&gt; key, type in the first field value, and hit
the &lt;TAB&gt; key to move to the next placeholder. All FSH snippets always stop at the first rule in the definition.

| Trigger | FSH Item   | Keywords                                                        |
| ------- | ---------- | --------------------------------------------------------------- |
| `pro`   | Profile    | Profile, Parent, Id (auto), Title (auto), Description           |
| `ext`   | Extension  | Extension, Id (auto), Title (auto), Description                 |
| `log`   | Logical    | Logical, Parent, Id (auto), Title (auto), Description           |
| `res`   | Resource   | Resource, Parent (choice), Id (auto), Title (auto), Description |
| `vs`    | ValueSet   | ValueSet, Id (auto), Title (auto), Description                  |
| `cs`    | CodeSystem | CodeSystem, Id (auto), Title (auto), Description                |
| `inst`  | Instance   | Instance, InstanceOf, Usage (choice), Title (auto), Description |
| `inv`   | Invariant  | Invariant, Description, Expression, Severity (choice), XPath    |
| `map`   | Mapping    | Mapping, Source, Target, Id, Title (auto), Description          |
| `rs `   | RuleSet    | RuleSet                                                         |

Additionally, a snippet is provided to help when writing slicing rules. When the start of the phrase `^slicing` is detected, a block of rules can be inserted for the paths commonly set when defining slicing on an element.

## Enhanced Autocomplete

FSH entity definitions have their names provided as autocomplete results in contextually appropriate scenarios.

- After the `Parent` keyword, results will include `Profile`, `Extension`, `Logical`, and `Resource` names depending on the type of entity being defined.
- After the `InstanceOf` keyword, results will include `Profile`, `Extension`, and `Resource` names.
- When writing an `obeys` rule, results will include `Invariant` names.

When writing rules that apply to an element, element paths will be suggested. This feature is still undergoing development, so there are some known limitations to this feature:

- Completion items are only provided for rules on a `Profile`, `Extension`, `Logical`, `Resource`, or `Instance`.
- Slice names are not included as part of completion items.
- Completion items are not provided for indented rules.
- If a type is removed from a choice element with an `only` rule, completion items will still be offered for the removed types.
- Elements added to a `Logical` or `Resource` by a FSH rule will not be available as completion items for other rules.
- Only the main element path will have completion items provided. A caret rule will not have completion items provided for the caret path.

## Go to Definition

![FSH Go to Definition](images/docs/fsh-go-to-definition.gif)

FSH entity definitions within your workspace can be found from anywhere their name is used. To go to the entity definition, right-click on the entity name and select "Go to Definition" from the context menu. Or, you can press &lt;F12&gt; when your text cursor is on the entity name.

## Open FHIR Documentation

![FSH Go to Definition](images/docs/fsh-open-fhir-documentation.gif)

Documentation pages can be opened directly from your FSH files. Right-click on the name of any FHIR resource or FSH keyword, and select "Open FHIR Documentation" from the context menu.

## Tasks

The extension provides two custom tasks, one to run SUSHI on the current workspace, the other to run the FHIR validator on the FSH generated resources.

### Run SUSHI
![FSH Run SUSHI Task](images/docs/fsh-run-sushi-task.gif)

The extension provides a custom task for running SUSHI on the current workspace. The task will run SUSHI on the workspace, log messages to VS Code's integrated Terminal tab, report any errors or warnings in VS Code's Problems tab, and highlight errors and warnings inline in the FSH file. Selecting an error or warning from the Problems tab will open the file the error is in.

Note that after any errors or warnings are resolved in the FSH, SUSHI must be run through the task to resolve them in the Problems tab and inline in the FSH file.

To run the SUSHI Build task, use VS Code's Run Task feature. The "Run Task" feature can be accessed in the "Terminal" menu by clicking "Run Task...". When the menu opens in VS Code, select 'fsh' and then select 'sushi'. The task can also be run using the keyboard shortcut for running build tasks, which is ⇧⌘B on Mac and Ctrl+Shift+B on Windows.

Note that you must have SUSHI installed locally in order for the task to run successfully. See [SUSHI Installation instructions](https://fshschool.org/docs/sushi/installation/) for help installing.

### FHIR Validator

The extension provides a second custom task that runs the FHIR validator on the resources that have been generated by SUSHI. This task validates all files in `fsh-generated/resources`, logs messages to VS Code's integrated Terminal tab, reports any errors or warnings in VS Code's Problems tab, and highlights errors and warnings inline in the `.json` files. Selecting an error or warning from the Problems tab will open the file containing the error. Tracing the problem in the generated JSON file back to the original `.fsh` file is left as an exercise for the user.

Note that you must have `validator_cli.jar` installed locally in the `input-cache` directory.  You can get the latest release from the [HAPI FHIR Github Repository](https://github.com/hapifhir/org.hl7.fhir.core/releases).
## Compile and Run (for Developers)

- run `npm install` in this folder. This installs all necessary npm modules in both the
  client and server folder
- open VS Code on this folder.
- Switch to the Debug viewlet.
- Select `Extension` from the drop down.

## NPM Tasks

The following NPM tasks may be useful in development:

| Task                | Description                                                                             |
| ------------------- | --------------------------------------------------------------------------------------- |
| **build**           | compiles `src/**/*.ts` files to `out/**/*.js` files using the TypeScript compiler (tsc) |
| **build:watch**     | similar to _build_ but automatically builds when changes are detected in src files      |
| **lint**            | checks all src files to ensure they follow project code styles and rules                |
| **lint:fix**        | fixes lint errors when automatic fixes are available for them                           |
| **prettier**        | checks all src files to ensure they follow project formatting conventions               |
| **prettier:fix**    | fixes prettier errors by rewriting files using project formatting conventions           |
| **test**            | runs the test suite                                                                     |
| **check**           | runs all the checks performed as part of ci (lint, prettier, test)                      |

To run any of these tasks, use `npm run`. For example:

```sh
$ npm run build:watch
```

### Note about testing

The `test` task will often (but not always) produce an error if it is run while VSCode is open. If you receive this error, close VSCode and run the task from the command line.

## Updating the Grammar

The `src/lang/` directory contains the FSH lexer and parser. When the FSH grammar changes, the files in this directory will need to be updated. These files are generated in the [SUSHI](https://github.com/FHIR/sushi) project by running ANTLR on the grammar definition files. The files are then copied from the SUSHI project to this project.
The files to copy are:

- FSH.tokens
- FSHLexer.tokens
- FSHLexer.js
- FSHListener.js
- FSHParser.js
- FSHVisitor.js
