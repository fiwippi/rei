package main

import (
	"embed"
	"fmt"
	"html/template"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/fiwippi/rei/internal/auth"
	"github.com/fiwippi/rei/internal/log"
	"github.com/fiwippi/rei/internal/multitemplate"
)

//go:embed files/*
var efs embed.FS

type server struct {
	// server data
	FS        fs.FS         // The embedded file system
	Router    *gin.Engine   // The Gin routing engine
	Session   *auth.Session // Session to authenticate the user
	UsingAuth bool          // Whether the server is using authentication

	// server config
	host, port     string
	user, pass     string
	Root           string // Root folder shouldn't end with a slash
	SkipHidden     bool
	ReadOnly       bool
	FollowSymlinks bool
}

func NewServer(host, port, user, pass, root string, skip, ro, sym, disableAuth bool) (*http.Server, error) {
	// Clean up some arguments
	if len(root) > 1 && strings.HasSuffix(root, "/") {
		root = strings.TrimSuffix(root, "/")
	}
	if !filepath.IsAbs(root) {
		wd, err := os.Getwd()
		if err != nil {
			return nil, err
		}
		root = strings.TrimLeft(root, ".")
		root = strings.TrimLeft(root, "/")
		root = wd + "/" + root
		root = strings.TrimRight(root, "/")
	}

	if user == "" && pass == "" {
		disableAuth = true
	}

	// Setup the server with the router
	r := gin.New()
	r.Use(log.Middleware())
	r.Use(gin.Recovery())
	r.Use(func(c *gin.Context) {
		// Ensure an absolute filepath
		fp := root + c.Param("filepath")
		if !filepath.IsAbs(fp) {
			c.AbortWithError(400, fmt.Errorf("filepath isn't absolute: %s", fp))
			return
		}
		c.Set("filepath", fp)
	})

	s := &server{
		Router:         r,
		FS:             efs,
		Session:        auth.NewSession(30*time.Minute, "rei"),
		UsingAuth:      !disableAuth,
		host:           host,
		port:           port,
		user:           user,
		pass:           pass,
		Root:           root,
		SkipHidden:     skip,
		ReadOnly:       ro,
		FollowSymlinks: sym,
	}

	// Serve static files
	staticFS, err := fs.Sub(s.FS, "files/static")
	if err != nil {
		return nil, err
	}
	s.Router.StaticFS("/static", http.FS(staticFS))

	// Parse the templates
	funcs := template.FuncMap{
		"versioning": func(filePath string) string {
			if os.Getenv("GIN_MODE") == "release" {
				return filePath
			}
			return fmt.Sprintf("%s?q=%s", filePath, strconv.Itoa(int(time.Now().Unix())))
		},
	}
	prefix := "files/templates/"
	ren := multitemplate.NewRenderer()
	ren.AddFromFilesFuncsFS("directory", funcs, s.FS, prefix+"directory.tmpl")
	ren.AddFromFilesFuncsFS("login", funcs, s.FS, prefix+"login.tmpl")
	s.Router.HTMLRender = ren

	// Register routes
	registerFrontend(s)
	registerAPI(s)
	registerFavicon(s, "files/static/icon/favicon.ico")

	log.Info().Str("host", host).Str("port", port).Str("root", root).
		Bool("skip_hidden", skip).Bool("read_only", ro).Bool("follow_symlinks", sym).
		Bool("disable_auth", disableAuth).Msg("server config")

	return &http.Server{
		Addr:    s.host + ":" + s.port,
		Handler: s.Router,
	}, nil
}

func (s *server) Group(relativePath string) *routerGroup {
	return &routerGroup{
		RouterGroup: s.Router.Group(relativePath),
		Server:      s,
	}
}

func (s *server) AuthUser(user, pass string) bool {
	return s.user == user && s.pass == pass
}
