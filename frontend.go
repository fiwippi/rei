package main

import (
	"github.com/gin-gonic/gin"

	"github.com/fiwippi/rei/internal/auth"
)

func registerFrontend(s *server) {
	front := s.Group("/")
	if s.UsingAuth {
		front.Use(auth.Auth(s.Session, auth.Redirect, "/login"))
	}
	front.GET("/", directoryPage)
	front.GET("/fs/*filepath", directoryPage)

	skipAuthed := s.Group("/")
	if s.UsingAuth {
		skipAuthed.Use(auth.SkipIfAuthed(s.Session, "/fs/"))
	}
	skipAuthed.GET("/login", loginPage)
}

func loginPage(s *server) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !s.UsingAuth {
			c.Redirect(302, "/fs/")
		} else {
			c.HTML(200, "login", nil)
		}
	}
}

func directoryPage(s *server) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.FullPath() == "/" {
			c.Redirect(302, "/fs/")
			return
		}

		c.HTML(200, "directory", struct {
			Ro, Auth bool
		}{s.ReadOnly, s.UsingAuth})
	}
}
