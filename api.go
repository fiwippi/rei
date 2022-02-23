package main

import (
	"archive/zip"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"

	"github.com/fiwippi/rei/internal/auth"
	"github.com/fiwippi/rei/internal/fse"
	"github.com/fiwippi/rei/internal/log"
)

func registerAPI(s *server) {
	api := s.Group("/api")

	if s.UsingAuth {
		authed := api.Group("/auth")
		authed.POST("/login", authLogin)
		authed.GET("/logout", authLogout)
	}

	fs := api.Group("/fs")
	if s.UsingAuth {
		fs.Use(auth.Auth(s.Session, auth.Abort, ""))
	}
	fs.GET("/*filepath", apiViewItem)

	if !s.ReadOnly {
		fs.POST("/*filepath", apiCreateItem)
		fs.DELETE("/*filepath", apiDeleteItem)
		fs.PATCH("/*filepath", apiMoveItem)
	}
}

func apiViewItem(s *server) gin.HandlerFunc {
	return func(c *gin.Context) {
		var err error
		var path = c.GetString("filepath")
		if s.FollowSymlinks {
			path, err = filepath.EvalSymlinks(path)
			if err != nil {
				c.AbortWithError(500, err)
				return
			}
		}

		// Check the type of content we are serving
		fi, err := os.Stat(path)
		if err != nil {
			if os.IsNotExist(err) {
				c.AbortWithError(404, err)
			} else {
				c.AbortWithError(500, err)
			}
			return
		}

		if !fi.IsDir() {
			// If we are serving a file
			c.FileAttachment(path, fi.Name())
		} else if c.Query("zip") == "true" {
			// If we are serving a folder as a zip
			c.Stream(func(w io.Writer) bool {
				zipW := zip.NewWriter(w)
				defer zipW.Close()

				c.Writer.Header().Add("Content-Disposition", "attachment; filename=\""+fi.Name()+".zip\"")
				err := fse.WriteZip(zipW, path)
				if err != nil {
					c.AbortWithError(500, err)
				}

				return false
			})
		} else {
			// If we are serving a directory
			files, err := fse.ReadDir(path, s.SkipHidden)
			if err != nil {
				c.AbortWithError(500, err)
				return
			}
			c.JSON(200, files)
		}
	}
}

func apiCreateItem(_ *server) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.GetString("filepath")
		log.Debug().Str("path", path).Msg("creating item")

		item := struct {
			Type  string                  `form:"type" binding:"required,eq=file|eq=folder"`
			Name  string                  `form:"name"`
			Files []*multipart.FileHeader `form:"files"`
		}{}
		if err := c.ShouldBindWith(&item, binding.FormMultipart); err != nil {
			c.AbortWithError(400, err)
			return
		}
		log.Debug().Interface("item", item).Msg("binded item")

		// Check the parent exists
		fi, err := os.Stat(path)
		if err != nil || !fi.IsDir() {
			if err == nil {
				err = fmt.Errorf("parent does not exist: %s", path)
			}
			c.AbortWithError(500, err)
			return
		}

		if item.Type == "folder" {
			if item.Name == "" {
				c.AbortWithError(500, fmt.Errorf("no name for folder specified"))
				return
			}

			// Check if the folder already exists
			folderPath := path + "/" + fse.SanitiseFilepath(item.Name)
			if fse.Exists(folderPath) {
				c.Status(200)
				return
			}

			// Create the folder
			err = os.Mkdir(folderPath, os.ModePerm)
			if err != nil {
				c.AbortWithError(500, err)
				return
			}
		} else {
			if item.Files == nil {
				c.AbortWithError(500, fmt.Errorf("no file(s) specified"))
				return
			}

			// We save the file
			for _, f := range item.Files {
				log.Debug().Str("path", path+"/"+fse.SanitiseFilepath(f.Filename)).Msg("saving file")
				err = c.SaveUploadedFile(f, path+"/"+fse.SanitiseFilepath(f.Filename))
				if err != nil {
					c.AbortWithError(500, err)
					return
				}
				log.Debug().Str("path", path+"/"+fse.SanitiseFilepath(f.Filename)).Msg("file saved")
			}
		}

		c.Status(200)
	}
}

func apiDeleteItem(_ *server) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.GetString("filepath")
		_, err := os.Stat(path)
		if err != nil {
			c.AbortWithError(500, err)
			return
		}

		err = os.RemoveAll(path)
		if err != nil {
			c.AbortWithError(500, err)
			return
		}

		c.Status(200)
	}
}

func apiMoveItem(s *server) gin.HandlerFunc {
	return func(c *gin.Context) {
		item := struct {
			Mode string `json:"mode" binding:"required,eq=cut|eq=copy"`
			Path string `json:"path"`
		}{}
		if err := c.ShouldBind(&item); err != nil {
			c.AbortWithError(400, err)
			return
		}

		// The original file has to exist
		oldPath := c.GetString("filepath")
		fi, err := os.Stat(oldPath)
		if err != nil {
			c.AbortWithError(500, err)
			return
		}
		// The new path's parent has to exist
		// and need to ensure item.Path starts
		// with a "/"
		if !strings.HasPrefix(item.Path, "/") {
			item.Path = "/" + item.Path
		}
		newPath := s.Root + item.Path
		_, err = os.Stat(filepath.Dir(newPath))
		if err != nil {
			c.AbortWithError(500, err)
			return
		}

		// Ensure the new name is sanitised
		if !fse.IsSanitised(filepath.Base(newPath)) {
			c.AbortWithError(500, fmt.Errorf("filename is unsanitised: %s", filepath.Base(newPath)))
			return
		}

		if item.Mode == "cut" {
			err = os.Rename(oldPath, newPath)
			if err != nil {
				c.AbortWithError(500, err)
				return
			}
		} else {
			if fi.IsDir() {
				err = fse.CopyDirectory(oldPath, newPath)
			} else {
				err = fse.CopyFile(oldPath, newPath)
			}
			if err != nil {
				c.AbortWithError(500, err)
				return
			}
		}

		c.Status(200)
	}
}
