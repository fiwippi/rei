package main

import (
	"embed"
	rei "github.com/fiwippi/rei/pkg"
	"io/fs"
	"log"
)

// TODO removed unused js, e.g. pics holder
// TODO at the end, verify dockerfile works
// TODO add more sorting options e.g. by size, by modtime
// TODO ability to drag drop file one directory up?
// TODO more verbose moving dialogue, i.e. show percentage
// TODO change styling of underlining when ctrl-x cutting a path
// TODO Ctrl+D not working
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
