package main

import (
	"embed"
	rei "github.com/fiwippi/rei/pkg"
	"log"
)

// TODO server not showing disconnect when uploading
// TODO When drag drop upload change the styling
// TODO change all icons
// TODO embed the font awesome filesheet
// TODO ability to specify the static filepaths

//go:embed static/*
var f embed.FS

func main() {
	server, err := rei.Server(f)
	if err != nil {
		log.Fatal(err)
	}

	log.Println("Starting Rei...")
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
