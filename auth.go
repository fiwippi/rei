package main

import (
	"fmt"

	"github.com/gin-gonic/gin"
)

func authLogin(s *server) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Retrieve the request
		data := struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}{}
		if err := c.ShouldBindJSON(&data); err != nil {
			c.AbortWithError(400, err)
			return
		}

		// Validate login details
		valid := s.AuthUser(data.Username, data.Password)
		if !valid {
			c.AbortWithError(401, fmt.Errorf("invalid user"))
			return
		}

		// If valid then give user token they can identify themselves with
		s.Session.Store(c)
		c.Status(200)
	}
}

func authLogout(s *server) gin.HandlerFunc {
	return func(c *gin.Context) {
		fmt.Println("HUH")
		s.Session.Delete(c)
		c.Status(200)
	}
}
