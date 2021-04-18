package main

import (
	rei "github.com/fiwippi/rei/pkg"
	"log"
)

func main() {
	server, err := rei.Server()
	if err != nil {
		log.Fatal(err)
	}

	log.Println("Starting Rei...")
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
