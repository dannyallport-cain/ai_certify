import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

type MenuAction = 'mobile' | 'webBuild' | 'expoGo' | 'git' | 'web' | 'exit';

const rl = createInterface({ input, output });

const projectRoot = process.cwd();
const mobileDir = path.join(projectRoot, 'mobile');
const mobileBuildScript = path.join('mobile', 'build-and-install.sh');

function color(code: number, text: string) {
  return `\u001b[${code}m${text}\u001b[0m`;
}

function info(message: string) {
  console.log(color(36, `ℹ ${message}`));
}

function success(message: string) {
  console.log(color(32, `✓ ${message}`));
}

function warning(message: string) {
  console.log(color(33, `⚠ ${message}`));
}

function error(message: string) {
  console.error(color(31, `✖ ${message}`));
}

function printMenu() {
  console.log('');
  console.log(color(1, 'AI Certify CLI Menu'));
  console.log('1) Build and deploy mobile app to local iPhone');
  console.log('2) Rebuild web app locally');
  console.log('3) Launch mobile app in Expo Go');
  console.log('4) Commit and push to git');
  console.log('5) Run web app locally');
  console.log('6) Exit');
  console.log('');
}

async function prompt(question: string) {
  return (await rl.question(question)).trim();
}

async function promptYesNo(question: string, defaultValue = false) {
  const suffix = defaultValue ? ' [Y/n] ' : ' [y/N] ';
  const answer = (await rl.question(`${question}${suffix}`)).trim().toLowerCase();

  if (!answer) {
    return defaultValue;
  }

  return answer === 'y' || answer === 'yes';
}

function runCommand(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    env?: Record<string, string | undefined>;
  } = {}
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      cwd: options.cwd ?? projectRoot,
      env: {
        ...process.env,
        ...options.env,
      },
    });

    child.on('error', reject);

    child.on('close', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}

async function runMobileBuildAndInstall(cleanPrebuild = false) {
  if (!existsSync(mobileDir)) {
    throw new Error('Expected mobile workspace at ./mobile but it was not found.');
  }

  console.log('');
  info(`This runs the existing mobile build script: ${mobileBuildScript}`);

  if (cleanPrebuild) {
    info('A clean Expo prebuild will run before building the iPhone app.');
  }

  const udid = await prompt('Optional iPhone UDID (press Enter to auto-detect): ');
  const developmentTeam = await prompt(
    'Optional Xcode development team ID (press Enter to use environment/default): '
  );

  const args = [mobileBuildScript];

  if (cleanPrebuild) {
    args.push('-p');
  }

  if (udid) {
    args.push('-d', udid);
  }

  if (developmentTeam) {
    args.push('-t', developmentTeam);
  }

  await runCommand('bash', args);

  success('Mobile build/install command completed.');
}

async function runWebAppRebuild() {
  console.log('');
  info('Rebuilding the web app with pnpm build.');
  info('Use Ctrl+C to stop the command if needed.');

  await runCommand('pnpm', ['build']);

  success('Web app rebuild completed.');
}

async function runMobileExpoGo() {
  if (!existsSync(mobileDir)) {
    throw new Error('Expected mobile workspace at ./mobile but it was not found.');
  }

  console.log('');
  info('Starting Expo Go mode for the mobile app.');
  info('This will launch the Expo dev server and show a QR code for Expo Go.');
  info('Use Ctrl+C to stop the server and return to your terminal.');

  await runCommand('pnpm', ['--dir', 'mobile', 'exec', 'expo', 'start', '--go']);

  success('Expo Go command completed.');
}

async function getCurrentBranch() {
  return new Promise<string>((resolve, reject) => {
    const child = spawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += String(chunk);
    });

    child.stderr.on('data', chunk => {
      stderr += String(chunk);
    });

    child.on('error', reject);

    child.on('close', code => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(new Error(stderr.trim() || 'Unable to determine current git branch.'));
    });
  });
}

async function runGitCommitAndPush() {
  console.log('');
  info('Reviewing current git status first.');
  await runCommand('git', ['status', '--short']);

  const message = await prompt('Commit message: ');
  if (!message) {
    warning('Commit message is required. Returning to menu.');
    return;
  }

  const currentBranch = await getCurrentBranch();
  const branchInput = await prompt(`Branch to push [${currentBranch}]: `);
  const branch = branchInput || currentBranch;

  const confirmed = await promptYesNo(
    `Stage all changes, commit with message "${message}", and push to origin/${branch}?`,
    false
  );

  if (!confirmed) {
    warning('Git commit/push cancelled.');
    return;
  }

  await runCommand('git', ['add', '-A']);
  await runCommand('git', ['commit', '-m', message]);
  await runCommand('git', ['push', 'origin', branch]);

  success(`Changes committed and pushed to origin/${branch}.`);
}

async function runWebAppLocally() {
  console.log('');
  info('Starting the existing web app dev server: pnpm dev');
  info('Use Ctrl+C to stop the server and return to your terminal.');

  await runCommand('pnpm', ['dev']);

  success('Web app command completed.');
}

async function handleSelection(selection: string) {
  const actionMap: Record<string, MenuAction> = {
    '1': 'mobile',
    '2': 'webBuild',
    '3': 'expoGo',
    '4': 'git',
    '5': 'web',
    '6': 'exit',
  };

  const action = actionMap[selection];

  if (!action) {
    warning('Invalid selection. Choose 1, 2, 3, 4, 5, or 6.');
    return false;
  }

  if (action === 'exit') {
    return true;
  }

  try {
    if (action === 'mobile') {
      await runMobileBuildAndInstall(false);
    } else if (action === 'webBuild') {
      await runWebAppRebuild();
    } else if (action === 'expoGo') {
      await runMobileExpoGo();
    } else if (action === 'git') {
      await runGitCommitAndPush();
    } else if (action === 'web') {
      await runWebAppLocally();
    }
  } catch (err) {
    error(err instanceof Error ? err.message : 'Unknown error');
  }

  return false;
}

async function main() {
  console.log(color(35, '──────────────────────────────'));
  console.log(color(35, ' AI Certify command launcher '));
  console.log(color(35, '──────────────────────────────'));

  let shouldExit = false;

  while (!shouldExit) {
    printMenu();
    const selection = await prompt('Select an option: ');
    shouldExit = await handleSelection(selection);
  }

  console.log('');
  success('Exited CLI menu.');
  rl.close();
}

main().catch(err => {
  error(err instanceof Error ? err.message : 'Unknown fatal error');
  rl.close();
  process.exit(1);
});
