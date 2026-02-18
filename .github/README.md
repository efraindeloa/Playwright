# GitHub Actions – Playwright

## Workflow `playwright.yml`

- **Cuándo se ejecuta:** todos los días a las **10:00 AM (UTC)**. También puedes lanzarlo manualmente desde la pestaña *Actions* → *Playwright Tests* → *Run workflow*.
- **Qué hace:** ejecuta los tests en **3 jobs en paralelo** por categoría (client, provider, common). Cada job instala dependencias, Chromium y corre solo los tests de su carpeta (`tests/client/`, `tests/provider/`, `tests/common/`). El tiempo total es aproximadamente el del job más lento, no la suma de todos.
- **Artefactos:** cada job sube su informe como `playwright-report-client`, `playwright-report-provider`, `playwright-report-common`. Descarga desde *Actions* → ejecución → *Artifacts*.
- **Añadir o quitar categorías:** edita la lista `category: [client, provider, common]` en el workflow. Para dividir más (ej. por spec), añade otro job o usa [sharding](https://playwright.dev/docs/test-sharding) (`--shard=1/3`, etc.).

## Variables de entorno y secrets (opcional)

Los tests usan valores por defecto definidos en `tests/config.ts`. Si quieres usar otro entorno (staging/producción) o otras credenciales en CI:

1. En el repositorio: **Settings** → **Secrets and variables** → **Actions**.
2. Crea los secrets que necesites, por ejemplo:
   - `FIESTAMAS_BASE_URL` – URL base (ej. `https://staging.fiestamas.com`).
   - `FIESTAMAS_PROVIDER_EMAIL` – email del proveedor de pruebas.
   - `FIESTAMAS_PROVIDER_PASSWORD` – contraseña del proveedor.
   - `FIESTAMAS_CLIENT_EMAIL` – email del cliente de pruebas.
   - `FIESTAMAS_CLIENT_PASSWORD` – contraseña del cliente.

3. En `.github/workflows/playwright.yml`, descomenta el bloque `env` de los secrets y añade los que uses.

Sin configurar secrets, el workflow usa los valores por defecto de `tests/config.ts`.
