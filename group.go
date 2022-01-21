package main

import "github.com/gin-gonic/gin"

type handlerFunc func(s *server) gin.HandlerFunc

type routerGroup struct {
	*gin.RouterGroup

	Server *server
}

func (rg *routerGroup) Group(relativePath string) *routerGroup {
	return &routerGroup{
		RouterGroup: rg.RouterGroup.Group(relativePath),
		Server:      rg.Server,
	}
}

func (rg *routerGroup) Use(middleware ...gin.HandlerFunc) *routerGroup {
	newRg := rg.RouterGroup.Use(middleware...).(*gin.RouterGroup)

	return &routerGroup{
		RouterGroup: newRg,
		Server:      rg.Server,
	}
}

func (rg *routerGroup) GET(relativePath string, f handlerFunc) {
	rg.RouterGroup.GET(relativePath, f(rg.Server))
}

func (rg *routerGroup) HEAD(relativePath string, f handlerFunc) {
	rg.RouterGroup.HEAD(relativePath, f(rg.Server))
}

func (rg *routerGroup) OPTIONS(relativePath string, f handlerFunc) {
	rg.RouterGroup.OPTIONS(relativePath, f(rg.Server))
}

func (rg *routerGroup) POST(relativePath string, f handlerFunc) {
	rg.RouterGroup.POST(relativePath, f(rg.Server))
}

func (rg *routerGroup) DELETE(relativePath string, f handlerFunc) {
	rg.RouterGroup.DELETE(relativePath, f(rg.Server))
}

func (rg *routerGroup) PATCH(relativePath string, f handlerFunc) {
	rg.RouterGroup.PATCH(relativePath, f(rg.Server))
}

func (rg *routerGroup) PUT(relativePath string, f handlerFunc) {
	rg.RouterGroup.PUT(relativePath, f(rg.Server))
}
