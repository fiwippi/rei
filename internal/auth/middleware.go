package auth

import (
	"time"

	"github.com/gin-gonic/gin"
)

type Action int

const (
	Redirect Action = iota
	Abort

	redirectCookie = "rei-redirect"
)

// Auth middleware which ensures the user is authorised
func Auth(s *Session, action Action, redirect string) gin.HandlerFunc {
	return func(c *gin.Context) {
		err := s.ValidContext(c)
		if err != nil {
			// Invalid cookie
			switch action {
			case Redirect:
				createRedirectCookie(c)
				c.Redirect(302, redirect)
			case Abort:
				c.AbortWithError(401, err)
			}
			return
		}

		// Refresh cookie for the user, only refresh if the cookie is bout to expire
		timeLeft, err := s.TimeLeft(c)
		if err != nil {
			c.Error(err)
		}
		if err == nil && timeLeft < (30*time.Minute) {
			err = s.Refresh(c)
			if err != nil {
				c.Error(err)
			}
		}

		// Cookie valid
		url, err := c.Cookie(redirectCookie)
		if err != nil || url == "" {
			c.Next()
		} else {
			deleteRedirectCookie(c)
			c.Redirect(302, url)
		}
	}
}

// SkipIfAuthed Middleware which skips these routes if the user is
// already authorised and redirect to the home page instead
func SkipIfAuthed(s *Session, home string) gin.HandlerFunc {
	return func(c *gin.Context) {
		err := s.ValidContext(c)
		if err == nil {
			createRedirectCookie(c)
			c.Redirect(302, home)
			return
		}

		c.Next()
	}
}

func createRedirectCookie(c *gin.Context) {
	c.SetCookie(redirectCookie, c.Request.URL.String(), 5*60*60, "/", "", false, true)
}

func deleteRedirectCookie(c *gin.Context) {
	c.SetCookie(redirectCookie, "", 0, "/", "", false, true)
}
