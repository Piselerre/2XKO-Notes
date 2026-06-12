# Esta carpeta NO se sube a GitHub

Solo este archivo (`LEEME.md`) está en Git para que sepas qué es esto.  
**Todo lo demás dentro de `_NO-SUBIR/` se queda solo en tu PC.**

---

## Qué guardar aquí (tú, a mano)

### `secretos/`
Pon dentro archivos **privados**:

- `client_secret_....json` de Google (cuando retomes Drive)
- Cualquier archivo `.env` con contraseñas o claves
- Tokens o backups personales que no quieras publicar

**Nunca** los copies a otra carpeta del proyecto ni los subas a GitHub.

### `docs-privado/`
Toda la documentación **solo para ti**: cómo compilar, actualizar, anuncios, Drive, progreso del proyecto, README técnico antiguo, etc.  
**No está en GitHub.**

### `archivo-viejo/`
Copias locales de cosas antiguas (por ejemplo diseños viejos).  
La app **no** las usa; son solo referencia por si las necesitas.

---

## Qué NO está en esta carpeta pero tampoco se sube a GitHub

Git los ignora automáticamente (`.gitignore`). **No los borres** si quieres compilar la app:

| Carpeta | Para qué sirve |
|---------|----------------|
| `node_modules/` (raíz y `apps/desktop/`) | Dependencias; se crean con `pnpm install` |
| `apps/desktop/dist/` | Build temporal del navegador |
| `apps/desktop/src-tauri/target/` | Build de Rust / el `.exe` compilado |

Son pesadas y se regeneran solas. **No hace falta moverlas** a `_NO-SUBIR`.

---

## Antes de cada `git push`

En la terminal, dentro del proyecto:

```powershell
git status
```

Si ves algo de `secretos/`, `client_secret` o `.env` en la lista, **no hagas push** y avisa.

Lo normal es ver solo tus cambios de código o `docs/`.

---

## Resumen en una frase

> **GitHub = código de la app.**  
> **`_NO-SUBIR/secretos/` = tus claves.**  
> **`node_modules` y `target` = basura técnica que se regenera sola.**
