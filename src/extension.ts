import {
  languages,
  tasks,
  commands,
  window,
  ExtensionContext,
  DocumentFilter,
  TextDocument,
  OutputChannel,
  workspace,
  Position,
  env,
  Uri,
  ViewColumn
} from 'vscode';

import axios from 'axios';
import { ImplementationGuideDependsOn } from 'fsh-sushi/dist/fhirtypes';
import { readJSONorXML } from 'gofsh/dist/utils';
import { fshToFhir } from 'fsh-sushi/dist/run';
import { fhirToFsh } from 'gofsh/dist/api';
import { FshDefinitionProvider } from './FshDefinitionProvider';
import { FshCompletionProvider } from './FshCompletionProvider';
import {
  FshConversionProvider,
  createFSHURIfromFileUri,
  createJSONURIfromFileUri
} from './FshConversionProvider';
import { SushiBuildTaskProvider } from './SushiBuildTaskProvider';

let fhirFSH: OutputChannel;
let fshConversionProvider: FshConversionProvider;

const FSH_MODE: DocumentFilter = { language: 'fsh', scheme: 'file' };
// For FSH entity names and keywords, show the user FSH documentation.
// Extension has an unusual key pair in order to differentiate between cases
// where it is used as a FSH entity and where it is used as a type.
export const SPECIAL_URLS = new Map<string, Uri>([
  ['alias', Uri.parse('https://hl7.org/fhir/uv/shorthand/reference.html#defining-aliases', true)],
  [
    'profile',
    Uri.parse('https://hl7.org/fhir/uv/shorthand/reference.html#defining-profiles', true)
  ],
  [
    'extension:',
    Uri.parse('https://hl7.org/fhir/uv/shorthand/reference.html#defining-extensions', true)
  ],
  [
    'invariant',
    Uri.parse('https://hl7.org/fhir/uv/shorthand/reference.html#defining-invariants', true)
  ],
  [
    'instance',
    Uri.parse('https://hl7.org/fhir/uv/shorthand/reference.html#defining-instances', true)
  ],
  [
    'valueset',
    Uri.parse('https://hl7.org/fhir/uv/shorthand/reference.html#defining-value-sets', true)
  ],
  [
    'codesystem',
    Uri.parse('https://hl7.org/fhir/uv/shorthand/reference.html#defining-code-systems', true)
  ],
  [
    'ruleset',
    Uri.parse('https://hl7.org/fhir/uv/shorthand/reference.html#defining-rule-sets', true)
  ],
  [
    'mapping',
    Uri.parse('https://hl7.org/fhir/uv/shorthand/reference.html#defining-mappings', true)
  ],
  [
    'logical',
    Uri.parse('https://hl7.org/fhir/uv/shorthand/reference.html#defining-logical-models', true)
  ],
  [
    'resource',
    Uri.parse('https://hl7.org/fhir/uv/shorthand/reference.html#defining-resources', true)
  ],
  ['from', Uri.parse('https://hl7.org/fhir/uv/shorthand/reference.html#binding-rules', true)],
  ['obeys', Uri.parse('https://hl7.org/fhir/uv/shorthand/reference.html#obeys-rules', true)],
  ['only', Uri.parse('https://hl7.org/fhir/uv/shorthand/reference.html#type-rules', true)],
  [
    'contains',
    Uri.parse(
      'https://hl7.org/fhir/uv/shorthand/reference.html#contains-rules-for-extensions',
      true
    )
  ]
]);

// Documentation URLs are based on the FHIR version supplied in the project configuration.
// http://hl7.org/fhir/directory.html provides the list of FHIR versions with available documentation.
// SUSHI only supports versions 4.0.1 and later, so only those are supported here.
export const DOCUMENTATION_VERSION_PATHS = new Map<string, string>([
  ['4.0.1', '/R4'],
  ['4.1.0', '/2021Mar'],
  ['4.3.0-snapshot1', '/4.3.0-snapshot1'],
  ['4.3.0', '/R4B'],
  ['4.2.0', '/2020Feb'],
  ['4.4.0', '/2020May'],
  ['4.5.0', '/2020Sep'],
  ['4.6.0', '/2021May'],
  ['5.0.0-snapshot1', '/5.0.0-snapshot1'],
  ['5.0.0-ballot', '/2022Sep'],
  ['5.0.0-snapshot3', '/5.0.0-snapshot3'],
  ['5.0.0-draft-final', '/5.0.0-draft-final'],
  ['5.0.0', '/R5']
]);

export function activate(context: ExtensionContext): {
  definitionProviderInstance: FshDefinitionProvider;
  completionProviderInstance: FshCompletionProvider;
} {
  const definitionProviderInstance = new FshDefinitionProvider();
  const completionProviderInstance = new FshCompletionProvider(definitionProviderInstance);
  fshConversionProvider = new FshConversionProvider();

  context.subscriptions.push(
    languages.registerDefinitionProvider(FSH_MODE, definitionProviderInstance),
    languages.registerCompletionItemProvider(FSH_MODE, completionProviderInstance, '.'),
    workspace.registerTextDocumentContentProvider(
      FshConversionProvider.fshConversionProviderScheme,
      fshConversionProvider
    )
  );

  fhirFSH = window.createOutputChannel('FHIR <=> FSH');

  commands.registerCommand('extension.openFhir', () =>
    openFhirDocumentation(completionProviderInstance)
  );

  commands.registerCommand('extension.fshToFHIRjson', async (...file) =>
    conversionFSHtoFHIR(...file)
  );

  commands.registerCommand('extension.FHIRtoFSH', async (...file) => conversionFHIRtoFSH(...file));

  completionProviderInstance.updateFhirEntities();
  tasks.registerTaskProvider('fsh', new SushiBuildTaskProvider());
  return { definitionProviderInstance, completionProviderInstance };
}

