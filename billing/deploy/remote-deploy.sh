# Run on the server by the deploy job (.github/workflows/billing.yml), over ssh, with IMAGE, GHCR_USER and GHCR_TOKEN
# set in front of it.
set -e
# Everything that could read stdin gets </dev/null: the script itself arrives on stdin, and docker would swallow it.
cd ~/billing
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
# pin the exact image this run built, so a restart never picks up something else
sed -i "s|^API_IMAGE=.*|API_IMAGE=$IMAGE|" .env
docker compose pull api </dev/null
docker compose up -d --remove-orphans </dev/null
docker logout ghcr.io </dev/null
# wait for the API to answer (migrations run on start)
for i in $(seq 1 30); do
  if docker compose exec -T api python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)" </dev/null; then
    echo "API is up"; docker image prune -f </dev/null; exit 0
  fi
  sleep 4
done
docker compose logs --tail 80 api </dev/null
exit 1
