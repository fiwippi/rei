package log

import (
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Before Request
		t := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// After request
		latency := time.Since(t).String()
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()
		if raw != "" {
			path = path + "?" + raw
		}
		errorMsg := strings.Join(strings.Split(c.Errors.ByType(gin.ErrorTypePrivate).String(), "\n"), ",")

		// Log the data after parsing it
		switch {
		case statusCode >= 400 && statusCode < 500:
			Warn().Str("method", method).Str("path", path).Str("resp_time", latency).
				Int("status", statusCode).Str("client_ip", clientIP).Msg(errorMsg)
		case statusCode >= 500:
			Error().Str("method", method).Str("path", path).Str("resp_time", latency).
				Int("status", statusCode).Str("client_ip", clientIP).Msg(errorMsg)
		default:
			if strings.HasPrefix(path, "/static") {
				Trace().Str("method", method).Str("path", path).Str("resp_time", latency).
					Int("status", statusCode).Str("client_ip", clientIP).Msg(errorMsg)
			} else {
				Info().Str("method", method).Str("path", path).Str("resp_time", latency).
					Int("status", statusCode).Str("client_ip", clientIP).Msg(errorMsg)
			}
		}
	}
}
