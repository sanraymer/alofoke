docker build -t alofoke-app .

docker run -d --name alofoke-1 \
  -e VIDEO_ID="fIUr0bJbaAg" \
  -e VIEWS=50 \
  alofoke-app


docker ps
docker image
docker system prune -a
docker logs -f alofoke-1
docker stop alofoke-1
docker start alofoke-1
docker restart alofoke-1
