package main

import (
	"embed"
	rei "github.com/fiwippi/rei/pkg"
	"io/fs"
	"log"
)

//go:embed static/*
var f embed.FS

func main() {
	f, err := fs.Sub(f, "static")
	if err != nil {
		log.Fatal(err)
	}

	server, err := rei.Server(f)
	if err != nil {
		log.Fatal(err)
	}

	log.Println("Starting Rei...")
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
