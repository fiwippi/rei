build:
	go mod download
	go get github.com/markbates/pkger/cmd/pkger
	go generate
	go vet && go fmt
	mkdir -p bin
	CGO_ENABLED=0 go build -o bin/rei
	rm -f pkged.go

.PHONY: build

install:
	sudo cp bin/rei /usr/local/bin

build-all:
	go mod download
	go get github.com/markbates/pkger/cmd/pkger
	go generate
	go vet && go fmt
	mkdir -p bin
	env CGO_ENABLED=0  GOOS=linux    GOARCH=amd64  go build -o bin/rei-linux64
	env CGO_ENABLED=0  GOOS=linux    GOARCH=arm    go build -o bin/rei-linux-arm
	env CGO_ENABLED=0  GOOS=linux    GOARCH=arm64  go build -o bin/rei-linux-arm64
	env CGO_ENABLED=0  GOOS=darwin   GOARCH=amd64  go build -o bin/rei-mac
	env CGO_ENABLED=0  GOOS=windows  GOARCH=amd64  go build -o bin/rei-windows.exe
	rm -f pkged.go

clean:
	rm -f -R bin
	rm -f pkged.go