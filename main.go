package main

import (
	"embed"
	rei "github.com/fiwippi/rei/pkg"
	"io/fs"
	"log"
)

// TODO styling hovering over files/folders
// TODO ability to drag drop file one directory up?
// TODO more verbose moving dialogue
// TODO change styling of cut path
// TODO Ctrl+D not working
// TODO server not showing disconnect when uploading
// TODO When drag drop upload change the styling

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
