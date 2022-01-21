package main

import (
	"io/ioutil"

	"github.com/gin-gonic/gin"
)

func registerFavicon(s *server, path string) {
	// Load the favicon data
	f, err := s.FS.Open(path)
	if err != nil {
		panic(err)
	}
	defer f.Close()

	data, err := ioutil.ReadAll(f)
	if err != nil {
		panic(err)
	}

	// Create the function
	getFavicon := func(_ *server) gin.HandlerFunc {
		return func(c *gin.Context) {
			if c.Request.RequestURI != "/favicon.ico" {
				c.Next()
				return
			}

			if c.Request.Method != "GET" && c.Request.Method != "HEAD" {
				status := 200
				if c.Request.Method != "OPTIONS" {
					status = 405
				}
				c.Header("Allow", "GET,HEAD,OPTIONS")
				c.AbortWithStatus(status)
				return
			}

			c.Data(200, "image/x-icon", data)
		}
	}

	g := s.Group("/")
	g.GET("/favicon.ico", getFavicon)
	g.HEAD("/favicon.ico", getFavicon)
	g.OPTIONS("/favicon.ico", getFavicon)
}
