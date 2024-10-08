import { Uri, TextDocumentContentProvider, EventEmitter } from 'vscode';
import { basename } from 'path';

export class FshConversionProvider implements TextDocumentContentProvider {
  static readonly fshConversionProviderScheme = 'fshfhirconversion';
  private content: string = '';

  private onDidChangeEmitter = new EventEmitter<Uri>();
  onDidChange = this.onDidChangeEmitter.event;

  updated(newContent: string, newUri: Uri): void {
    this.content = newContent;

    this.onDidChangeEmitter.fire(newUri);
  }

  provideTextDocumentContent(): string {
    return this.content;
  }
}

export function createFSHURIfromFileUri(fileUri: Uri): Uri {
  return createURIfromFileUri(fileUri, '.fsh');
}

export function createJSONURIfromFileUri(fileUri: Uri): Uri {
  return createURIfromFileUri(fileUri, '.json');
}

function createURIfromFileUri(fileUri: Uri, extension: string): Uri {
  //Get the file name without the extension
  let fileName = basename(fileUri.path);
  fileName = fileName.split('.').slice(0, -1).join('.');

  return Uri.parse(
    FshConversionProvider.fshConversionProviderScheme + ': (PREVIEW)' + fileName + extension
  );
}
