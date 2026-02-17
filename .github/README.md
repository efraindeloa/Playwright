# GitHub Actions – Playwright

## Workflow `playwright.yml`

- **Cuándo se ejecuta:** todos los días a las **10:00 AM (UTC)**. También puedes lanzarlo manualmente desde la pestaña *Actions* → *Playwright Tests* → *Run workflow*.
- **Qué hace:** instala dependencias, instala el navegador Chromium y ejecuta todos los tests con `--project=chromium`.
- **Artefactos:** tras cada ejecución se sube la carpeta `playwright-report/` (informe HTML y resultados). Puedes descargarla desde la pestaña *Actions* → ejecución → *Artifacts*.

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
