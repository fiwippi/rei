build:
	go vet && go fmt
	mkdir -p bin
	CGO_ENABLED=0 go build -o bin/rei

.PHONY: build

run-linux:
	./bin/rei

run-linux-account:
	./bin/rei -user rei -pass rei

install:
	sudo cp bin/rei /usr/local/bin

build-all:
	go mod download
	go vet && go fmt
	mkdir -p bin
	env CGO_ENABLED=0  GOOS=linux    GOARCH=amd64  go build -o bin/rei-linux64
	env CGO_ENABLED=0  GOOS=linux    GOARCH=arm    go build -o bin/rei-linux-arm
	env CGO_ENABLED=0  GOOS=linux    GOARCH=arm64  go build -o bin/rei-linux-arm64
	env CGO_ENABLED=0  GOOS=darwin   GOARCH=amd64  go build -o bin/rei-mac
	env CGO_ENABLED=0  GOOS=windows  GOARCH=amd64  go build -o bin/rei-windows.exe

tidy:
	go mod tidy

clean:
	rm -f -R bin