export function deactivate() {
  fhirFSH.dispose();
}

export async function conversionFSHtoFHIR(...file: any[]): Promise<void> {
  fhirFSH.clear();
  const fileUri: Uri = file[0];

  const fhirVersion = workspace.getConfiguration('vscode-fsh').get('FHIRVersion') as string;
  const dependencies = workspace.getConfiguration('vscode-fsh').get('Dependencies') as string[];

  const fshtoFHIRDependencies: ImplementationGuideDependsOn[] = [];

  dependencies.forEach(dependency => {
    const newDependency: ImplementationGuideDependsOn = {
      packageId: dependency.split('@')[0],
      version: dependency.split('@')[1]
    };
    fshtoFHIRDependencies.push(newDependency);
  });

  const dependenciesParameter =
    fshtoFHIRDependencies.length === 0 ? undefined : fshtoFHIRDependencies;

  workspace.fs.readFile(file[0]).then(bytes => {
    const fileText = new TextDecoder().decode(bytes);

    fshToFhir(fileText, { fhirVersion: fhirVersion, dependencies: dependenciesParameter }).then(
      result => {
        result.errors.forEach(error => {
          fhirFSH.appendLine('Error: ' + error.message);
        });

        result.warnings.forEach(warning => {
          fhirFSH.appendLine('Warning: ' + warning.message);
        });

        fhirFSH.appendLine('Finished!');

        const uri = createJSONURIfromFileUri(fileUri);
        const formattedText = JSON.stringify(JSON.parse(JSON.stringify(result.fhir[0])), null, 2);
        fshConversionProvider.updated(formattedText, uri);

        workspace.openTextDocument(uri).then(doc => {
          window.showTextDocument(doc, { preview: false, viewColumn: ViewColumn.Active });
        });
      }
    );
  });

  fhirFSH.show();
}

export async function conversionFHIRtoFSH(...file: any[]): Promise<void> {
  fhirFSH.clear();

  const dependencies = workspace.getConfiguration('vscode-fsh').get('Dependencies') as string[];
  const dependenciesParameter = dependencies.length === 0 ? undefined : dependencies;

  const fileUri: Uri = file[0];
  const fhirObjects = readJSONorXML(fileUri.path);

  const myArray: any[] = [];
  myArray.push(fhirObjects.content);

  fhirToFsh(myArray, { style: 'string', indent: true, dependencies: dependenciesParameter }).then(
    result => {
      result.errors.forEach(error => {
        fhirFSH.appendLine('Error: ' + error.message);
      });

      result.warnings.forEach(warning => {
        fhirFSH.appendLine('Warning: ' + warning.message);
      });

      fhirFSH.appendLine('Finished!');

      const uri = createFSHURIfromFileUri(fileUri);
      fshConversionProvider.updated(result.fsh as string, uri);

      workspace.openTextDocument(uri).then(doc => {
        window.showTextDocument(doc, { preview: false, viewColumn: ViewColumn.Active });
      });
    }
  );

  fhirFSH.show();
}

export async function openFhirDocumentation(
  completionProviderInstance: FshCompletionProvider
): Promise<void> {
  const document = window.activeTextEditor.document;
  const startPosition = window.activeTextEditor.selection.start;
  if (document && startPosition) {
    const name = getFhirDocumentationName(document, startPosition);
    const uriToOpen = getDocumentationUri(name, completionProviderInstance.fhirVersion);
    if (await isDocumentationUriValid(uriToOpen.toString())) {
      env.openExternal(uriToOpen);
    } else {
      window.showInformationMessage(`No FHIR documentation for ${name}`);
    }
  }
}

export function getFhirDocumentationName(document: TextDocument, position: Position): string {
  // slightly modified form of the FHIR regular expression for name
  // FHIR wants the first character to be a capital letter, but we don't require that
  // The special case for Extension is to let us differentiate between cases where it is
  // used as a FSH entity and where it is used as a FHIR type.
  return document
    .getText(document.getWordRangeAtPosition(position, /Extension\s*:|\w{1,255}/))
    .replace(/\s/, ''); // If we matched the Extension special case, remove any spaces between Extension and :
}

export function getDocumentationUri(name: string, version: string): Uri {
  const versionPath = DOCUMENTATION_VERSION_PATHS.has(version)
    ? DOCUMENTATION_VERSION_PATHS.get(version)
    : '';
  const lowerName = name.toLowerCase();
  if (lowerName === 'extension') {
    return Uri.parse(`https://hl7.org/fhir${versionPath}/extensibility.html`, true);
  } else if (SPECIAL_URLS.has(lowerName)) {
    return SPECIAL_URLS.get(lowerName);
  } else {
    return Uri.parse(`https://hl7.org/fhir${versionPath}/${lowerName}.html`, true);
  }
}

export async function isDocumentationUriValid(uriToOpen: string): Promise<boolean> {
  try {
    await axios.head(uriToOpen, { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}
