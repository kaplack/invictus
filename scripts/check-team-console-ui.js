import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '../prisma/client/index.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
const url = new URL(process.env.TEST_DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/invictus_test') throw new Error('Solo invictus_test local');
const db = new PrismaClient({
  datasources: {
    db: {
      url: url.href
    }
  }
});
const origin = 'http://localhost:5174';
const app = await createApp({
  database: db,
  Prisma,
  config: readConfig({
    ...process.env,
    DATABASE_URL: url.href,
    NODE_ENV: 'test',
    STORAGE_DRIVER: 'local',
    WEB_ORIGINS: origin,
    UPLOAD_DIRECTORY: '.local/test-uploads'
  })
});
const server = app.listen(3101);
let vite, browser;
try {
  vite = await createServer({
    configFile: false,
    root: 'client',
    plugins: [react()],
    server: {
      host: 'localhost',
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': 'http://localhost:3101'
      }
    }
  });
  await vite.listen();
  browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({
      viewport: {
        width: 1440,
        height: 1000
      }
    }),
    page = await context.newPage(),
    errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const call = async (method, path, data) => {
    const r = await context.request[method](origin + '/api' + path, {
      headers: {
        Origin: origin
      },
      data
    });
    expect(r.ok(), await r.text()).toBeTruthy();
    return r.status() === 204 ? null : r.json();
  };
  await call('post', '/auth/register', {
    name: 'Lucía',
    lastName: 'Piloto',
    email: `console-${randomUUID()}@example.test`,
    password: 'Invictus-Test-2026!'
  });
  const team = await call('post', '/teams', {
    name: `Runners Lima ${randomUUID().slice(0, 6)}`,
    description: 'Entrenamos juntos y organizamos carreras.'
  });
  const second = await call('post', '/teams', {
    name: 'Invictus Club'
  });
  await page.goto(origin + '/#/mis-teams');
  await page.getByRole('heading', {
    name: 'Teams',
    exact: true
  }).waitFor();
  await page.locator('.team-card').filter({
    hasText: team.name
  }).getByRole('link', {
    name: 'Gestionar',
    exact: true
  }).click();
  await expect(page.locator('.site-header')).toHaveCount(0);
  await expect(page.getByRole('heading', {
    name: 'Hola, Lucía.', exact: true })).toBeVisible();
  await page.getByRole('link', {
    name: 'Configuración',
    exact: true
  }).click();
  await page.getByRole('link', { name: 'Acceso', exact: true }).click();
  await page.getByLabel('Modalidad de ingreso').selectOption('APPROVAL');
  await page.getByLabel('Mostrar en Explorar Teams').check();
  await page.getByRole('button', {
    name: 'Guardar acceso'
  }).click();
  await expect(page.getByLabel('Modalidad de ingreso')).toHaveValue('APPROVAL');
  await page.getByRole('link', {
    name: 'Comunicados',
    exact: false
  }).click();
  await expect(page.getByRole('heading', {
    name: 'Comunicados',
    exact: true
  })).toBeVisible();
  await page.locator('.workspace-desktop-tools .workspace-switcher-trigger').click();
  await page.locator('.workspace-desktop-tools .workspace-switcher-panel').getByRole('link', { name: second.name }).click();
  await expect(page.locator('.workspace-desktop-tools .workspace-switcher-trigger')).toContainText('Invictus Club');
  await page.locator('.workspace-desktop-tools .workspace-switcher-trigger').click();
  await page.locator('.workspace-desktop-tools .workspace-switcher-panel').getByRole('link', { name: team.name }).click();
  await expect(page.getByRole('heading', { name: 'Comunicados', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Eventos', exact: true }).click();
  await page.getByRole('button', {
    name: 'Crear evento +',
    exact: true
  }).click();
  await expect(page.locator('input[name="teamId"]')).toHaveValue(team.id);
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Configuración', exact: true }).click();
  await page.getByRole('link', { name: 'Métodos de cobro', exact: true }).click();
  await page.getByRole('heading', { name: 'Cuentas y medios disponibles', exact: true }).waitFor();
  await mkdir('.local/screenshots', {
    recursive: true
  });
  await page.screenshot({
    path: '.local/screenshots/team-console-desktop.png',
    fullPage: true
  });
  await page.setViewportSize({
    width: 390,
    height: 844
  });
  await page.getByRole('button', {
    name: 'Abrir menú del equipo'
  }).click();
  await page.getByRole('link', {
    name: 'Comunicados',
    exact: false
  }).click();
  await expect(page.getByRole('button', {
    name: 'Abrir menú del equipo'
  })).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({
    path: '.local/screenshots/team-console-mobile.png',
    fullPage: true
  });
  const other = await browser.newContext(),
    memberPage = await other.newPage();
  const signup = await other.request.post(origin + '/api/auth/register', {
    headers: {
      Origin: origin
    },
    data: {
      name: 'Mario',
      lastName: 'Prueba',
      email: `member-${randomUUID()}@example.test`,
      password: 'Invictus-Test-2026!'
    }
  });
  expect(signup.status()).toBe(201);
  await memberPage.goto(origin + '/#/mis-teams');
  await memberPage.getByRole('button', {
    name: 'Explorar',
    exact: true
  }).click();
  await memberPage.getByLabel('Buscar Team').fill(team.name);
  await memberPage.locator('.team-card').filter({
    hasText: team.name
  }).first().getByRole('button', {
    name: 'Solicitar ingreso'
  }).click();
  await expect(memberPage.getByText('Ingreso pendiente').first()).toBeVisible();
  const requests = await call('get', `/teams/${team.id}/requests`);
  await call('post', `/teams/${team.id}/admissions/${requests[0].id}`, {
    accept: true
  });
  await memberPage.goto(origin + `/#/mis-teams/${team.id}/eventos`);
  await memberPage.getByRole('heading', {
    name: 'Eventos',
    exact: true
  }).waitFor();
  await expect(memberPage.getByRole('link', {
    name: 'Configuración',
    exact: true
  })).toHaveCount(0);
  await expect(memberPage.getByRole('link', {
    name: 'Métodos de cobro',
    exact: true
  })).toHaveCount(0);
  await expect(memberPage.getByRole('button', {
    name: 'Crear evento +'
  })).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log('Console UI OK: Teams, configuration, switch, event context, notices, mobile and member permissions.');
} finally {
  await browser?.close();
  await vite?.close();
  await new Promise(resolve => server.close(resolve));
  await db.$disconnect();
}
