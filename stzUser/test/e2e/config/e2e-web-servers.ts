import { spawnSync } from 'node:child_process';
import type { PlaywrightTestConfig } from '@playwright/test';

type WebServerConfig = NonNullable<PlaywrightTestConfig['webServer']>;

type CreateE2eWebServersOptions = {
  rootDir: string;
  env: Record<string, string>;
};

const externalTools = [
  {
    command: 'turso',
    versionArgs: ['--version'],
    installCommand: 'brew install tursodatabase/tap/turso',
  },
  {
    command: 'mailpit',
    // `mailpit version` also checks GitHub for updates and can exit nonzero when
    // that unrelated network response fails. Availability must be local-only.
    versionArgs: ['--help'],
    installCommand: 'brew install mailpit',
  },
] as const;

/** Fail before Playwright starts any service when a system dependency is absent. */
export function assertE2eToolsInstalled(): void {
  for (const tool of externalTools) {
    const probe = spawnSync(tool.command, tool.versionArgs, {
      stdio: 'ignore',
      timeout: 1_000,
    });

    if (probe.error || probe.status !== 0) {
      throw new Error(
        `Missing E2E tool: ${tool.command}. Install it with: ${tool.installCommand}`,
      );
    }
  }
}

/** The shared built-app E2E topology, owned and torn down by Playwright. */
export function createE2eWebServers({
  rootDir,
  env,
}: CreateE2eWebServersOptions): WebServerConfig {
  return [
    {
      name: 'turso',
      command: 'turso dev --port 8081',
      cwd: rootDir,
      url: 'http://127.0.0.1:8081/health',
      reuseExistingServer: false,
      stdout: 'ignore',
    },
    {
      name: 'mailpit',
      command: 'mailpit --quiet --listen 127.0.0.1:8025 --smtp 127.0.0.1:1025',
      cwd: rootDir,
      url: 'http://127.0.0.1:8025/api/v1/info',
      reuseExistingServer: true,
      stdout: 'ignore',
    },
    {
      name: 'built app',
      command: 'pnpm build:e2e && pnpm serve:built',
      cwd: rootDir,
      env,
      url: 'http://localhost:3019/api/test-env',
      reuseExistingServer: false,
      stdout: 'ignore',
      timeout: 120_000,
    },
  ];
}
