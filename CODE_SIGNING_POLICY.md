# Code Signing Policy

**2XKO Notes** — Windows releases

Free code signing provided by [SignPath.io](https://about.signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

---

## English

### Publisher

Windows binaries are signed with a certificate issued to **SignPath Foundation**. The verified publisher shown in Windows may therefore read **SignPath Foundation** (not the individual maintainer).

### What is signed

- `2XKO Notes.exe` — Windows x64 portable application
- Built from source in the public repository: https://github.com/Piselerre/2XKO-Notes

### Build integrity

- Release builds are produced by **GitHub Actions** from tagged releases (`v*`).
- Only artifacts from the verified CI pipeline are submitted to SignPath for signing.
- Each signing request is approved by a project maintainer before release.

### Team roles

| Role | Responsibility | Members |
| ---- | -------------- | ------- |
| **Committers / Authors** | Push approved changes to `main` | [Piselerre](https://github.com/Piselerre) (repository owner) |
| **Reviewers** | Review pull requests before merge | [Piselerre](https://github.com/Piselerre) |
| **Approvers** | Approve SignPath signing requests for releases | [Piselerre](https://github.com/Piselerre) (repository owner) |

### Privacy

See [PRIVACY.md](PRIVACY.md). This program does not transfer personal information to networked systems unless the user explicitly enables Google Drive sync or requests an update check.

### License

Source code is licensed under the [MIT License](LICENSE).

### Disclaimer

2XKO Notes is a fan-made tool. The author is not affiliated with Riot Games or the 2XKO game.

---

## Español

### Publicador

Los binarios de Windows se firman con un certificado emitido a **SignPath Foundation**. El publicador verificado en Windows puede mostrar **SignPath Foundation** (no el mantenedor individual).

### Qué se firma

- `2XKO Notes.exe` — aplicación portable para Windows x64
- Compilada desde el repositorio público: https://github.com/Piselerre/2XKO-Notes

### Integridad del build

- Las releases se generan con **GitHub Actions** desde tags (`v*`).
- Solo los artefactos del pipeline verificado se envían a SignPath para firmar.
- Cada solicitud de firma la aprueba un mantenedor antes de publicar.

### Roles del equipo

| Rol | Responsabilidad | Miembros |
| --- | --------------- | -------- |
| **Committers / Authors** | Subir cambios aprobados a `main` | [Piselerre](https://github.com/Piselerre) (propietario del repo) |
| **Reviewers** | Revisar pull requests antes del merge | [Piselerre](https://github.com/Piselerre) |
| **Approvers** | Aprobar firmas de release en SignPath | [Piselerre](https://github.com/Piselerre) (propietario del repo) |

### Privacidad

Ver [PRIVACY.md](PRIVACY.md). El programa no transfiere información personal a sistemas en red salvo que el usuario active Google Drive o solicite comprobar actualizaciones.

### Licencia

El código fuente usa [licencia MIT](LICENSE).

### Aviso legal

2XKO Notes es una herramienta hecha por fans. El autor no está afiliado a Riot Games ni al juego 2XKO.
