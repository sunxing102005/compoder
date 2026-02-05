mkdir -p release
cp -p ./package.json ./release
cp -p ./pnpm-lock.yaml ./release
# cp -f ./package-lock.yaml ./release
cp -p ./next.config.mjs ./release
cp -p ./tsconfig.json ./release
cp -p ./next-env.d.ts ./release
cp -p ./ecosystem.json ./release
cp -p ./CICD/start.sh ./release
cp -r ./lib ./release
cp -r ./data ./release
#cp -p ./server.js ./release
#cp -p ./sentry.sh ./release
cp -a ./dist/ ./release/dist/
rm -rf ./release/dist/cache
mkdir -p ./release/dist/standalone/dist
# Ensure standalone server can resolve distDir static assets
cp -a ./dist/static/ ./release/dist/standalone/dist/static/
cp -r ./public ./release
# Standalone server serves /public from its own cwd
mkdir -p ./release/dist/standalone/public
cp -a ./public/ ./release/dist/standalone/public/
# cp -rf ./server ./release
# cp -rf ./node_modules ./release
