build:
	CGO_ENABLED=0 go build -o bin/rei

run:
	./bin/rei

clean:
	rm -Rf bin
