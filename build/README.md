## Docker
Build using:
```sh
# build rei within a build container, needs to be ran within the sources, ../ from here, and run
% mkdir ~/LocalDirToShare
% docker build -t rei -f build/Dockerfile .
% sudo docker run -v ~/LocalDirToShare:/shared -p 8001:8001 rei
```

With docker-compose:
```sh
cp build/docker-compose.yml.sample build/docker-compose.yml
docker-compose -f build/docker-compose.yml up -d
```