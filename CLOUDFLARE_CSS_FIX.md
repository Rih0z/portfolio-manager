# CSS Not Loading in Production - Fix Guide

## Problem
The CSS is not loading in production at https://3ccbc38f.portfolio-manager-7bx.pages.dev because Tailwind CSS directives are not being processed during the build.

## Root Cause
- The project uses react-scripts v3.0.1 which doesn't support PostCSS 8
- Tailwind CSS requires PostCSS 8 to process @tailwind directives
- The build output contains unprocessed Tailwind directives instead of compiled CSS

## Solution Options

### Option 1: Use CRACO (Recommended)
1. Install CRACO to override CRA configuration:
```bash
cd frontend/webapp
npm install @craco/craco@6.4.5 --save-dev
```

2. Update package.json scripts:
```json
{
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test"
  }
}
```

3. Move craco.config.js to the root of frontend/webapp:
```bash
mv src/craco.config.js ./craco.config.js
```

4. Update craco.config.js:
```javascript
module.exports = {
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
}
```

### Option 2: Upgrade react-scripts
1. Upgrade to react-scripts v5 which supports PostCSS 8:
```bash
cd frontend/webapp
npm install react-scripts@5.0.1 --save
```

2. Fix any breaking changes that may occur

### Option 3: Pre-compile CSS (Quick Fix)
1. Install Tailwind CLI:
```bash
cd frontend/webapp
npm install -D tailwindcss
```

2. Add a pre-build script:
```json
{
  "scripts": {
    "build:css": "tailwindcss -i ./src/index.css -o ./src/compiled.css",
    "prebuild": "npm run build:css",
    "build": "react-scripts build"
  }
}
```

3. Update src/index.js to import compiled.css instead of index.css

## Cloudflare Deployment Update
After fixing, update the build command in Cloudflare Pages:
```
cd frontend/webapp && npm install && NODE_OPTIONS="--openssl-legacy-provider" CI= npm run build
```

## Verification
After deployment, check:
1. View page source and verify CSS link is loading
2. Check Network tab for CSS file (should return 200)
3. Inspect the CSS file content (should contain compiled Tailwind classes, not directives)