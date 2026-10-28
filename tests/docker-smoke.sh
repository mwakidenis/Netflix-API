#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
image="netflix-clone-smoke-$$"
container_id=""
work_dir=$(mktemp -d)

cleanup() {
  if [ -n "$container_id" ]; then
    docker rm -f "$container_id" >/dev/null 2>&1 || true
  fi
  docker image rm "$image" >/dev/null 2>&1 || true
  rm -rf "$work_dir"
}
trap cleanup EXIT
trap 'exit 1' INT TERM

docker build --build-arg TMDB_V3_API_KEY=docker-smoke-test -t "$image" .
container_id=$(docker run --rm -d -p 127.0.0.1::80 "$image")
port=$(docker inspect --format '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' "$container_id")
base_url="http://127.0.0.1:$port"

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "$base_url/" -o "$work_dir/index.html"; then
    break
  fi
  sleep 1
done
test -s "$work_dir/index.html"

for route in browse genre/28 watch; do
  curl -fsS "$base_url/$route" -o "$work_dir/route.html"
  cmp "$work_dir/index.html" "$work_dir/route.html"
done

asset=$(sed -n 's/.*src="\([^"]*\/assets\/[^"]*\.js\)".*/\1/p' "$work_dir/index.html")
test -n "$asset"
curl -fsS "$base_url$asset" -o "$work_dir/asset.js"
test -s "$work_dir/asset.js"
if cmp -s "$work_dir/index.html" "$work_dir/asset.js"; then
  echo "The JavaScript asset was rewritten to index.html" >&2
  exit 1
fi
echo "Docker smoke test passed: /, /browse, /genre/28, /watch, and the JavaScript asset"
