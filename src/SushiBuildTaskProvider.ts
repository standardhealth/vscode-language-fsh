import { Task, TaskGroup, TaskProvider, TaskScope, ShellExecution } from 'vscode';

export class SushiBuildTaskProvider implements TaskProvider {
  constructor() {}

  // Now provides a fhir validate task along side sushi
  provideTasks(): Task[] | undefined {
    const sushiBuildTask = getSushiBuildTask();
    const fhirValidateTask = getFHIRValidateTask();
    const tasks = [sushiBuildTask, fhirValidateTask];
    return tasks;
  }

  resolveTask(_task: Task): Task | undefined {
    const task = _task.definition.task;
    if (task) {
      const sushiBuildTask = getSushiBuildTask();
      return sushiBuildTask;
    }
    return undefined;
  }
}

export function getSushiBuildTask(): Task {
  const sushiBuildTask = new Task(
    { type: 'fsh', task: 'Build SUSHI' },
    TaskScope.Workspace,
    'sushi', // name
    'fsh',
    new ShellExecution('sushi', ['${workspaceFolder}'], { shellQuoting: { strong: '"' } }),
    '$sushi' // problemMatcher
  );
  sushiBuildTask.presentationOptions = {
    clear: true
  };
  sushiBuildTask.group = TaskGroup.Build;
  return sushiBuildTask;
}

export function getFHIRValidateTask(): Task {
  const fhirValidateTask = new Task(
    { type: 'fsh', task: 'Validate FHIR' },
    TaskScope.Workspace, // scope
    'fhirValidator', // name
    'fsh', // source
    new ShellExecution(
      'java',
      [
        '-jar',
        '${workspaceFolder}/input-cache/validator_cli.jar',
        '${workspaceFolder}/fsh-generated/resources',
        '-version',
        '4.0',
        '-output-style',
        'eslint-compact'
      ],
      { shellQuoting: { strong: '"' } }
    ),
    '$fhirValidator' // problemMatcher
  );
  fhirValidateTask.presentationOptions = {
    clear: true
  };
  fhirValidateTask.group = TaskGroup.Build;
  return fhirValidateTask;
}
