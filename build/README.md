## Docker
Build using:
```sh
# build gossa within a build container, needs to be ran within the sources, ../ from here, and run
% mkdir ~/LocalDirToShare
% docker build -t gossa -f build/Dockerfile .
% sudo docker run -v ~/LocalDirToShare:/shared -p 8001:8001 gossa
```

With docker-compose:
```sh
cp build/docker-compose.yml.sample build/docker-compose.yml
docker-compose -f build/docker-compose.yml up -d
```