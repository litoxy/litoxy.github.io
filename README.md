# Formline

Client-side running posture analysis with TensorFlow.js MoveNet.

- Camera / video file → MoveNet → skeleton features → Golden Runner similarity
- History stores **skeleton frames only** (no video) in IndexedDB
- Stick-figure replay on Canvas

## Local

```bash
npm install
npm run dev
```

Dev URL uses Vite `base` (default `/pv-system/portal/`):

`http://localhost:5173/pv-system/portal/`

Or override:

```bash
# PowerShell
$env:VITE_BASE="/"; npm run dev
```

## GitLab

Remote: https://gitsnps.internal.synopsys.com/pv-system/portal

Push to `main` / default branch → `.gitlab-ci.yml` builds and deploys **GitLab Pages**.

Pages URL (typical):

`https://pv-system.gitsnps.internal.synopsys.com/portal/`

(Exact host depends on your GitLab Pages settings; CI uses `CI_PAGES_URL` for `base` when available.)

### Credential helper tip (Windows GCM)

If Git Credential Manager warns about GitLab provider:

```bash
git config --global credential.https://gitsnps.internal.synopsys.com.provider gitlab
```